import './hydrate-catalog.mjs';
import {buildProductPages} from './product-pages.mjs';
import {buildTrustPages,trust,renderPage,escapeHtml} from './trust-pages.mjs';
import fs from 'node:fs';
import {socialImageFor,socialImageMarkup} from './social-cards.mjs';
import {loadEnv} from 'vite';
import {verificationMarkup,adsTxt} from './site-verification.mjs';
const siteEnv={...loadEnv('production',process.cwd(),''),...process.env};
const base=(siteEnv.VITE_SITE_URL||trust.seo.siteUrl).replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(base))throw Error('VITE_SITE_URL must be an HTTPS origin');
const paths=[...buildTrustPages(base),...await buildProductPages(base)];
fs.writeFileSync('public/robots.txt',`User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`);
fs.writeFileSync('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['',...paths].map(p=>`<url><loc>${escapeHtml(base+'/'+p.replace(/\.html$/,''))}</loc></url>`).join('')}</urlset>`);
fs.writeFileSync('public/404.html',renderPage({base,path:'404.html',title:'Page not found',description:'This PricePine page could not be found.',body:'<h1>Page not found</h1><p>The link may be outdated. <a href="/catalog.html">Browse the product directory</a> or <a href="/">return home</a>.</p>',noindex:true}));
// Update the actual entry document so metadata is available before JavaScript runs.
let index=fs.readFileSync('index.html','utf8');
index=index.replace(/<title>.*?<\/title>/s,'<title>'+escapeHtml(trust.seo.title)+'</title>');
for(const [attr,name,value] of [['name','description',trust.seo.description],['property','og:title',trust.seo.title],['property','og:description',trust.seo.description],['property','og:url',base+'/'],['name','twitter:title',trust.seo.title],['name','twitter:description',trust.seo.description]]){
 index=index.replace(new RegExp('<meta '+attr+'="'+name+'"[^>]*>'),'<meta '+attr+'="'+name+'" content="'+escapeHtml(value)+'"/>');
}
index=index.replace(/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+base+'/"/>');
index=index.replace(/<script type="application\/ld\+json">.*?<\/script>/s,'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'WebSite',name:trust.business.tradingName,description:trust.seo.description,inLanguage:'en-CA',url:base+'/'}).replace(/</g,'\\u003c')+'</script>');
index=index.replace(/<!-- site-verification:start -->[\s\S]*?<!-- site-verification:end -->/g,'');
const verificationEnv=base===trust.seo.siteUrl
 ? {...siteEnv,ADSENSE_VERIFICATION_ACCOUNT:siteEnv.ADSENSE_VERIFICATION_ACCOUNT||trust.seo.adsenseVerificationAccount}
 : siteEnv;
index=index.replace(/<meta (?:property="og:image(?::[^"]+)?"|name="twitter:image(?::[^"]+)?")[^>]*>/g,'');
index=index.replace('</head>',socialImageMarkup(socialImageFor(base,'index.html',trust.seo.socialImage),escapeHtml)+verificationMarkup(verificationEnv)+'</head>');
fs.writeFileSync('index.html',index);
// The approved PricePine seller record is independent of ad script delivery.
const sellerEnv=base===trust.seo.siteUrl&&trust.seo.adsensePublishSellerRecord
 ? {...siteEnv,ADSENSE_PUBLISHER_ID:trust.seo.adsenseVerificationAccount}
 : siteEnv;
const ads=adsTxt(sellerEnv);
fs.writeFileSync('public/ads.txt',ads);

