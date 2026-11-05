"""Daily public catalog discovery. Stable retailer IDs; conservative exact-size deduplication.
No database credentials. Invalid observations never replace the last verified price.
"""
import concurrent.futures, datetime, hashlib, html, importlib.util, json, math, pathlib, re, time, unicodedata, urllib.parse, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('price_refresh', ROOT/'scripts/refresh-prices.py')
refresh = importlib.util.module_from_spec(spec); spec.loader.exec_module(refresh)
HOSTS = {**refresh.HOSTS, 'Giant Tiger':'www.gianttiger.com'}
MAX_NEW = 250
MAX_TOTAL = 20000

def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def norm(v): return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', str(v or '')).strip()).casefold()
def digest(v): return hashlib.sha256(v.encode()).hexdigest()[:24]
def barcode(v):
    s=str(v or '')
    if not re.fullmatch(r'\d{8}|\d{12,14}',s) or len(set(s))==1:return ''
    return s.zfill(14) if (sum(int(n)*(3 if i%2==0 else 1) for i,n in enumerate(s[-2::-1]))+int(s[-1]))%10==0 else ''
def size(v):
    # Exact package expression, preserving multipacks. Do not collapse 2 x 500 g to 1 kg.
    s=norm(v).replace('×','x');s=re.sub(r'(\d)\s*-?\s*(kg|g|ml|l|lb|oz|pk|pack|count|ct)\b',r'\1 \2',s)
    return s

def identity(r):
    if barcode(r.get('barcode')):return 'gtin:'+barcode(r['barcode'])
    # Shared PC retailer IDs are authoritative within this retailer group only.
    if r['retailer'] in refresh.HOSTS:return 'pc:'+r['retailer_sku']
    return r['retailer']+':'+r['retailer_sku']

def fingerprint(r):
    brand=norm(r.get('brand'));name=norm(r.get('name'));package=size(r.get('package_size'))
    if not brand or brand in ['unknown','giant tiger'] or not package:return None
    if name.startswith(brand+' '):name=name[len(brand):].strip()
    # Remove only an exact trailing size supplied by this same source.
    if size(name).endswith(package):name=size(name)[:-len(package)].strip(' ,-')
    return (brand,re.sub(r'[^\w]+',' ',name).strip(),package)

def fetch(url):
    p=urllib.parse.urlsplit(url)
    if p.scheme!='https' or p.hostname not in HOSTS.values() or p.username or p.password:raise ValueError('Unsupported source URL')
    req=urllib.request.Request(url,headers={'User-Agent':'PricePine-CatalogCheck/1.0','Accept':'application/json,text/html'})
    with urllib.request.urlopen(req,timeout=35) as res:
        if urllib.parse.urlsplit(res.url).hostname!=p.hostname:raise ValueError('Unexpected redirect')
        raw=res.read(18_000_001)
        if len(raw)>18_000_000:raise ValueError('Response too large')
    return raw.decode('utf-8')

def valid_row(r):
    try:
        u=urllib.parse.urlsplit(r['product_url'])
        return (r['retailer'] in HOSTS and u.scheme=='https' and u.hostname==HOSTS[r['retailer']] and not u.username and not u.password
          and all(isinstance(r.get(k),str) and 0<len(r[k])<=500 for k in ['name','retailer_sku','package_size'])
          and r['currency']=='CAD' and isinstance(r['price_cad'],(float,int)) and math.isfinite(r['price_cad']) and 0<r['price_cad']<=100000
          and (u.path.endswith('/p/'+r['retailer_sku']) if r['retailer'] in refresh.HOSTS else u.path.startswith('/products/')))
    except (ValueError,KeyError,TypeError):return False

def giant_rows(document, url, checked):
    for p in document.get('products',[]):
        title=html.unescape(p.get('title','')).strip()
        # Limit initial automation to groceries and household consumables, not clothing variants.
        tags=p.get('tags',[])
        if not any(t in tags for t in ['L1_category_en:Grocery','L1_category_en:Household']):continue
        matches=list(re.finditer(r'(?i)(?:\d+\s*[x×]\s*)?\d+(?:\.\d+)?\s*-?\s*(?:kg|g|ml|l|lb|oz|pk|pack|count|ct)\b',title))
        package=', '.join(m.group(0) for m in matches)
        if not package:continue
        brand_tags=[t[len('brand_'):].replace('_',' ').strip() for t in tags if t.startswith('brand_')]
        brand=brand_tags[0].title() if len(brand_tags)==1 else ''
        images=p.get('images',[]);image=images[0].get('src','') if images else ''
        for v in p.get('variants',[]):
            sku=str(v.get('sku',''))
            if not sku or v.get('title') not in [None,'Default Title']:continue
            try:price=float(v['price'])
            except (ValueError,TypeError,KeyError):continue
            yield dict(name=title,brand=brand,package_size=package,retailer='Giant Tiger',retailer_sku=sku,barcode=barcode(v.get('barcode')),currency='CAD',price_cad=price,member_price_cad=None,promotion_text='',member_promotion_text='',product_url='https://www.gianttiger.com/products/'+p['handle'],listing_source_url=url,image_url=image,store_scope='Website default; branch price and availability unverified',observed_at=checked,last_attempt_at=checked,check_status='verified',availability='Not verified',category='Groceries',description='Compare this exact package at Giant Tiger. Confirm local price and availability with the retailer.')

def pc_rows(document,url,retailer,checked):
    for p in refresh.tiles(document):
        row=dict(name=p['title'],brand=p.get('brand',''),package_size=str(p.get('packageSizing','')).split(',')[0].strip(),retailer=retailer,retailer_sku=str(p['productId']),listing_source_url=url,store_scope='Website default; branch price and availability unverified')
        if not row['package_size'] or not row['brand']:continue
        try:row=refresh.update_row(row,p,checked)
        except (ValueError,TypeError,KeyError):continue
        img=p.get('productImage',[])
        image=next((x.get('imageUrl','') for x in img if isinstance(x,dict) and x.get('imageUrl')), '') if isinstance(img,list) else ''
        row.update(image_url=image,category='Groceries',description='Compare this exact package using dated retailer website observations.')
        yield row

def collect(source):
    retailer,url=source;checked=now()
    try:
        body=fetch(url)
        if retailer=='Giant Tiger':rows=list(giant_rows(json.loads(body),url,checked))
        else:
            match=re.search(r'<script\b[^>]*\bid=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',body,re.S)
            if not match:raise ValueError('Structured product data unavailable')
            rows=list(pc_rows(json.loads(match[1]),url,retailer,checked))
        rows=[r for r in rows if valid_row(r)]
        if not rows:raise ValueError('No validated priced packages on this source page')
        return rows,dict(retailer=retailer,url=url,status='ok',validated=len(rows))
    except Exception as e:return [],dict(retailer=retailer,url=url,status='unavailable',detail=type(e).__name__+': '+str(e)[:160])
    finally:time.sleep(1)

def merge(existing,candidates,baseline,max_new=MAX_NEW):
    products={p['id']:p for p in existing};keys={};prints={};observations={};added=0;duplicates=0;conflicts=0
    for p in products.values():
        for r in p['observations']:
            keys[identity(r)]=p['id'];observations[(r['retailer'],r['retailer_sku'])]=p['id']
            f=fingerprint(r)
            if f:prints.setdefault(f,set()).add(p['id'])
    # Baseline rows map to existing database products; include observations without creating new cards.
    for r in baseline:
        pid='discovered-'+digest(identity(r));keys.setdefault(identity(r),pid)
        f=fingerprint(r)
        if f:prints.setdefault(f,set()).add(keys[identity(r)])
    baseline_ids={identity(r):r for r in baseline};per_retailer={};seen={};invalid=set()
    for r in candidates:
        k=(r['retailer'],r['retailer_sku']);old=seen.get(k)
        if old and (old['price_cad'],norm(old['name']),size(old['package_size']))!=(r['price_cad'],norm(r['name']),size(r['package_size'])):invalid.add(k)
        seen[k]=r
    for k,r in sorted(seen.items()):
        if k in invalid:conflicts+=1;continue
        base=baseline_ids.get(identity(r))
        if base and (norm(base['name']),size(base['package_size']))!=(norm(r['name']),size(r['package_size'])):conflicts+=1;continue
        f=fingerprint(r);matches=prints.get(f,set()) if f else set()
        pid=keys.get(identity(r)) or (next(iter(matches)) if len(matches)==1 else None)
        if len(matches)>1 and not pid:conflicts+=1;continue
        if pid in products:
            p=products[pid]
            # A SKU changing package/title is a review item, not a silent product replacement.
            old=next((x for x in p['observations'] if (x['retailer'],x['retailer_sku'])==k),None)
            if old and (norm(old['name']),size(old['package_size']))!=(norm(r['name']),size(r['package_size'])):conflicts+=1;continue
            duplicates+=1
        elif pid:
            p={'id':pid,'name':r['name'],'brand':r['brand'],'package_size':r['package_size'],'image_url':r.get('image_url',''),'description':r.get('description',''),'category':r.get('category','Groceries'),'barcode':r.get('barcode',''),'observations':[],'first_seen_at':now()};products[pid]=p
        else:
            if added>=max_new or len(products)>=MAX_TOTAL or per_retailer.get(r['retailer'],0)>=100:continue
            per_retailer[r['retailer']]=per_retailer.get(r['retailer'],0)+1
            pid='discovered-'+digest(identity(r));p={'id':pid,'name':r['name'],'brand':r['brand'],'package_size':r['package_size'],'image_url':r.get('image_url',''),'description':r.get('description',''),'category':r.get('category','Groceries'),'barcode':r.get('barcode',''),'observations':[],'first_seen_at':now()};products[pid]=p;added+=1
        keys[identity(r)]=pid
        if f:prints.setdefault(f,set()).add(pid)
        p['observations']=[x for x in p['observations'] if (x['retailer'],x['retailer_sku'])!=k]+[r]
        if r.get('image_url'):p['image_url']=r['image_url']
    return list(products.values()),dict(added=added,duplicates_updated=duplicates,conflicts_skipped=conflicts)

def main():
    path=ROOT/'public/discovered-catalog.json';state=json.loads(path.read_text()) if path.exists() else {'products':[],'cursor':0}
    baseline=json.loads((ROOT/'public/retailer-prices.json').read_text())['rows']
    cursor=state.get('cursor',0);sources=set()
    # Revisit previously imported pages every day, and rotate through more category pages.
    for p in state['products']:
        for r in p['observations']:sources.add((r['retailer'],r['listing_source_url']))
    categories=sorted({(r['retailer'],r['listing_source_url'].split('?')[0]) for r in baseline})
    for retailer,url in categories:
        sources.add((retailer,url));sources.add((retailer,url+'?page='+str(2+cursor%5)))
    for collection in ['grocery','pantry','snacks-and-drinks','frozen']:
        for page in [1,2+cursor%8]:sources.add(('Giant Tiger',f'https://www.gianttiger.com/collections/{collection}/products.json?limit=250&page={page}'))
    # Hard limit runtime and source requests; don't let an expanding feed create an unbounded crawler.
    sources=sorted(sources)[:160];started=now()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(collect,sources))
    candidates=[r for rows,status in results for r in rows];statuses=[status for rows,status in results]
    products,summary=merge(state['products'],candidates,baseline)
    confirmed={(r['retailer'],r['retailer_sku']) for r in candidates};failed={s['url'] for s in statuses if s['status']!='ok'}
    for p in products:
        for r in p['observations']:
            if (r['retailer'],r['retailer_sku']) not in confirmed:r.update(last_attempt_at=started,check_status='source_unavailable' if r['listing_source_url'] in failed else 'needs_review')
    status=dict(started_at=started,completed_at=now(),**summary,products=len(products),observations=sum(len(p['observations']) for p in products),validated_observations=len(confirmed),sources=statuses)
    path.write_text(json.dumps({'version':1,'cursor':cursor+1,'updated_at':status['completed_at'],'products':products},ensure_ascii=False,separators=(',',':')))
    (ROOT/'public/discovery-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2))
    print(json.dumps({k:v for k,v in status.items() if k!='sources'}))
    return 0 if candidates else 1
if __name__=='__main__':raise SystemExit(main())
