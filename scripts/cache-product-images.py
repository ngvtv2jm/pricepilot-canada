"""Keep validated, content-addressed copies of retailer product images in the catalog repo."""
import concurrent.futures, datetime, hashlib, io, json, pathlib, re, time, urllib.parse, urllib.request
from PIL import Image, ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[1]
ALLOWED={'digital.loblaws.ca','cdn.shopify.com','images.pc.ca'}
Image.MAX_IMAGE_PIXELS=25_000_000

def valid_url(url):
    try:
        p=urllib.parse.urlsplit(url)
        return p.scheme=='https' and p.hostname in ALLOWED and not p.username and not p.password
    except ValueError:return False

def webp(raw):
    if len(raw)>8_000_000:raise ValueError('Image exceeds byte limit')
    with Image.open(io.BytesIO(raw)) as im:
        if im.format not in {'JPEG','PNG','WEBP'}:raise ValueError('Unsupported image format')
        if min(im.size)<60:raise ValueError('Image too small')
        im.load();im=ImageOps.exif_transpose(im).convert('RGB');im.thumbnail((800,800))
        output=io.BytesIO();im.save(output,'WEBP',quality=85,method=4);return output.getvalue()

def main():
    started=datetime.datetime.now(datetime.timezone.utc).isoformat();path=ROOT/'public/image-cache.json'
    previous=json.loads(path.read_text()).get('images',{}) if path.exists() else {}
    products=json.loads((ROOT/'public/discovered-catalog.json').read_text())['products']
    legacy=json.loads((ROOT/'src/lib/catalogImages.json').read_text())
    cache=ROOT/'public/catalog-cache';cache.mkdir(exist_ok=True);by_url={}
    for p in products:
        urls=list(dict.fromkeys([p.get('image_url','')]+[r.get('image_url','') for r in p['observations']]))
        for url in urls:
            if valid_url(url):by_url.setdefault(url,[]).append(p['id'])
    def download(entry):
        url,ids=entry
        for pid in ids:
            old=previous.get(pid,{})
            if old.get('source_url')==url and re.fullmatch(r'catalog-cache/[a-f0-9]{64}\.webp',old.get('path','')):
                file=ROOT/'public'/old['path']
                try:
                    with Image.open(file) as im:im.verify()
                    # Content-addressed bytes are immutable. Recheck source weekly; repair damaged/missing files immediately.
                    if datetime.datetime.fromisoformat(started)-datetime.datetime.fromisoformat(old['cached_at'])<datetime.timedelta(days=7):return ids,{**old,'checked_at':started},None
                except (OSError,ValueError,KeyError):pass
        try:
            local=legacy.get(url)
            if local and re.fullmatch(r'/catalog-images/[a-zA-Z0-9_-]+\.webp',local) and (ROOT/'public'/local.lstrip('/')).exists():raw=(ROOT/'public'/local.lstrip('/')).read_bytes()
            else:
                req=urllib.request.Request(url,headers={'User-Agent':'PricePine-ImageCache/1.0','Accept':'image/webp,image/png,image/jpeg'})
                with urllib.request.urlopen(req,timeout=15) as res:
                    if not valid_url(res.url):raise ValueError('Unexpected image redirect')
                    raw=res.read(8_000_001)
            data=webp(raw);digest=hashlib.sha256(data).hexdigest();filename='catalog-cache/'+digest+'.webp';target=ROOT/'public'/filename
            if not target.exists():target.write_bytes(data)
            return ids,{'path':filename,'source_url':url,'cached_at':started,'checked_at':started,'bytes':len(data)},None
        except Exception as e:return ids,None,type(e).__name__+': '+str(e)[:120]
        finally:time.sleep(.15)
    manifest={k:v for k,v in previous.items() if re.fullmatch(r'catalog-cache/[a-f0-9]{64}\.webp',v.get('path','')) and (ROOT/'public'/v['path']).is_file()};failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for ids,image,error in pool.map(download,by_url.items()):
            for pid in ids:
                if image:manifest[pid]=image
                elif pid not in manifest:failures.append({'id':pid,'reason':error})
    missing=[p['id'] for p in products if p['id'] not in manifest]
    # Never remove the last known-good copy after a transient source failure.
    path.write_text(json.dumps({'version':1,'updated_at':started,'images':manifest},separators=(',',':')))
    status={'completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'products':len(products),'cached':len(products)-len(missing),'missing':len(missing),'missing_ids':missing,'failures':failures}
    (ROOT/'public/image-cache-status.json').write_text(json.dumps(status,indent=2));print(json.dumps({k:v for k,v in status.items() if k not in ['missing_ids','failures']}))
    return 0 if not missing else 1
if __name__=='__main__':raise SystemExit(main())
