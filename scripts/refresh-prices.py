"""Refresh exact retailer SKUs from their public category listings; never invent a price."""
import datetime, json, pathlib, re, time, unicodedata, urllib.request, urllib.parse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

HOSTS = {'Real Canadian Superstore': 'www.realcanadiansuperstore.ca', 'No Frills': 'www.nofrills.ca', 'Loblaws': 'www.loblaws.ca'}
ROOT = pathlib.Path(__file__).resolve().parents[1]

def norm(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(value)).strip()).casefold()

def tiles(value):
    if isinstance(value, dict):
        if value.get('productId') and value.get('pricing') and value.get('title') and value.get('link'):
            yield value
        for child in value.values():
            yield from tiles(child)
    elif isinstance(value, list):
        for child in value:
            yield from tiles(child)

def amount(value):
    if value is None or value == '':
        return None
    number = float(str(value).replace('$', '').replace(',', ''))
    if not 0 <= number <= 100000:
        raise ValueError('Invalid price')
    return number

def update_row(row, product, checked_at):
    size = str(product.get('packageSizing', '')).split(',')[0].strip()
    if (str(product.get('productId')), norm(product.get('brand', '')), norm(product.get('title', '')), norm(size)) != (row['retailer_sku'], norm(row['brand']), norm(row['name']), norm(row['package_size'])):
        raise ValueError('Exact SKU, brand, name or package mismatch')
    link = urllib.parse.urljoin('https://' + HOSTS[row['retailer']], product['link'])
    parsed = urllib.parse.urlparse(link)
    if parsed.scheme != 'https' or parsed.hostname != HOSTS[row['retailer']] or not parsed.path.endswith('/p/' + row['retailer_sku']):
        raise ValueError('Retailer link mismatch')
    if product.get('pricingUnits', {}).get('weighted'):
        raise ValueError('Weighted pricing requires review')
    price = amount(product['pricing'].get('price'))
    if price is None:
        raise ValueError('No public price')
    return {**row, 'price_cad': price, 'member_price_cad': amount(product['pricing'].get('memberOnlyPrice')), 'promotion_text': (product.get('deal') or {}).get('text', ''), 'member_promotion_text': (product.get('mopDeal') or {}).get('text', ''), 'product_url': link, 'observed_at': checked_at, 'last_attempt_at': checked_at, 'check_status': 'verified', 'availability': 'Not verified', 'currency': 'CAD'}

def fetch_group(entry):
    url, rows = entry
    checked_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    parsed = urllib.parse.urlparse(url)
    try:
        if parsed.scheme != 'https' or parsed.hostname not in HOSTS.values() or not re.fullmatch(r'/en/[a-z0-9/-]+/c/\d+', parsed.path) or parsed.username or any(k not in {'page','navid'} for k in urllib.parse.parse_qs(parsed.query)):
            raise ValueError('Unsupported source URL')
        def load_page(source_url):
            req = urllib.request.Request(source_url, headers={'User-Agent': 'PricePine-PriceCheck/1.0', 'Accept': 'text/html'})
            with urllib.request.urlopen(req, timeout=40) as response:
                if urllib.parse.urlparse(response.url).hostname != parsed.hostname:
                    raise ValueError('Unexpected redirect')
                body = response.read(12_000_001)
                if len(body) > 12_000_000:
                    raise ValueError('Source response too large')
            match = re.search(r'<script\b[^>]*\bid=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>', body.decode('utf-8'), re.S)
            if not match:
                raise ValueError('Structured retailer data unavailable')
            return json.loads(match.group(1))
        document = load_page(url)
        candidates = defaultdict(list)
        for p in tiles(document):
            candidates[str(p['productId'])].append(p)
        wanted = {r['retailer_sku'] for r in rows}
        # Follow the source's pagination only when a tracked SKU is absent. Bound the run.
        for _ in range(3):
            if wanted.issubset(candidates):
                break
            components = document.get('props', {}).get('pageProps', {}).get('initialData', {}).get('layout', {}).get('sections', {}).get('productListingSection', {}).get('components', [])
            paging = next((c.get('data', {}).get('productGrid', {}).get('pagination') for c in components if c.get('data', {}).get('productGrid', {}).get('pagination')), {})
            if not paging.get('hasMore') or not isinstance(paging.get('pageNumber'), int):
                break
            query = urllib.parse.parse_qs(parsed.query)
            query['page'] = [str(paging['pageNumber'] + 1)]
            next_url = urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(query, doseq=True)))
            time.sleep(1)
            try:
                document = load_page(next_url)
            except Exception:
                break
            for p in tiles(document):
                candidates[str(p['productId'])].append(p)
        out = []
        for row in rows:
            try:
                choices = []
                for candidate in candidates[row['retailer_sku']]:
                    try:
                        choices.append(update_row(row, candidate, checked_at))
                    except (ValueError, TypeError, KeyError):
                        pass
                if not choices:
                    raise ValueError('Product absent from source listing')
                if len({(x['price_cad'], x['member_price_cad'], x['promotion_text'], x['member_promotion_text']) for x in choices}) != 1:
                    raise ValueError('Conflicting retailer prices')
                out.append(choices[0])
            except (ValueError, TypeError, KeyError):
                out.append({**row, 'last_attempt_at': checked_at, 'check_status': 'needs_review'})
        print(parsed.hostname, parsed.path, sum(r['check_status'] == 'verified' for r in out), '/', len(rows), flush=True)
        return out
    except Exception as error:
        print(parsed.hostname, parsed.path, type(error).__name__, str(error)[:180], flush=True)
        return [{**row, 'last_attempt_at': checked_at, 'check_status': 'source_unavailable'} for row in rows]
    finally:
        time.sleep(1)

def main():
    path = ROOT / 'public/retailer-prices.json'
    feed = json.loads(path.read_text())
    groups = defaultdict(list)
    for row in feed['rows']:
        groups[row['listing_source_url']].append(row)
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    with ThreadPoolExecutor(max_workers=3) as pool:
        result = [row for group in pool.map(fetch_group, groups.items()) for row in group]
    assert len(result) == len(feed['rows'])
    verified = sum(r['check_status'] == 'verified' for r in result)
    previous = {(r['retailer'], r['retailer_sku']): r for r in feed['rows']}
    changed = sum(r['check_status'] == 'verified' and any(r.get(k) != previous[r['retailer'], r['retailer_sku']].get(k) for k in ['price_cad', 'member_price_cad', 'promotion_text', 'member_promotion_text']) for r in result)
    feed.update(rows=result, last_run={'started_at': started, 'completed_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'total': len(result), 'verified': verified, 'changed': changed, 'unverified': len(result)-verified})
    path.write_text(json.dumps(feed, ensure_ascii=False, separators=(',', ':')))
    print(json.dumps(feed['last_run']))
    # The workflow saves failure status before surfacing a failed check.
    return 0 if verified == len(result) else 1

if __name__ == '__main__':
    raise SystemExit(main())
