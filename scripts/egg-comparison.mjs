import {readFileSync} from 'node:fs';
import {escapeHtml as e,httpsUrl} from './trust-pages.mjs';

// These are historical feed observations, never current offers.
const {evidence,archive}=JSON.parse(readFileSync(new URL('./egg-evidence.json',import.meta.url),'utf8'));
function exactEvidence(product,row){
 return (product.id===evidence.catalog_id||(product.feed_aliases||[]).includes(evidence.catalog_id))
  && normalized(product.brand_name)===normalized(evidence.brand)&&normalized(row.brand)===normalized(evidence.brand)
  && row.retailer_sku===evidence.retailer_sku
  && (httpsUrl(row.product_url)||'').split(/[?#]/)[0].endsWith('/p/'+evidence.retailer_sku);
}
export const eggsDescription='Compare prices for a dozen eggs at Canadian grocery stores. See the carton price, price per egg, and when each price was checked.';
const money=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:2,maximumFractionDigits:2});
const unitMoney=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',minimumFractionDigits:4,maximumFractionDigits:4});
const date=new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'America/Toronto'});
const normalized=value=>String(value??'').normalize('NFKC').replace(/[‐‑‒–—]/g,'-').toLowerCase();
const excluded=/\b(?:organic\w*|free[ -]?(?:run|range)|cage[ -]?free|pasture[ -]?raised|omega\w*|enriched|extra[ -]?large|super[ -]?large|jumbo|medium|small|liquid|whites|boiled|peeled|pickled|chocolate|candy|noodles|breakfast|steak|meal|egg[ -]?nog)\b/;
function dozen(label){return /^(?:12(?:\.0+)?\s*(?:ea|each|ct|count|eggs?|pack)|(?:pack of\s+)?12|1\s*(?:dozen|doz)|one dozen)$/i.test(String(label??'').trim());}
function wrongNamedCount(text){return [...text.matchAll(/\b(\d+)\s*(?:-\s*)?(?:ea|each|ct|count|eggs?|pack)\b/g)].some(m=>Number(m[1])!==12)||/\b(?:half|two|2)\s*dozen\b/.test(text);}
export function confirmedDozenEggs(product,variant,row){
 const attributes=Object.entries(variant.attributes||{}).filter(([,v])=>['string','number','boolean'].includes(typeof v)).map(([k,v])=>k+' '+v).join(' ');
 // General descriptions may mention other sizes or breakfast recipes, not the exact carton.
 const facts=normalized([product.name,product.brand_name,attributes,row.name,row.brand,
  exactEvidence(product,row)?'grade '+evidence.grade+' '+evidence.size:''].filter(Boolean).join(' '));
 if(!/\beggs?\b/.test(facts)||!/\blarge\b/.test(facts)||!/\bgrade\s*[-:]?\s*a\b/.test(facts)||/\b(?:(?:not|non)\s+grade\s*a|grade\s*[-:]?\s*(?:b|c|aa))\b/.test(facts)||excluded.test(facts))return false;
 if(!dozen(variant.name)||!dozen(row.package_size)||wrongNamedCount(normalized(product.name))||wrongNamedCount(normalized(row.name)))return false;
 if(variant.quantity!=null&&(Number(variant.quantity)!==12||!/^(?:ea|each|ct|count|eggs?)$/i.test(variant.unit||'')))return false;
 return true;
}
export function dozenEggObservations(products,{variantsByProduct,observations,helpers,publishTime=Date.now()}={}){
 if(!variantsByProduct||!observations||!helpers)return [];
 const records=new Map();
 for(const product of products){
  const variants=variantsByProduct.get(product.id)||[];
  const dozenVariants=variants.filter(variant=>dozen(variant.name));
  for(const variant of variants){
   const archived=dozenVariants.length===1&&dozenVariants[0]===variant
    ?archive.rows.filter(row=>row.catalog_id===evidence.catalog_id&&exactEvidence(product,row))
     .map(row=>({...row,variant_id:variant.id,archived:true}))
    :[];
   for(const row of [...(observations.get(variant.id)||[]),...archived]){
    const observed=Date.parse(row.observed_at),amount=helpers.cadAmount(row.price_cad),url=httpsUrl(row.product_url);
    if(row.variant_id!==variant.id||row.currency!=='CAD'||row.check_status!=='verified'||!row.retailer||!url||amount===null||amount<=0||!Number.isFinite(observed)||observed>publishTime||!confirmedDozenEggs(product,variant,row))continue;
    const key=product.id+'|'+variant.id+'|'+String(row.retailer).trim().toLowerCase();
    const existing=records.get(key);
    if(!existing||observed>existing.observed)records.set(key,{product,variant,row,amount,perEgg:amount/12,observed,url,older:row.archived||helpers.websiteState(row,publishTime)!=='current'});
   }
  }
 }
 return [...records.values()].sort((a,b)=>a.row.retailer.localeCompare(b.row.retailer)||a.product.name.localeCompare(b.product.name)||a.product.id.localeCompare(b.product.id));
}
export function renderDozenEggComparison(products,options){
 const records=dozenEggObservations(products,options);
 const summary='Compare standard 12-count cartons of large Grade A eggs. Organic, free-run, free-range and other specialty eggs, different egg sizes and other carton counts are excluded.';
 const scope='These are dated online prices in CAD, not guaranteed local prices or stock. Per-egg prices are the carton price ÷ 12, rounded to four decimals. Dates use Eastern Time.';
 const proof=records.some(({product,row})=>exactEvidence(product,row))
  ?'<p class="egg-scope"><a href="'+e(evidence.url)+'" rel="noopener noreferrer">Confirm the No Name carton size and grade</a> (same retailer product number).</p>':'';
 const rows=records.map(({product,variant,row,amount,perEgg,observed,url,older})=>{
  const name=(product.brand_name&&!product.name.toLowerCase().includes(product.brand_name.toLowerCase())?product.brand_name+' ':'')+product.name;
  return `<li class="egg-observation"><strong class="egg-retailer">${e(row.retailer)}</strong><p class="egg-product">${e(name)} · ${e(variant.name)}</p><dl><div><dt>Carton price</dt><dd>${e(money.format(amount))} CAD</dd></div><div><dt>Price per egg</dt><dd>${e(unitMoney.format(perEgg))} CAD</dd></div><div><dt>Observed</dt><dd><time datetime="${new Date(observed).toISOString()}">${e(date.format(observed))} ET</time></dd></div></dl>${row.archived?'<p class="egg-age">Last verified price in the archive. Not a current price; recheck the source before shopping.</p>':older?'<p class="egg-age">Older observation; recheck the source before shopping.</p>':''}${row.promotion_text?`<p class="egg-condition">${e(row.promotion_text)}</p>`:''}<a class="egg-source" href="${e(url)}" rel="noopener noreferrer">View ${e(row.retailer)} source</a></li>`;
 }).join('');
 const availability=records.length===0?'<p class="egg-empty">No confirmed matching online price observations are available in the current feed. Listings with an unconfirmed grade, carton count or latest price check are left out. Browse the products below for other egg options.</p>':`<p class="egg-availability">${records.length} dated observation${records.length===1?'':'s'} shown. Compare only the same carton and check the observation date; no cheapest retailer is declared.</p><ul class="egg-observations">${rows}</ul>`;
 return `<section class="egg-comparison" id="dozen-eggs" aria-labelledby="dozen-eggs-heading"><h2 id="dozen-eggs-heading">Compare prices for a dozen eggs</h2><p class="egg-summary">${summary}</p>${availability}${proof}<p class="egg-scope">${scope}</p></section>`;
}
