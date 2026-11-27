import fs from 'node:fs';

const cards = new Set(fs.readdirSync(new URL('../public/social/v1/', import.meta.url))
 .filter(name=>/^[a-z-]+\.png$/.test(name)).map(name=>name.slice(0,-4)));

export function socialImageFor(base,path,fallback){
 const key=/^categories\/([a-z-]+?)(?:-\d+)?\.html$/.exec(path)?.[1];
 if(cards.has(key))return {
  url:base+'/social/v1/'+key+'.png',type:'image/png',alt:'PricePine Canada grocery price comparison: '+key.replaceAll('-',' '),
 };
 return {url:base+fallback,type:'image/png',alt:'PricePine Canada: Compare Canadian grocery prices'};
}

export function socialImageMarkup({url,type,alt},escape){
 const props={'og:image':url,'og:image:secure_url':url,'og:image:type':type,'og:image:width':'1200','og:image:height':'630','og:image:alt':alt};
 const names={'twitter:image':url,'twitter:image:alt':alt};
 return [...Object.entries(props).map(([k,v])=>`<meta property="${k}" content="${escape(v)}">`),
  ...Object.entries(names).map(([k,v])=>`<meta name="${k}" content="${escape(v)}">`)].join('');
}
