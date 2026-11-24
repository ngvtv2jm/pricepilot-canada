import React,{useMemo} from 'react';
import type {Row} from './lib/domain';
import {seoIndex,relatedProducts,productPath} from './lib/productSeo';
import ProductImage from './ProductImage';
export default function RelatedProducts({product,catalog,published,onOpen}:{product:Row;catalog:Record<string,Row[]>;published:Set<string>;onOpen:(id:string)=>void}){
 const products=useMemo<Row[]>(()=>(catalog.products||[]).map((p:Row)=>({...p,brand_name:catalog.brands?.find(b=>b.id===p.brand_id)?.name})),[catalog]);
 const index=useMemo(()=>seoIndex(products),[products]);
 const current=products.find(p=>p.id===product.id)||product;
 const related=relatedProducts(current,index);
 if(!related.length)return null;
 return <section className="related-products" aria-labelledby="related-heading"><span className="overline">KEEP EXPLORING</span><h2 id="related-heading">Related products</h2><p>Browse similar products and package sizes. Check each product’s details before comparing.</p><div className="product-grid">{related.map(p=><article className="product-card" key={p.id}><a href={published.has(p.id)?productPath(p.id):'/#product/'+p.id} onClick={e=>{if(e.button===0&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onOpen(p.id)}}}><ProductImage src={p.image_url||catalog.product_images?.find(i=>i.product_id===p.id)?.url||''} alt={p.name} fallbacks={p.image_fallbacks}/><small>{p.brand_name}</small><h3>{p.name}</h3><p>{(catalog.product_variants||[]).filter(v=>v.product_id===p.id).map(v=>v.name).join(' · ')}</p></a></article>)}</div><p><a href="/catalog/">Browse all grocery products</a></p></section>;
}
