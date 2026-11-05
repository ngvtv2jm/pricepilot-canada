import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const db=url&&key?createClient(url,key):null;
export function database(){if(!db)throw new Error('Account and catalog services are not configured yet. Your device shopping list still works.');return db;}
export function check<T>(result:{data:T;error:any}):T{if(result.error)throw new Error(result.error.message);return result.data;}
// Stable pages prevent the server's default row limit from silently truncating a catalog.
export async function rows(table:string,select='*'){
 const all:any[]=[];const pageSize=500;
 for(let offset=0;offset<50000;offset+=pageSize){const page=check(await database().from(table).select(select).order('id').range(offset,offset+pageSize-1))||[];all.push(...page);if(page.length<pageSize)return all;}
 throw Error('This catalog is too large for this view. Narrow server-side catalog loading is required; no partial comparison was displayed.');
}
