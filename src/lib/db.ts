import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const db=url&&key?createClient(url,key):null;
export function database(){if(!db)throw new Error('Account and catalog services are not configured yet. Your device shopping list still works.');return db;}
export function check<T>(result:{data:T;error:any}):T{if(result.error)throw new Error(result.error.message);return result.data;}
export async function rows(table:string,select='*'){return check(await database().from(table).select(select).limit(1000))||[];}
