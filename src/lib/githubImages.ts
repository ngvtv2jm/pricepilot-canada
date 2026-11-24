export const productImageBase='https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/';

// Keep old imported local URLs usable after image files leave the deployment.
export function githubProductImage(value:string):string {
 let path=value;
 if(/^https?:\/\//i.test(value)){
  try{const url=new URL(value);if(!['pricepine.ca','www.pricepine.ca','pricepilot-canada-0s3l.bolt.host'].includes(url.hostname))return value;path=url.pathname}catch{return value}
 }
 if(/^\/?catalog-images\/[a-zA-Z0-9_-]+\.webp$/.test(path)||/^\/?catalog-cache\/[a-f0-9]{64}\.webp$/.test(path))return productImageBase+path.replace(/^\//,'');
 return value;
}
