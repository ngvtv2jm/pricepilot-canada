import fs from 'node:fs';

const cards = new Set(fs.readdirSync(new URL('../public/social/v1/', import.meta.url))
 .filter(name=>/^[a-z-]+\.png$/.test(name)).map(name=>name.slice(0,-4)));

const cachedProductPhoto=/^https:\/\/raw\.githubusercontent\.com\/ngvtv2jm\/pricepilot-canada\/main\/public\/(?:catalog-cache\/[a-f0-9]{64}|catalog-images\/[A-Za-z0-9_-]+)\.webp$/;
export function socialImageFor(base,path,fallback,{image,title}={}){
 const productId=/^products\/([A-Za-z0-9-]+)\.html$/.exec(path)?.[1];
 const productCard=productId?'/social/products/v1/'+productId+'.jpg':null;
 if(productCard&&fs.existsSync(new URL('../public'+productCard,import.meta.url)))return {
  url:base+productCard,type:'image/jpeg',alt:title||'PricePine product photo',width:1200,height:630,
 };
 if(productId&&cachedProductPhoto.test(image||''))return {
  url:image,type:'image/webp',alt:title||'PricePine product photo',card:'summary',
 };

 const key=/^categories\/([a-z-]+?)(?:-\d+)?\.html$/.exec(path)?.[1];
 if(cards.has(key))return {
  url:base+'/social/v1/'+key+'.png',type:'image/png',alt:'PricePine Canada grocery price comparison: '+key.replaceAll('-',' '),width:1200,height:630,
 };
 return {url:base+fallback,type:'image/png',alt:'PricePine Canada: Compare Canadian grocery prices',width:1200,height:630};
}

export function socialImageMarkup({url,type,alt,width,height},escape){
 const props={'og:image':url,'og:image:secure_url':url,'og:image:type':type,'og:image:alt':alt};
 if(width&&height){props['og:image:width']=width;props['og:image:height']=height;}
 const names={'twitter:image':url,'twitter:image:alt':alt};
 return [...Object.entries(props).map(([k,v])=>`<meta property="${k}" content="${escape(v)}">`),
  ...Object.entries(names).map(([k,v])=>`<meta name="${k}" content="${escape(v)}">`)].join('');
}
