// Server/operator tool only. Never bundle this file or a service-role key into the app.
import fs from 'node:fs';import {createClient} from '@supabase/supabase-js';
const args=process.argv.slice(2);const file=args.find(x=>!x.startsWith('--'));
if(!file)throw Error('Usage: node scripts/import-offers.mjs batch.json [--apply]');
const batch=JSON.parse(fs.readFileSync(file,'utf8'));
if(!/^[0-9a-f-]{36}$/i.test(batch.source_id)||!Array.isArray(batch.offers)||!batch.offers.length||batch.offers.length>1000)throw Error('Expected source_id and 1–1000 normalized offers.');
for(const row of batch.offers){if(!row.external_id||!row.store_id||row.currency!=='CAD'||!Number.isFinite(Date.parse(row.observed_at)))throw Error('Every offer needs external_id, store_id, CAD currency and observed_at.');}
if(!args.includes('--apply')){console.log('Validated '+batch.offers.length+' normalized records. No network request made. Use --apply only after source authorization and matching are configured.');process.exit(0);}
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Server-side database credentials required.');
const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await db.rpc('ingest_offer_batch',{p_source:batch.source_id,p_rows:batch.offers});
if(error)throw Error('Batch rejected; no offers committed: '+error.message);
console.log('Committed import job '+data);
