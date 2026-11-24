import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateRawSync} from 'node:zlib';

export function prepareDeployment(root){
 const dist=path.join(root,'dist');
 if(!fs.existsSync(path.join(dist,'index.html')))throw Error('Build output is missing');
 // These are copies in dist only. The original public/ files stay on GitHub,
 // where the daily cache job continues to add and repair product images.
 for(const dir of ['catalog-cache','catalog-images'])fs.rmSync(path.join(dist,dir),{recursive:true,force:true});
 // Bolt serves clean URLs from these HTML files. Preserve one canonical document
 // per route; only hubs with children need their directory entry duplicated.
 for(const hub of ['categories','brands']){const file=path.join(dist,hub+'.html');if(fs.existsSync(file)){fs.mkdirSync(path.join(dist,hub),{recursive:true});fs.copyFileSync(file,path.join(dist,hub,'index.html'));}}
 // Bolt treated the previous /:page.html pattern as a whole segment and sent
 // unknown requests to a literal /:page. Emit only exact known old URLs.
 const aliases=[];
 function collectAliases(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name);
   if(entry.isDirectory()){
    if(dir===dist&&['products','categories','brands'].includes(entry.name)) collectAliases(file);
    continue;
   }
   const route=path.relative(dist,file).split(path.sep).join('/');
   if(!/^(?:[a-z0-9-]+\/)?[a-z0-9-]+\.html$/.test(route)||route==='404.html')continue;
   if(route==='index.html'){
    aliases.push('/index.html / 301!');
   }else if(!route.endsWith('/index.html')){
    aliases.push('/'+route+' /'+route.slice(0,-5)+' 301!');
   }
  }
 }
 collectAliases(dist);
 // No catch-all: missing pages must remain actual 404 responses with 404.html.
 fs.writeFileSync(path.join(dist,'_redirects'),aliases.sort().join('\n')+'\n');
 let rawBytes=0,zipBytes=22,files=0;
 function inspect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){inspect(file);continue;}
  const bytes=fs.readFileSync(file),name=path.relative(dist,file).replaceAll(path.sep,'/');
  rawBytes+=bytes.length;zipBytes+=deflateRawSync(bytes).length+76+2*Buffer.byteLength(name);files++;
 }}
 inspect(dist);
 // Headroom below Bolt's 100 MB ZIP limit. Fail future builds before publishing
 // if catalog growth would make the deployment too large again.
 if(zipBytes>90_000_000)throw Error(`Deployment ZIP estimate ${(zipBytes/1e6).toFixed(1)} MB exceeds the 90 MB budget`);
 const report={files,rawBytes,zipBytes};
 console.log(`Deployment: ${files} files, ${(rawBytes/1e6).toFixed(1)} MB unpacked, ${(zipBytes/1e6).toFixed(1)} MB ZIP estimate. Product images remain on GitHub.`);
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepareDeployment(fileURLToPath(new URL('../',import.meta.url)));
