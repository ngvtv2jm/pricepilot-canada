"""Find missing exact-package retailer observations without manufacturing comparisons."""
import concurrent.futures, copy, datetime, itertools, importlib.util, json, pathlib, re, threading, time, urllib.parse
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('discovery',ROOT/'scripts/discover-products.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
LIMIT=900
locks={r:threading.Semaphore(2) for r in d.refresh.HOSTS}

def full_tokens(row):
    name=d.size(row.get('name',''));pack=d.size(row.get('package_size',''));brand=d.norm(row.get('brand',''))
    if pack and name.endswith(pack):name=name[:-len(pack)].rstrip(' ,-')
    if brand and not name.startswith(brand+' ') and name!=brand:name=brand+' '+name
    return sorted(re.findall(r'\w+',name))

def exact_match(product,row):
    if d.size(product['package_size'])!=d.size(row['package_size']):return False
    observations=product.get('observations',[])
    source=next((r for r in observations if r['retailer'] in d.refresh.HOSTS),None)
    if source and row['retailer'] in d.refresh.HOSTS:
        return (source['retailer_sku']==row['retailer_sku'] and d.norm(source['brand'])==d.norm(row['brand']) and d.norm(source['name'])==d.norm(row['name']))
    left=d.barcode(product.get('barcode'));right=d.barcode(row.get('barcode'))
    if left and right:return left==right
    if product.get('brand') and row.get('brand') and d.norm(product['brand'])!=d.norm(row['brand']):return False
    # All meaningful words must agree, including brand, flavour, dietary claims and pack counts.
    return full_tokens(product)==full_tokens(row) and len(full_tokens(row))>=3

def search(task):
    retailer,query=task;url='https://'+d.HOSTS[retailer]+'/en/search?'+urllib.parse.urlencode({'search-bar':query})
    with locks[retailer]:
        try:
            body=d.fetch(url);match=re.search(r'<script\b[^>]*\bid=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',body,re.S)
            if not match:raise ValueError('No structured search results')
            rows=[r for r in d.pc_rows(json.loads(match[1]),url,retailer,d.now()) if d.valid_row(r)]
            return rows,{'retailer':retailer,'query':query,'status':'ok','candidates':len(rows)}
        except Exception as e:return [],{'retailer':retailer,'query':query,'status':'unavailable','detail':type(e).__name__+': '+str(e)[:140]}
        finally:time.sleep(.5)

def attach(products,candidates,old_rows):
    out={};review=0
    for item in old_rows:
        out[(item['catalog_id'],item['retailer'])]=item
    by_sku={};by_tokens={}
    for r in candidates:
        by_sku.setdefault(r['retailer_sku'],[]).append(r)
        by_tokens.setdefault(tuple(full_tokens(r)),[]).append(r)
    matched=0
    for p in products:
        potential=[]
        for r in p['observations']:
            if r['retailer'] in d.refresh.HOSTS:potential.extend(by_sku.get(r['retailer_sku'],[]))
        potential.extend(by_tokens.get(tuple(full_tokens(p)),[]))
        groups={}
        for r in potential:
            if exact_match(p,r):groups.setdefault(r['retailer'],[]).append(r)
        for retailer,choices in groups.items():
            if len({(r['retailer_sku'],r['price_cad'],r.get('member_price_cad'),r.get('promotion_text')) for r in choices})>1:review+=1;continue
            r=max(choices,key=lambda r:r['observed_at']);key=(p['id'],retailer)
            prior=out.get(key)
            if prior and prior['observed_at']>r['observed_at']:continue
            matched+=int(key not in out);out[key]={**r,'catalog_id':p['id'],'match_method':'shared_sku' if any(o['retailer'] in d.refresh.HOSTS for o in p['observations']) else 'exact_brand_name_package'}
    return list(out.values()),matched,review

def main():
    started=d.now();feed=json.loads((ROOT/'public/discovered-catalog.json').read_text());products=feed['products']
    output=ROOT/'public/comparison-prices.json';old=json.loads(output.read_text()) if output.exists() else {'rows':[],'queries':{}}
    # Reuse the data already fetched by discovery, then search only missing retailer/product pairs.
    candidates=[r for p in products for r in p['observations']]
    pool=ROOT/'public/discovery-candidates.json'
    if pool.exists():candidates.extend(json.loads(pool.read_text())['rows'])
    rows,added,conflicts=attach(products,candidates,old['rows'])
    cutoff=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(hours=20)).isoformat()
    present={(r['catalog_id'],r['retailer']) for r in rows if r.get('observed_at','')>=cutoff};tasks={}
    for p in products:
        query=(p['brand']+' '+p['name']).strip() if p['brand'] and not d.norm(p['name']).startswith(d.norm(p['brand'])) else p['name']
        query=re.sub(r'\s+',' ',query)[:180]
        for retailer in d.refresh.HOSTS:
            key=retailer+'|'+query
            if (p['id'],retailer) not in present:tasks[(retailer,query)]=old.get('queries',{}).get(key,'')
    # Oldest-attempt-first prevents persistent unmatched products starving newly discovered ones.
    selected=sorted(tasks,key=lambda t:(tasks[t],t))[:LIMIT]
    # Interleave retailer queues so waiting on one store never occupies every worker.
    queues=[[t for t in selected if t[0]==retailer] for retailer in d.refresh.HOSTS]
    selected=[t for group in itertools.zip_longest(*queues) for t in group if t is not None]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(search,selected))
    found=[r for group,status in results for r in group]
    fresh_keys={(r['retailer'],r['retailer_sku']) for r in found}
    rows,new,review=attach(products,[r for r in candidates if (r['retailer'],r['retailer_sku']) not in fresh_keys]+found,rows);added+=new;conflicts+=review
    queries=dict(old.get('queries',{}));checks=[s for _,s in results]
    for s in checks:queries[s['retailer']+'|'+s['query']]=started
    current={r['catalog_id']+'|'+r['retailer'] for r in rows if r.get('observed_at','')>=cutoff}
    for r in rows:
        if r['catalog_id']+'|'+r['retailer'] not in current and r.get('observed_at','')<cutoff:r['check_status']='needs_review'
    out={'version':1,'updated_at':d.now(),'rows':rows,'queries':queries}
    output.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')))
    counts={p['id']:set(r['retailer'] for r in p['observations']) for p in products}
    for r in rows:counts.setdefault(r['catalog_id'],set()).add(r['retailer'])
    status={'completed_at':d.now(),'products':len(products),'with_comparisons':sum(len(x)>=2 for x in counts.values()),'single_retailer':sum(len(x)==1 for x in counts.values()),'new_matches':added,'conflicts_skipped':conflicts,'searches':len(selected),'queued_searches':max(0,len(tasks)-len(selected)),'successful_searches':sum(s['status']=='ok' for s in checks),'checks':checks}
    (ROOT/'public/comparison-status.json').write_text(json.dumps(status,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in status.items() if k!='checks'}))
    return 0 if not selected or any(s['status']=='ok' for s in checks) else 1
if __name__=='__main__':raise SystemExit(main())
