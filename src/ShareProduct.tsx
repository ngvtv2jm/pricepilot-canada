import React,{useState} from 'react';
import {productSharePath} from './lib/productShare';
export default function ShareProduct({id,published}:{id:string;published:ReadonlySet<string>}){
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState(false);
 const path=productSharePath(id,published);
 if(!path)return null;
 const url=location.origin+path;
 async function copy(){
  try{await navigator.clipboard.writeText(url);setFallback(false);setStatus('Product link copied.');}
  catch{setFallback(true);setStatus('Select and copy the product link below.');}
 }
 return <div className="product-share">
  <button type="button" className="secondary" onClick={copy}>Share product</button>
  <span role="status" aria-live="polite"> {status}</span>
  {fallback&&<label>Product link<input value={url} readOnly onFocus={e=>e.target.select()}/></label>}
 </div>;
}
