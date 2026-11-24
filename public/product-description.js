// Source-backed text updates keep published product pages useful between releases.
(()=>{
 const root=document.querySelector('[data-product-description]');if(!root)return;
 const norm=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const hosts=new Set(['www.realcanadiansuperstore.ca','www.nofrills.ca','www.loblaws.ca','www.gianttiger.com']);
 // Same display rule as publicProductDescription in src/lib/productSeo.ts.
 function publicProductDescription(description,name,packageSize){
  const plain=String(description??'').split(/\bretailer\s+overview\s*:/i,1)[0].trim();
  const clean=(value)=>(typeof value==='string'?value:'').trim().replace(/[.\s]+$/u,'');
  if(plain.length>=50)return plain;
  if(plain)return clean(plain)+'. Compare dated retailer prices where available.';
  const title=clean(name)||'This grocery product';
  const size=clean(packageSize);
  const fact=size&&!title.toLowerCase().endsWith(size.toLowerCase())?' Listed package: '+size+'.':'';
  return title+'.'+fact+' Compare dated retailer prices where available.';
 }
 const ids=(root.dataset.descriptionIds||'').split(',').filter(id=>/^[a-zA-Z0-9-]+$/.test(id));
 async function update(){for(const id of ids){try{
  const response=await fetch('https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/product-descriptions/'+id+'.json',{cache:'no-cache',signal:AbortSignal.timeout(8000)});if(!response.ok)continue;const entry=await response.json();
  const url=new URL(entry.source_url),checked=Date.parse(entry.checked_at);
  if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.username||url.password||norm(entry.name)!==norm(root.dataset.productName)||typeof entry.description!=='string'||entry.description.length<50||entry.description.length>1200||!Number.isFinite(checked)||checked>Date.now()+60000)continue;
  const description=publicProductDescription(entry.description,root.dataset.productName,entry.package_size);
  root.querySelector('[data-description-text]').textContent=description;
  const attribution=root.querySelector('[data-description-source]'),link=document.createElement('a');link.href=url.href;link.textContent='Description source: '+(entry.source_label||'Retailer');link.rel='noopener noreferrer';attribution.replaceChildren(link,document.createTextNode(' · Checked '+new Date(checked).toLocaleDateString()));
  return;
 }catch{}}}
 void update();
})();
