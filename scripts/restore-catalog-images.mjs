import fs from 'node:fs';
import path from 'node:path';
// Keep source assets separate from the client bundle; publish ordinary WEBP files.
const source = new URL('../assets/catalog-batch-002/', import.meta.url);
const root = new URL('../', import.meta.url);
let count = 0;
for (const file of fs.readdirSync(source).filter(name => name.endsWith('.json'))) {
  for (const entry of JSON.parse(fs.readFileSync(new URL(file, source), 'utf8'))) {
    if (!/^public\/catalog-images\/[0-9]+_EA\.webp$/.test(entry.path)) throw Error('Invalid catalog asset path');
    const bytes = Buffer.from(entry.content, 'base64');
    if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') throw Error('Invalid WEBP asset');
    const target = new URL(entry.path, root);
    fs.mkdirSync(path.dirname(target.pathname), {recursive: true});
    fs.writeFileSync(target, bytes);
    count++;
  }
}
if (count !== 500) throw Error(`Expected 500 batch images, found ${count}`);
console.log(`Restored ${count} catalog images`);
