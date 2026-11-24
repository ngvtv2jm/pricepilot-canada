const tidy=value=>String(value??'').trim().replace(/\s+/g,' ');
const identity=value=>tidy(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const packagePattern=/^(?:\d+\s*[x×]\s*)?\d+(?:\.\d+)?\s*-?\s*(?:g|kg|mL|L|each|ct|count|oz|lb|pack)\.?$/i;
export function productMetadata(product,brand,variants,hasObservations){
 const rawName=tidy(product.name);
 const nameKey=identity(rawName), brandKey=identity(brand);
 const name=brandKey&&!((' '+nameKey+' ').includes(' '+brandKey+' '))?tidy(brand)+' '+rawName:rawName;
 const label=variants.length===1?tidy(variants[0].name):'';
 const exactPackage=packagePattern.test(label)?label:'';
 const hasPackage=exactPackage&&identity(exactPackage).replace(/ /g,'')===identity(name).replace(/ /g,'').slice(-identity(exactPackage).replace(/ /g,'').length);
 const title=name+(exactPackage&&!hasPackage?' ('+exactPackage+')':'');
 const description=(title+'. '+(hasObservations?'View dated Canadian retailer prices and package details. Check price and stock before shopping.':'View package details. No retailer price observations are currently shown.')).slice(0,300);
 return {title,description};
}
