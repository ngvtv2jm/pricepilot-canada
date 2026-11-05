import React,{useState,useEffect} from 'react';
import {Package} from 'lucide-react';
import {safeUrl} from './lib/domain';
import imageMap from './lib/catalogImages.json';
export default function ProductImage({src,alt,className='',loading='lazy'}:{src:string;alt:string;className?:string;loading?:'lazy'|'eager'}){
 const [attempt,setAttempt]=useState(0);useEffect(()=>setAttempt(0),[src]);
 const cached=(imageMap as Record<string,string>)[src];
 const candidates=[...(cached?[cached]:[]),...(safeUrl(src)?[safeUrl(src)]:[])];
 return attempt<candidates.length?<img src={candidates[attempt]} alt={alt} className={className} loading={loading} decoding="async" referrerPolicy="no-referrer" onError={()=>setAttempt(n=>n+1)}/>:<div className={'product-placeholder '+className} role="img" aria-label={alt+' — image unavailable'}><Package size={44}/><small>Image unavailable</small></div>;
}
