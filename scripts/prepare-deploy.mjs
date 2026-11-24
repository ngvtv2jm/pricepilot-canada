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
