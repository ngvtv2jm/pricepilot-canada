// Source-backed text updates keep published product pages useful between releases.
(()=>{
 const root=document.querySelector('[data-product-description]');if(!root)return;
 const norm=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const hosts=new Set(['www.realcanadiansuperstore.ca','www.nofrills.ca','www.loblaws.ca','www.gianttiger.com']);
 const ids=(root.dataset.descriptionIds||'').split(',').filter(id=>/^[a-zA-Z0-9-]+$/.test(id));
 async function update(){for(const id of ids){try{
  const response=await fetch('https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/product-descriptions/'+id+'.json',{cache:'no-cache',signal:AbortSignal.timeout(8000)});if(!response.ok)continue;const entry=await response.json();
  const url=new URL(entry.source_url),checked=Date.parse(entry.checked_at);
  if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.username||url.password||norm(entry.name)!==norm(root.dataset.productName)||typeof entry.description!=='string'||entry.description.length<50||entry.description.length>1200||!Number.isFinite(checked)||checked>Date.now()+60000)continue;
  root.querySelector('[data-description-text]').textContent=entry.description;
  const attribution=root.querySelector('[data-description-source]'),link=document.createElement('a');link.href=url.href;link.textContent='Description source: '+(entry.source_label||'Retailer');link.rel='noopener noreferrer';attribution.replaceChildren(link,document.createTextNode(' · Checked '+new Date(checked).toLocaleDateString()));
  for(const selector of ['meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]'])document.querySelector(selector)?.setAttribute('content',entry.description.slice(0,300));
  for(const element of document.querySelectorAll('script[type="application/ld+json"]')){try{const schema=JSON.parse(element.textContent);if(schema['@type']==='Product'){schema.description=entry.description;element.textContent=JSON.stringify(schema).replace(/</g,'\\u003c')}}catch{}}
  return;
 }catch{}}}
 void update();
})();
