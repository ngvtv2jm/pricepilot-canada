"""Prepare a generated Bolt source branch; GitHub main retains all catalog images."""
import json,pathlib,shutil,subprocess
ROOT=pathlib.Path(__file__).resolve().parents[1]
for relative in ['assets','public/catalog-cache','public/catalog-images','public/products','public/categories','public/brands','public/product-descriptions']:
 path=ROOT/relative
 if path.is_dir():shutil.rmtree(path)
for path in (ROOT/'public').glob('*.html'):path.unlink()
for name in ['catalog-snapshot.json','discovered-catalog.json','retailer-prices.json','comparison-prices.json','image-cache.json','product-page-ids.json','product-descriptions.json','description-status.json']:
 (ROOT/'public'/name).unlink(missing_ok=True)
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
(ROOT/'.bolt-release.json').write_text(json.dumps({'generated':True,'source_commit':sha,'catalog_and_images':'GitHub main','note':'Generated branch. Make source edits on main.'},indent=2)+'\n')
