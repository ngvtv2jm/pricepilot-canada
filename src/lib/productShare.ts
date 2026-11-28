export function productSharePath(id:string,published:ReadonlySet<string>) {
 return /^[A-Za-z0-9-]+$/.test(id)&&published.has(id)?'/products/'+id:null;
}
