// Navigable fallback for legacy bookmarks served as HTML by static hosts.
// Known legacy hostname only; don't transfer an account callback to another origin.
(() => {
 const loc = window.location;
 const oldHost = 'pricepilot-canada-0s3l.bolt.host';
 const canonical = 'https://pricepine.ca';
 const original = loc.pathname;
 const isCanonicalPage = /^\/(?:[a-z0-9-]+|(?:products|brands|categories)\/[a-z0-9-]+)\/?$/i;
 if (/\/404(?:\.html)?$/i.test(original) || !(original==='/' || isCanonicalPage.test(original) ||
     (/\.html$/i.test(original) && isCanonicalPage.test(original.slice(0,-5))))) return;
 const path = original.replace(/\/index\.html$/i,'/').replace(/\.html$/i,'').replace(/\/$/,'') || '/';
 const target = path + loc.search + loc.hash;
 if (loc.hostname===oldHost) {
  const credential = /^(?:access_token|refresh_token|provider_token|provider_refresh_token|token|token_hash|token_type|code|state|error|error_description|error_code|type|session|session_id|password|api_key|key)$/i;
  const hasCredential = [loc.search,loc.hash].some(raw => {
   const params = new URLSearchParams(raw.replace(/^[?#]/,''));
   return [...params.keys()].some(key=>credential.test(key));
  });
  if(!hasCredential) loc.replace(canonical + target);
 } else if (original!==path) {
  try { history.replaceState(history.state,'',target); } catch {}
 }
})();
