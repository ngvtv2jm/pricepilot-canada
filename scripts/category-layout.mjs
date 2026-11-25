import {escapeHtml as e} from './trust-pages.mjs';
const icons={bread:'🥖',butter:'🧈',candy:'🍫',cereal:'🥣',cheese:'🧀',chips:'🥔',coffee:'☕',cookies:'🍪',eggs:'🥚',fish:'🐟',flour:'🌾','frozen-desserts':'🍨',juice:'🧃',meat:'🍗',milk:'🥛','nut-spreads':'🥜',paper:'🧻',pasta:'🍝',rice:'🍚',sauce:'🍅',soup:'🍲',tea:'🍵',water:'💧',yogurt:'🥄','soft-drinks':'🥤',cleaning:'🫧',bars:'🌾'};
const assets='<link rel="stylesheet" href="/category-view.css"><script src="/category-view.js" defer></script>';
export function categoryArt(key,feature,productPath){
 return `<figure class="category-art" data-category-art>
  <div class="category-plate"><img class="category-fallback" src="/category-fallback.svg" width="600" height="420" alt=""><span class="category-icon" aria-hidden="true">${icons[key]||'🛒'}</span>
  ${feature?`<img class="category-photo" data-category-photo src="${e(feature.image)}" width="340" height="290" fetchpriority="high" referrerpolicy="no-referrer" alt="${e(feature.product.name)}">`:''}</div>
  ${feature?`<figcaption data-category-caption><span>FEATURED FROM THE CATALOGUE</span><a href="${productPath(feature.product.id)}">${e(feature.product.name)} <span aria-hidden="true">↗</span></a></figcaption>`:''}</figure>`;
}
function hero({key,title,intro,stats,actions,feature,productPath,headingContent=''}){
 return `<section class="category-hero"><div class="category-copy"><p class="category-kicker">PRICEPINE / GROCERY AISLES</p><h1>${e(title)}</h1>${headingContent}<p class="category-intro">${e(intro)}</p><p class="category-stats">${e(stats)}</p><div class="category-actions">${actions}</div></div>${categoryArt(key,feature,productPath)}</section>`;
}
function trail(label){
 return `<nav class="category-trail" aria-label="Category breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span>${label?`<a href="/categories">Product types</a><span aria-hidden="true">›</span><span aria-current="page">${e(label)}</span>`:'<span aria-current="page">Product types</span>'}</nav>`;
}
export function categoryIndex(visible,feature,productPath){
 return `${assets}<div class="category-view">${trail()}${hero({key:'index',title:'Browse grocery categories',intro:'Start with an aisle, choose the right package, and open the product to see dated retailer prices.',stats:`${visible.length} grocery categories`,actions:'<a class="category-primary" href="#aisles">Explore the aisles ↓</a><a href="/catalog">Full product directory</a>',feature,productPath})}<section id="aisles" class="category-section" aria-labelledby="category-aisles"><h2 id="category-aisles">Shop by product type</h2><ul class="category-grid">${visible.map(([key,g])=>`<li><a class="category-tile" href="/categories/${key}"><span class="category-tile-icon" aria-hidden="true">${icons[key]||'🛒'}</span><span><strong>${e(g.label)}</strong><small>${g.items.length} products</small></span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul></section></div>`;
}
export function categoryPage({key,g,i,count,guide,guideBody,comparisonBody,headingContent='',pageItems,feature,productPath,related}){
 const route=n=>'/categories/'+key+(n?'-'+(n+1):'');
 const label=g.label+(i?' · Page '+(i+1):'');
 const title=(guide?.title||g.label)+(i?' — page '+(i+1):'');
 const actions=(comparisonBody?'<a class="category-primary" href="#matching-packages">Compare matching packages ↓</a>':'<a class="category-primary" href="#category-products">Browse products ↓</a>')+'<a href="/categories">All categories</a>';
 return `${assets}${headingContent?'<link rel="stylesheet" href="/egg-comparison.css">':''}<div class="category-view">${trail(label)}${hero({key,title,intro:'Choose an exact product and package size to see dated retailer website prices and unit prices where available.',stats:`Showing ${i*100+1}–${i*100+pageItems.length} of ${g.items.length} products · Page ${i+1} of ${count}`,actions,feature,productPath,headingContent})}${comparisonBody}${guideBody}<section class="category-section" id="category-products" aria-labelledby="products-in-category"><h2 id="products-in-category">Products in ${e(g.label)}</h2><ul class="category-grid">${pageItems.map(p=>`<li><a class="category-tile product-tile" href="${productPath(p.id)}"><span><strong>${e(p.name)}</strong>${p.brand_name?`<small>${e(p.brand_name)}</small>`:''}<small>Product details &amp; prices</small></span><span aria-hidden="true">↗</span></a></li>`).join('')}</ul>${count>1?`<nav class="category-pages" aria-label="Product pages">${i?'<a href="'+route(i-1)+'">← Previous</a>':''}${Array.from({length:count},(_,n)=>`<a href="${route(n)}" ${i===n?'aria-current="page"':''}>Page ${n+1}</a>`).join('')}${i<count-1?'<a href="'+route(i+1)+'">Next →</a>':''}</nav>`:''}</section><nav class="category-related" aria-label="Continue browsing"><a href="/categories">← All categories</a>${related.map(([k,name])=>`<a href="/categories/${k}">${e(name)}</a>`).join('')}<a href="/catalog">Full product directory →</a></nav></div>`;
}
