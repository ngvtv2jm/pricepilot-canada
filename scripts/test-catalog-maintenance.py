import importlib.util,io,pathlib,unittest
from PIL import Image
ROOT=pathlib.Path(__file__).parent
def module(name,file):
 s=importlib.util.spec_from_file_location(name,ROOT/file);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
m=module('matcher','find-store-prices.py');c=module('cache','cache-product-images.py')
r={'name':'Chocolate Milk','brand':'Neilson','package_size':'2 l','retailer':'No Frills','retailer_sku':'20187292_EA','price_cad':4.79,'observed_at':'2026-01-01T00:00:00Z'}
p={'id':'test','name':'Chocolate Milk','brand':'Neilson','package_size':'2 l','observations':[r]}
class Maintenance(unittest.TestCase):
 def test_shared_sku(self):self.assertTrue(m.exact_match(p,{**r,'retailer':'Loblaws'}))
 def test_size_and_flavour(self):
  self.assertFalse(m.exact_match(p,{**r,'package_size':'1 l'}));self.assertFalse(m.exact_match(p,{**r,'name':'Lactose Free Chocolate Milk'}));self.assertFalse(m.exact_match(p,{**r,'retailer_sku':'OTHER'}))
 def test_brand_in_title(self):
  gt={'name':'Twizzlers Twists Candy Strawberry, 454 g','brand':'','package_size':'454 g','observations':[{'retailer':'Giant Tiger'}]}
  target={**r,'brand':'Twizzlers','name':'Strawberry Candy Twists','package_size':'454 g'}
  self.assertTrue(m.exact_match(gt,target));self.assertFalse(m.exact_match(gt,{**target,'name':'Cherry Candy Twists'}));self.assertFalse(m.exact_match(gt,{**target,'package_size':'2 x 454 g'}))
 def test_conflicts(self):
  rows,added,review=m.attach([p],[r,{**r,'price_cad':9}],[]);self.assertEqual(rows,[]);self.assertEqual(review,1)
 def test_image_decode(self):
  b=io.BytesIO();Image.new('RGB',(1200,1000),'red').save(b,'JPEG');converted=c.webp(b.getvalue());im=Image.open(io.BytesIO(converted));self.assertEqual(im.format,'WEBP');self.assertLessEqual(max(im.size),800)
 def test_invalid_image(self):
  with self.assertRaises(Exception):c.webp(b'<html>Access denied</html>')
 def test_runtime_budget_defers_without_request(self):
  original=m.DEADLINE
  try:
   m.DEADLINE=0
   rows,status=m.search(('Loblaws','Unattempted product'));self.assertEqual(rows,[]);self.assertEqual(status['status'],'deferred')
  finally:m.DEADLINE=original
 def test_hosts(self):
  self.assertTrue(c.valid_url('https://digital.loblaws.ca/PCX/image.png'));self.assertFalse(c.valid_url('http://127.0.0.1/a'));self.assertFalse(c.valid_url('https://digital.loblaws.ca.evil.test/a'))
if __name__=='__main__':unittest.main()
