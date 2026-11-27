import {escapeHtml as e,httpsUrl} from './trust-pages.mjs';
import {packageMeasure} from './render-observations.mjs';

const currency=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'});
const unitCurrency=new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:4});
const date=new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'America/Toronto'});
const clean=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ');
const sellerKey=value=>clean(value).toLowerCase();
const packageKey=value=>clean(value).toLowerCase().replace(/\s+/g,'');
const unusableLabel=/^(?:default|one size|unknown|various|assorted|standard|n\/?a|[-–—]+)$/i;

export function selectCategoryComparisons(products,{variantsByProduct,observations,helpers,publishTime=Date.now()}={},limit=3){
 if(!variantsByProduct||!observations||!helpers)return [];
 const groups=[];
 for(const product of products)for(const variant of variantsByProduct.get(product.id)||[]){
  const packages=new Map();
  for(const row of observations.get(variant.id)||[]){
   const retailer=clean(row.retailer),label=clean(row.package_size);
   const amount=helpers.cadAmount(row.price_cad),observed=Date.parse(row.observed_at),url=httpsUrl(row.product_url);
   if(row.variant_id!==variant.id||(row.product_id&&row.product_id!==product.id)||row.currency!=='CAD'||row.check_status!=='verified'||!retailer||!label||unusableLabel.test(label)||!url||amount==null||amount<=0||!Number.isFinite(observed)||observed>publishTime)continue;
   const state=helpers.websiteState(row,publishTime);
   if(state!=='current'&&state!=='old')continue;
   const key=packageKey(label);
   const pack=packages.get(key)||new Map();
   const prior=pack.get(sellerKey(retailer));
   if(!prior||observed>prior.observed){
    const measure=packageMeasure(variant,label.replace(/^(\d+(?:\.\d+)?)\s*ea$/i,'$1 each'));
    const unit=measure&&helpers.unitPrice?.(amount,measure.quantity,measure.unit);
    pack.set(sellerKey(retailer),{retailer,label,amount,observed,url,state,unit,condition:clean(row.promotion_text)});
   }
   packages.set(key,pack);
  }
  for(const retailers of packages.values()){
   const rows=[...retailers.values()].sort((a,b)=>Number(b.state==='current')-Number(a.state==='current')||a.retailer.localeCompare(b.retailer));
   const fresh=rows.filter(r=>r.state==='current').length;
   groups.push({product,rows,fresh,newest:Math.max(...rows.map(r=>r.observed))});
  }
 }
 function priority(g){return g.fresh>=2?4:g.rows.length>=2?3:g.fresh===1?2:1;}
 const used=new Set();
 const sorted=groups.sort((a,b)=>priority(b)-priority(a)||b.fresh-a.fresh||b.rows.length-a.rows.length||b.newest-a.newest||a.product.name.localeCompare(b.product.name)||a.product.id.localeCompare(b.product.id));
 const selected=[];
 for(const group of sorted){
  if(used.has(group.product.id))continue;
  used.add(group.product.id);selected.push(group);
  if(selected.length>=limit)break;
 }
 return selected;
}

export function renderCategoryComparison(products,options,productPath){
 const groups=selectCategoryComparisons(products,options);
 const body=groups.length?groups.map(({product,rows})=>{
  const brand=clean(product.brand_name),name=clean(product.name);
  const exact=(brand&&!name.toLowerCase().includes(brand.toLowerCase())?brand+' ':'')+name;
  return `<article class="category-comparison-product"><h3><a href="${e(productPath(product.id))}">${e(exact)}</a></h3>
   <p>Package: ${e(rows[0].label)}${rows.length===1?' · Only one verified retailer observation':''}</p>
   <ul class="category-price-grid">${rows.map(({retailer,amount,observed,url,state,unit,condition})=>`<li class="category-price" data-price-age="${state==='old'?'historical':'recent'}"><strong>${e(retailer)}</strong><dl><div><dt>Package price</dt><dd>${e(currency.format(amount))} CAD</dd></div>${unit?`<div><dt>Unit price</dt><dd>${e(unitCurrency.format(unit.value))} / ${e(unit.unit)}</dd></div>`:''}<div><dt>Observed</dt><dd><time datetime="${new Date(observed).toISOString()}">${e(date.format(observed))} ET</time></dd></div></dl>${state==='old'?'<p class="category-price-history">Historical observation, not a current price.</p>':''}${condition?`<p>${e(condition)}</p>`:''}<a href="${e(url)}" rel="noopener noreferrer">View retailer source</a></li>`).join('')}</ul></article>`;
 }).join(''):'<p class="category-price-empty">No verified online prices with a confirmed package size are available for these listings yet. You can still browse the products below.</p>';
 return `<section class="category-section category-comparison" id="matching-packages" aria-labelledby="matching-packages-heading"><h2 id="matching-packages-heading">Compare matching packages</h2><p>Each group is one product and package size. These are dated online prices, not guarantees of local price or stock. Check the retailer before shopping.</p>${body}</section>`;
}
