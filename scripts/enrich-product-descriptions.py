"""Research exact retailer listings. Keep sources, preserve confirmed text, and defer failures."""
import concurrent.futures,datetime,html,json,os,pathlib,re,time,threading,urllib.parse,urllib.request
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1]
HOSTS={'www.realcanadiansuperstore.ca','www.nofrills.ca','www.loblaws.ca','www.gianttiger.com'}
NOW=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()
LOCKS={host:threading.Lock() for host in HOSTS};NEXT={host:0.0 for host in HOSTS}
class Text(HTMLParser):
 def __init__(self,value):super().__init__(convert_charrefs=True);self.parts=[];self.hidden=0;self.feed(str(value))
 def handle_starttag(self,tag,attrs):
  if tag in ['script','style']:self.hidden+=1
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.hidden=max(0,self.hidden-1)
  self.parts.append(' ')
 def handle_data(self,data):
  if not self.hidden:self.parts.append(data)
def clean(value):return re.sub(r'\s+',' ',''.join(Text(value).parts)).strip()
def norm(value):return re.sub(r'[^a-z0-9]+',' ',str(value or '').casefold()).strip()
def pack(value):return re.sub(r'\s+','',norm(value))
def valid_source(url):
 try:
  p=urllib.parse.urlsplit(url)
  return p.scheme=='https' and p.hostname in HOSTS and not p.username and not p.password and p.port in [None,443] and not p.query and not p.fragment and (bool(re.fullmatch(r'/en/.+/p/[a-zA-Z0-9_-]+',p.path)) or p.hostname=='www.gianttiger.com' and bool(re.fullmatch(r'/products/[a-z0-9-]+',p.path)))
 except ValueError:return False
class Scripts(HTMLParser):
 def __init__(self,value):super().__init__(convert_charrefs=False);self.active=False;self.parts=[];self.docs=[];self.feed(value)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='script' and (a.get('type')=='application/ld+json' or a.get('id')=='__NEXT_DATA__'):self.active=True;self.parts=[]
 def handle_data(self,data):
  if self.active:self.parts.append(data)
 def handle_endtag(self,tag):
  if tag=='script' and self.active:
   try:self.docs.append(json.loads(''.join(self.parts)))
   except ValueError:pass
   self.active=False

def dictionaries(value):
 if isinstance(value,dict):
  yield value
  for child in value.values():yield from dictionaries(child)
 elif isinstance(value,list):
  for child in value:yield from dictionaries(child)
def same_name(actual,expected,brand='',package=''):
 def simplify(v):
  v=norm(v);b=norm(brand);s=norm(package)
  if b and v.startswith(b+' '):v=v[len(b):].strip()
  if s and v.endswith(s):v=v[:-len(s)].strip()
  return v
 return bool(simplify(actual)) and simplify(actual)==simplify(expected)
def extract(document,row):
 docs=Scripts(document).docs if isinstance(document,str) else [document]
 matches=[]
 for doc in docs:
  for node in dictionaries(doc):
   sku=str(node.get('sku',node.get('productId','')))
   if row['retailer']=='Giant Tiger':
    valid=any(str(v.get('sku',''))==row['retailer_sku'] for v in node.get('variants',[]) if isinstance(v,dict))
   else:valid=sku==row['retailer_sku']
   if not valid or not same_name(node.get('name',node.get('title','')),row['name'],row.get('brand',''),row.get('package_size','')):continue
   source_brand=node.get('brand')
   if isinstance(source_brand,dict):source_brand=source_brand.get('name')
   if source_brand and row.get('brand') and norm(source_brand)!=norm(row['brand']):continue
   source_size=node.get('packageSizing',node.get('size'))
   if source_size and pack(str(source_size).split(',')[0])!=pack(row['package_size']):continue
   raw=node.get('description') or node.get('body_html') or ''
   if not isinstance(raw,str):continue
   description=clean(raw)
   if len(description)<60 or len(description.split())<10 or re.search(r'access denied|verify you are human|enable javascript|sign in to view',description,re.I):continue
   # A short attributed excerpt, not a copied full retailer description.
   words=description.split();excerpt=' '.join(words[:25])+('…' if len(words)>25 else '')
   matches.append(excerpt)
 if not matches:raise ValueError('No description matched the exact SKU, name and package')
 return max(matches,key=len)

def collect_products(snapshot,discovered,prices):
 brands={b['id']:b['name'] for b in snapshot.get('brands',[])};variants={};by_url={};by_identity={}
 for v in snapshot.get('product_variants',[]):variants.setdefault(v['product_id'],[]).append(v.get('name',''))
 products={p['id']:{'id':p['id'],'name':p['name'],'brand':brands.get(p.get('brand_id'),''),'package_size':', '.join(variants.get(p['id'],[])),'sources':[]} for p in snapshot.get('products',[])}
 for p in snapshot.get('products',[]):
  if p.get('source_url'):by_url.setdefault(p['source_url'],[]).append(products[p['id']])
 rows=list(prices)
 for p in discovered:
  products.setdefault(p['id'],{**p,'sources':[]});rows.extend(p.get('observations',[]))
 def key(p):return (norm(p['name']),norm(p.get('brand')),pack(p.get('package_size')))
 for p in products.values():by_identity.setdefault(key(p),[]).append(p)
 seen=set()
 for row in rows:
  if not valid_source(row.get('product_url','')):continue
  for p in by_url.get(row['product_url'],[])+by_identity.get(key(row),[]):
   identity=(p['id'],row['retailer'],row['retailer_sku'])
   if identity not in seen:p['sources'].append(row);seen.add(identity)
 return list(products.values())

def fetch(url):
 if not valid_source(url.removesuffix('.js')):raise ValueError('Unsupported source')
 host=urllib.parse.urlsplit(url).hostname
 with LOCKS[host]:
  time.sleep(max(0,NEXT[host]-time.monotonic()));NEXT[host]=time.monotonic()+1
 req=urllib.request.Request(url,headers={'User-Agent':'PricePine-ProductResearch/1.0','Accept':'application/json,text/html'})
 with urllib.request.urlopen(req,timeout=18) as r:
  final=urllib.parse.urlsplit(r.url)
  if final.hostname!=urllib.parse.urlsplit(url).hostname or final.scheme!='https':raise ValueError('Unexpected source redirect')
  body=r.read(6_000_001)
  if len(body)>6_000_000:raise ValueError('Response too large')
 return body.decode('utf-8')
BROWSER_STATE=threading.local()
def render_source(url):
 # Normal public-page rendering on the GitHub runner, with no stealth or challenge bypass.
 from playwright.sync_api import sync_playwright
 if not hasattr(BROWSER_STATE,'browser'):
  BROWSER_STATE.playwright=sync_playwright().start();BROWSER_STATE.browser=BROWSER_STATE.playwright.chromium.launch(headless=True)
 page=BROWSER_STATE.browser.new_page()
 try:
  page.goto(url,wait_until='domcontentloaded',timeout=25000)
  if urllib.parse.urlsplit(page.url).hostname!=urllib.parse.urlsplit(url).hostname:raise ValueError('Unexpected browser redirect')
  page.wait_for_function("() => !!document.querySelector('script[type=\"application/ld+json\"],script#__NEXT_DATA__')",timeout=12000)
  return page.content()
 finally:page.close()

RESEARCH_GUARD=threading.Lock();RESEARCH_LOCKS={};RESEARCH_RESULTS={}
def research_row(row):
 key=(row['product_url'],row['retailer_sku'],norm(row['name']),norm(row.get('brand')),pack(row.get('package_size')))
 with RESEARCH_GUARD:lock=RESEARCH_LOCKS.setdefault(key,threading.Lock())
 with lock:
  if key in RESEARCH_RESULTS:
   value,error=RESEARCH_RESULTS[key]
   if error:raise ValueError(error)
   return value
  try:
   url=row['product_url'];body=fetch(url+'.js' if row['retailer']=='Giant Tiger' else url);doc=json.loads(body) if row['retailer']=='Giant Tiger' else body
   try:excerpt=extract(doc,row)
   except ValueError:
    if os.environ.get('DESCRIPTION_RENDER')!='1' or row['retailer']=='Giant Tiger':raise
    excerpt=extract(render_source(url),row)
   RESEARCH_RESULTS[key]=(excerpt,None);return excerpt
  except Exception as error:
   RESEARCH_RESULTS[key]=(None,str(error));raise

def main():
 read=lambda name,default:json.loads((ROOT/'public'/name).read_text()) if (ROOT/'public'/name).exists() else default
 products=collect_products(read('catalog-snapshot.json',{}),read('discovered-catalog.json',{'products':[]})['products'],read('retailer-prices.json',{'rows':[]})['rows'])
 feed=read('product-descriptions.json',{'version':1,'entries':{}});entries=feed['entries'];attempts=read('description-status.json',{}).get('attempts',{})
 started=NOW();deadline=time.monotonic()+max(30,min(1200,int(os.environ.get('DESCRIPTION_TIME_BUDGET_SECONDS','1100'))));limit=max(1,min(5000,int(os.environ.get('DESCRIPTION_MAX_PRODUCTS','1000'))));today=datetime.datetime.now(datetime.timezone.utc)
 def fresh(p):
  try:return today-datetime.datetime.fromisoformat(entries[p['id']]['checked_at'])<datetime.timedelta(days=30)
  except (KeyError,ValueError,TypeError):return False
 pending=sorted([p for p in products if not fresh(p)],key=lambda p:(p['id'] in entries,attempts.get(p['id'],{}).get('checked_at',''),p['id']))
 chosen=pending[:limit];failures=[];updated=0;deferred=0
 def work(p):
  if time.monotonic()>deadline:return p,None,'deferred'
  reasons=[]
  for row in p['sources'][:2]:
   try:
    url=row['product_url'];excerpt=research_row(row)
    label=' '.join(dict.fromkeys([p.get('brand',''),p['name']])).strip();package=row.get('package_size','')
    description=f'{label}. Listed package: {package}. Retailer overview: “{excerpt}”'
    return p,{'name':p['name'],'brand':p.get('brand',''),'package_size':package,'description':description,'source_excerpt':excerpt,'source_url':url,'source_label':row['retailer'],'checked_at':NOW(),'retailer_sku':row['retailer_sku']},None
   except Exception as e:reasons.append(type(e).__name__+': '+str(e)[:120])
   finally:time.sleep(.75)
  return p,None,'; '.join(reasons) or 'No supported exact product source'
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for p,entry,error in pool.map(work,chosen):
   if error=='deferred':deferred+=1;continue
   attempts[p['id']]={'checked_at':NOW(),'status':'verified' if entry else 'needs_review','reason':error}
   if entry:entries[p['id']]=entry;updated+=1
   else:failures.append({'id':p['id'],'reason':error})
 feed.update(updated_at=NOW());(ROOT/'public/product-descriptions.json').write_text(json.dumps(feed,ensure_ascii=False,separators=(',',':')))
 directory=ROOT/'public/product-descriptions';directory.mkdir(exist_ok=True)
 for pid,entry in entries.items():
  if re.fullmatch(r'[a-zA-Z0-9-]+',pid):(directory/(pid+'.json')).write_text(json.dumps(entry,ensure_ascii=False,separators=(',',':')))
 missing=sum(p['id'] not in entries for p in products)
 status={'completed_at':NOW(),'started_at':started,'products':len(products),'researched':sum(p['id'] in entries for p in products),'updated':updated,'missing':missing,'queued':max(0,len(pending)-len(chosen))+deferred,'failed':len(failures),'failures':failures,'attempts':attempts}
 (ROOT/'public/description-status.json').write_text(json.dumps(status,ensure_ascii=False,separators=(',',':')));print(json.dumps({k:v for k,v in status.items() if k not in ['attempts','failures']}));return 0
if __name__=='__main__':raise SystemExit(main())
