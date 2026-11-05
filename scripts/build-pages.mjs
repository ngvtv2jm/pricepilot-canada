import './restore-catalog-images.mjs';
import {buildProductPages} from './product-pages.mjs';
import {buildTrustPages,trust,renderPage,escapeHtml} from './trust-pages.mjs';
import fs from 'node:fs';
const base=(process.env.VITE_SITE_URL||trust.seo.siteUrl).replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base))throw Error('VITE_SITE_URL must be an HTTPS origin');
const paths=[...buildTrustPages(base),...await buildProductPages(base)];
fs.writeFileSync('public/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
fs.writeFileSync('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['',...paths].map(p=>`<url><loc>${escapeHtml(base+'/'+p)}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync('public/404.html',renderPage({base,path:'404.html',title:'Page not found',description:'This PricePine page could not be found.',body:'<h1>Page not found</h1><p>The link may be outdated. <a href="/catalog.html">Browse the product directory</a> or <a href="/">return home</a>.</p>',noindex:true}));
// Update the actual entry document so metadata is available before JavaScript runs.
let index=fs.readFileSync('index.html','utf8');
index=index.replace(/<title>.*?<\/title>/s,'<title>'+escapeHtml(trust.seo.title)+'</title>');
for(const [attr,name,value] of [['name','description',trust.seo.description],['property','og:title',trust.seo.title],['property','og:description',trust.seo.description],['property','og:url',base+'/'],['property','og:image',base+trust.seo.socialImage],['name','twitter:title',trust.seo.title],['name','twitter:description',trust.seo.description],['name','twitter:image',base+trust.seo.socialImage]]){
 index=index.replace(new RegExp('<meta '+attr+'="'+name+'"[^>]*>'),'<meta '+attr+'="'+name+'" content="'+escapeHtml(value)+'"/>');
}
index=index.replace(/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+base+'/"/>');
fs.writeFileSync('index.html',index);
