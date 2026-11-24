import fs from 'node:fs';
const files=['catalog-snapshot.json','discovered-catalog.json','retailer-prices.json','comparison-prices.json','image-cache.json'];
const lean=fs.existsSync('.bolt-release.json');
const base='https://raw.githubusercontent.com/ngvtv2jm/pricepilot-canada/main/public/';
await Promise.all(files.map(async name=>{
 const target='public/'+name;if(!lean&&fs.existsSync(target))return;
 let problem;
 for(let attempt=0;attempt<3;attempt++)try{
  const response=await fetch(base+name,{signal:AbortSignal.timeout(20000),cache:'no-cache'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const text=await response.text();JSON.parse(text);fs.mkdirSync('public',{recursive:true});fs.writeFileSync(target,text);console.log('Loaded public catalog input: '+name);return;
 }catch(error){problem=error;if(attempt<2)await new Promise(resolve=>setTimeout(resolve,1000*(attempt+1)));}
 // A previously loaded public snapshot remains an acceptable fallback between
 // releases. Missing build inputs must fail clearly instead of producing 404s.
 if(fs.existsSync(target)){console.warn('Using saved catalog input after source failed: '+name);return;}
 throw Error('Cannot load '+name+': '+problem);
}));
