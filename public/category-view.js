for (const photo of document.querySelectorAll('[data-category-photo]')) {
 const art=photo.closest('[data-category-art]');
 const fallback=()=>{photo.hidden=true;art.classList.remove('category-photo-ready');art.querySelector('[data-category-caption]').hidden=true;};
 const loaded=()=>{if(photo.naturalWidth)art.classList.add('category-photo-ready');else fallback();};
 photo.addEventListener('load',loaded,{once:true});
 photo.addEventListener('error',fallback,{once:true});
 if(photo.complete)loaded();
}
