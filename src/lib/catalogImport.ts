export const OFF_ENDPOINT='https://world.openfoodfacts.org/api/v3/product/';
export type ImportProduct={code:string;name:string;brand:string;description:string;quantity:number|null;unit:string|null;package_name:string;image_url:string|null;countries:string[]};
export function parseBarcodes(value:string){const codes=[...new Set(value.split(/[\s,;]+/).filter(Boolean))];if(!codes.length||codes.length>10||codes.some(c=>!/^\d{8,14}$/.test(c)))throw Error('Enter 1–10 barcodes, each 8–14 digits, separated by spaces or commas.');return codes}
export function normalizeOFF(raw:any,code:string,language='en'):ImportProduct{
 const p=raw?.product;if(!p||typeof p!=='object')throw Error('Product not found for '+code);
 const str=(v:unknown,max=1000)=>typeof v==='string'?v.trim().slice(0,max):'';
 const name=str(p['product_name_'+language]||p.product_name,300);if(!name)throw Error('Product '+code+' has no usable name.');
 const pack=str(p.quantity,100),match=pack.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l)$/i);
 const quantity=match?Number(match[1].replace(',','.')):null;
 const image=str(p.image_front_url,1000);
 return {code,name,brand:str(p.brands,200),description:str(p['generic_name_'+language]||p.generic_name,2000),quantity:quantity&&quantity>0?quantity:null,unit:match?match[2].toLowerCase():null,package_name:pack||'Package size not supplied',image_url:/^https:\/\/images\.openfoodfacts\.org\//.test(image)?image:null,countries:Array.isArray(p.countries_tags)?p.countries_tags.filter((x:unknown)=>typeof x==='string'):[]};
}
export function offURL(code:string,language:string){if(!/^\d{8,14}$/.test(code))throw Error('Invalid barcode');const url=new URL(OFF_ENDPOINT+code);url.searchParams.set('fields','code,product_name,product_name_en,product_name_fr,generic_name,generic_name_en,generic_name_fr,brands,quantity,image_front_url,countries_tags');url.searchParams.set('lc',language==='fr'?'fr':'en');url.searchParams.set('User-Agent','PricePilotCanada/1.0 (https://pricepilot-canada-0s3l.bolt.host/)');return url.toString()}
