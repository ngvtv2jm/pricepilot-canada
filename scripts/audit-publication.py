"""Audit the exact deployable public files, including every sitemap and internal link."""
import collections, json, pathlib, re, tempfile, urllib.parse, xml.etree.ElementTree as ET, zipfile
from html.parser import HTMLParser
ROOT=pathlib.Path(__file__).resolve().parents[1];DIST=ROOT/'dist'
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__(convert_charrefs=True);self.links=[];self.images=[];self.meta={};self.h1=0;self.canonical='';self.lang='';self.redirect=False;self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='html':self.lang=a.get('lang','')
  if tag=='h1':self.h1+=1
  if tag=='a' and a.get('href'):self.links.append(a['href'])
  if tag=='img':self.images.append(a)
  if tag=='link' and a.get('rel')=='canonical':self.canonical=a.get('href','')
  if tag=='meta':
   self.meta[a.get('name',a.get('property',''))]=a.get('content','')
   if a.get('http-equiv','').lower()=='refresh':self.redirect=True

def resolve(url):
 path=urllib.parse.unquote(urllib.parse.urlsplit(url).path).lstrip('/')
 file=DIST/path
 return file/'index.html' if not path or path.endswith('/') or file.is_dir() else file

def main():
 errors=[];pages={};canonical={};links=0;github_images=0;redirects=0
 for file in DIST.rglob('*.html'):
  text=file.read_text();page=Page(text);pages[file]=page;label=str(file.relative_to(DIST))
  if page.redirect:redirects+=1;continue
  if file.name=='404.html':continue
  if page.lang!='en-CA':errors.append(label+': missing document language')
  if page.h1!=1 and file!=DIST/'index.html':errors.append(label+': needs one H1')
  if not re.search(r'<title>[^<]+</title>',text):errors.append(label+': missing title')
  if not page.meta.get('description'):errors.append(label+': missing description')
  if not page.canonical.startswith('https://pricepine.ca/'):errors.append(label+': wrong canonical domain')
  if '.html' in page.canonical:errors.append(label+': non-clean canonical')
  legacy=file.name!='index.html' and file.with_suffix('').is_dir() and 'src="/clean-urls.js"' in text
  if 'noindex' not in page.meta.get('robots','') and not legacy:
   if page.canonical in canonical:errors.append(label+': duplicate indexed canonical')
   canonical[page.canonical]=label
  for href in page.links:
   parsed=urllib.parse.urlsplit(href)
   if parsed.scheme and parsed.scheme not in ['https','http']:continue
   if parsed.netloc and parsed.netloc!='pricepine.ca':continue
   if not parsed.path:continue
   if not parsed.path.startswith('/'):errors.append(label+': relative link '+href);continue
   links+=1
   if '.html' in parsed.path:errors.append(label+': legacy navigation link '+href)
   if not resolve(href).is_file():errors.append(label+': broken internal link '+href)
  for image in page.images:
   src=image.get('src','')
   if 'alt' not in image:errors.append(label+': unlabelled image')
   if src.startswith('https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/'):
    github_images+=1
    local=ROOT/'public'/src.split('/main/public/',1)[1]
    if not local.is_file():errors.append(label+': missing GitHub image '+src)
   elif src.startswith('/') and not resolve(src).is_file():errors.append(label+': broken local image '+src)
   if '/catalog-cache/' in src and not src.startswith('https://raw.githubusercontent.com/'):errors.append(label+': product image still bundled')
 urls=[n.text for n in ET.parse(DIST/'sitemap.xml').getroot()]
 # loc is inside each url element.
 urls=[node.find('{*}loc').text for node in ET.parse(DIST/'sitemap.xml').getroot()]
 for url in urls:
  if not url.startswith('https://pricepine.ca/') or '.html' in url:errors.append('Bad sitemap URL '+url)
  if not resolve(url).is_file():errors.append('Missing sitemap page '+url)
  elif 'noindex' in pages[resolve(url)].meta.get('robots',''):errors.append('Noindex page in sitemap '+url)
 if len(urls)!=len(set(urls)):errors.append('Sitemap contains duplicates')
 if 'https://pricepine.ca/sitemap.xml' not in (DIST/'robots.txt').read_text():errors.append('Wrong robots sitemap')
 for directory in ['catalog-cache','catalog-images']:
  if (DIST/directory).exists():errors.append(directory+' remains in deployment')
 with tempfile.TemporaryFile() as out:
  with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
   for file in DIST.rglob('*'):
    if file.is_file():archive.write(file,file.relative_to(DIST))
  size=out.tell()
 if size>=100_000_000:errors.append('Deployment exceeds Bolt ZIP limit')
 report={'canonical_pages':len(canonical),'sitemap_urls':len(urls),'internal_links_checked':links,'github_image_references_checked':github_images,'legacy_redirects':redirects,'deployment_zip_bytes':size,'errors':errors}
 print(json.dumps(report,indent=2));return bool(errors)
if __name__=='__main__':raise SystemExit(main())
