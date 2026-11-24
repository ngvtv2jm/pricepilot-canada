import {escapeHtml,httpsUrl} from './trust-pages.mjs';
const cad=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
const date=new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'America/Toronto'});
export function packageMeasure(variant,label=''){
 const match=String(label||variant.name||'').trim().match(/^(?:(\d+)\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*-?\s*(g|kg|ml|l|each|ct|count)$/i);
 if(match){const quantity=Number(match[1]||1)*Number(match[2]);const unit=match[3].toLowerCase().replace(/^(?:ct|count)$/,'each');return {quantity,unit};}
 // Do not fall back to generic database fields for a non-empty, unparsed retailer label.
 return label?null:{quantity:Number(variant.quantity),unit:String(variant.unit||'')};
}
export function renderObservations(variant,rows,helpers,now=Date.now()){
 const records=[];
 for(const row of rows){
  const observed=Date.parse(row.observed_at),amount=helpers.cadAmount(row.price_cad),url=httpsUrl(row.product_url);
  if(row.currency!=='CAD'||row.variant_id!==variant.id||!url||!row.retailer||!Number.isFinite(observed)||observed>now||amount===null)continue;
  const measure=packageMeasure(variant,row.package_size);
  const unit=measure&&helpers.unitPrice(amount,measure.quantity,measure.unit);
  records.push({row,observed,amount,url,unit,state:helpers.websiteState(row,now)});
 }
 if(!records.length)return '';
 records.sort((a,b)=>Number(b.state==='current')-Number(a.state==='current')||a.amount-b.amount||b.observed-a.observed);
 return `<div class="observation-table" style="overflow-x:auto;margin:1rem 0" tabindex="0"><table><caption>Dated retailer website prices</caption><thead><tr><th scope="col">Retailer</th><th scope="col">Price (CAD)</th><th scope="col">Unit price</th><th scope="col">Observed</th><th scope="col">Scope and conditions</th></tr></thead><tbody>${records.slice(0,6).map(({row,observed,amount,url,unit,state})=>{
  const member=helpers.cadAmount(row.member_price_cad);
  const status=state==='unconfirmed'?'Latest check unconfirmed; last successful reading shown.':state==='old'?'Older observation; recheck before shopping.':'Recent at publication; verify before shopping.';
  return `<tr><th scope="row"><a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(row.retailer)}</a></th><td>${cad.format(amount)}${member!==null?`<br>Member: ${cad.format(member)}`:''}</td><td>${unit?cad.format(unit.value)+' / '+escapeHtml(unit.unit):'Not available'}</td><td><time datetime="${new Date(observed).toISOString()}">${escapeHtml(date.format(observed))} ET</time></td><td>${escapeHtml(status)} ${escapeHtml(row.promotion_text||'')} ${member!==null?escapeHtml(row.member_promotion_text||'Membership required.'):''}<br>Retailer website only; branch price and stock unverified.</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
