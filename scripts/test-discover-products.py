import copy, importlib.util, pathlib, unittest
spec=importlib.util.spec_from_file_location('discovery',pathlib.Path(__file__).with_name('discover-products.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def row(**kw):return dict(name='Beans',brand='Brand',package_size='500 g',retailer='No Frills',retailer_sku='123_EA',currency='CAD',price_cad=2,product_url='https://www.nofrills.ca/en/beans/p/123_EA',**kw)
class Discovery(unittest.TestCase):
 def test_idempotent(self):
  a,s=m.merge([], [row()],[]);b,t=m.merge(copy.deepcopy(a),[row()],[])
  self.assertEqual(s['added'],1);self.assertEqual(t['added'],0);self.assertEqual(len(b),1);self.assertEqual(len(b[0]['observations']),1)
 def test_shared_sku_adds_store_not_product(self):
  a=row();b={**a,'retailer':'Loblaws','product_url':'https://www.loblaws.ca/en/beans/p/123_EA'}
  p,s=m.merge([],[a,b],[]);self.assertEqual(len(p),1);self.assertEqual(len(p[0]['observations']),2)
 def test_variant_change_quarantined(self):
  p,_=m.merge([],[row()],[]);q,s=m.merge(copy.deepcopy(p),[{**row(),'package_size':'1 kg'}],[])
  self.assertEqual(s['conflicts_skipped'],1);self.assertEqual(q[0]['package_size'],'500 g')
 def test_conflicting_prices_skip(self):
  p,s=m.merge([],[row(),{**row(),'price_cad':3}],[]);self.assertEqual(p,[]);self.assertEqual(s['conflicts_skipped'],1)
 def test_no_cross_store_sku_collision(self):
  p,s=m.merge([],[row(),{**row(),'brand':'Other','retailer':'Giant Tiger','product_url':'https://www.gianttiger.com/products/beans'}],[]);self.assertEqual(len(p),2)
 def test_bad_data(self):
  self.assertTrue(m.valid_row(row()));self.assertFalse(m.valid_row({**row(),'price_cad':float('nan')}));self.assertFalse(m.valid_row({**row(),'product_url':'https://evil.example/en/beans/p/123_EA'}))
 def test_limit(self):
  p,s=m.merge([], [{**row(),'retailer_sku':str(i)+'_EA','name':'Beans '+str(i)} for i in range(20)],[],max_new=3);self.assertEqual(s['added'],3)
 def test_exact_package(self):
  self.assertNotEqual(m.fingerprint(row()),m.fingerprint({**row(),'package_size':'2 x 250 g'}))
 def test_baseline_not_counted_new(self):
  p,s=m.merge([],[row()],[row()]);self.assertEqual(s['added'],0);self.assertEqual(len(p),1)
if __name__=='__main__':unittest.main()
