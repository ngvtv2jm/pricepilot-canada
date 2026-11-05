import {parseCSV} from './csv.ts';
const hosts:Record<string,string>={'Real Canadian Superstore':'www.realcanadiansuperstore.ca','No Frills':'www.nofrills.ca','Loblaws':'www.loblaws.ca'};
export function readPrices(text:string,now=Date.now()){
 const table=parseCSV(text),headers=(table.shift()||[]).map(h=>h.trim().toLowerCase());
 if(new Set(headers).size!==headers.length)throw Error('Duplicate headers');
 for(const key of ['name','brand','package_size','retailer','retailer_sku','price_cad','product_url','observed_at_utc','store_scope'])if(!headers.includes(key))throw Error('Missing '+key);
 if(!table.length||table.length>500)throw Error('Use 1–500 price rows');
 return table.map((values,i)=>{
  const fail=(why:string):never=>{throw Error(`Row ${i+2}: ${why}`)};
  if(values.length!==headers.length)fail('wrong column count');
  const r=Object.fromEntries(headers.map((key,j)=>[key,values[j].trim()]));
  for(const key of ['name','brand','package_size','retailer_sku','store_scope'])if(!r[key])fail(key+' is required');
  for(const key of ['price_cad','member_price_cad'])if(key==='price_cad'||r[key])if(!r[key]||!Number.isFinite(Number(r[key]))||Number(r[key])<0||Number(r[key])>100000)fail('invalid '+key);
  if(r.currency&&r.currency!=='CAD')fail('only CAD prices supported');
  const stamp=Date.parse(r.observed_at_utc);if(!Number.isFinite(stamp)||stamp>now+300000)fail('invalid or future observation date');
  let url:URL;try{url=new URL(r.product_url)}catch{fail('invalid retailer URL')}
  if(url!.protocol!=='https:'||url!.username||url!.password||url!.host!==hosts[r.retailer]||!url!.pathname.endsWith('/p/'+r.retailer_sku))fail('retailer, URL and SKU must match');
  return r;
 });
}
