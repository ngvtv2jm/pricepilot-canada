import React,{useEffect,useRef,useState} from 'react';
import type {Row} from './lib/domain';
export const PAGE_SIZE=24;
export default function InfiniteProducts({products,resetKey,children}:{products:Row[];resetKey:string;children:(product:Row)=>React.ReactNode}){
 const [count,setCount]=useState(PAGE_SIZE);const [loading,setLoading]=useState(false);const marker=useRef<HTMLDivElement>(null);const timer=useRef<ReturnType<typeof setTimeout>>();const pending=useRef(false);
 useEffect(()=>{clearTimeout(timer.current);pending.current=false;setLoading(false);setCount(PAGE_SIZE)},[resetKey]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const more=count<products.length;
 function next(){if(pending.current||!more)return;pending.current=true;setLoading(true);timer.current=setTimeout(()=>{setCount(n=>Math.min(n+PAGE_SIZE,products.length));setLoading(false);pending.current=false},150)}
 useEffect(()=>{if(!more||!marker.current||typeof IntersectionObserver==='undefined')return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))next()},{rootMargin:'350px'});observer.observe(marker.current);return()=>observer.disconnect()},[count,products.length,resetKey]);
 return <><div className="product-grid">{products.slice(0,count).map(p=><React.Fragment key={p.id}>{children(p)}</React.Fragment>)}</div><div ref={marker} className="catalog-load-more" aria-live="polite"><p>Showing {Math.min(count,products.length)} of {products.length} products</p>{more&&<button className="secondary" disabled={loading} onClick={next}>{loading?<><span className="loading-spinner" aria-hidden="true"/> Loading more products…</>:'Load more products'}</button>}{!more&&products.length>PAGE_SIZE&&<p>You’ve reached the end of these results.</p>}</div></>
}
