import importlib.util, pathlib, unittest
spec=importlib.util.spec_from_file_location('refresh', pathlib.Path(__file__).with_name('refresh-prices.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Matching(unittest.TestCase):
 def setUp(self):
  self.row={'retailer':'No Frills','retailer_sku':'123_EA','name':'Milk','brand':'Brand','package_size':'1 l','price_cad':5,'observed_at':'2026-01-01T00:00:00Z'}
  self.p={'productId':'123_EA','title':'Milk','brand':'Brand','packageSizing':'1 l','link':'/en/milk/p/123_EA','pricing':{'price':'$3.00'}}
 def test_verified_change(self):
  r=m.update_row(self.row,self.p,'2026-02-01T00:00:00Z');self.assertEqual(r['price_cad'],3);self.assertEqual(r['check_status'],'verified');self.assertIsNone(r['member_price_cad'])
 def test_wrong_package(self):
  self.p['packageSizing']='2 l'
  with self.assertRaises(ValueError):m.update_row(self.row,self.p,'now')
 def test_wrong_sku(self):
  self.p['productId']='124_EA'
  with self.assertRaises(ValueError):m.update_row(self.row,self.p,'now')
 def test_missing_price(self):
  self.p['pricing']['price']=None
  with self.assertRaises(ValueError):m.update_row(self.row,self.p,'now')
 def test_reject_external_link(self):
  self.p['link']='https://example.com/en/milk/p/123_EA'
  with self.assertRaises(ValueError):m.update_row(self.row,self.p,'now')
unittest.main()
