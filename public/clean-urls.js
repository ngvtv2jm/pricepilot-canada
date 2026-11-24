// Keep legacy bookmarks usable on hosts that do not apply _redirects rules.
// The complete page remains available; only its visible legacy address changes.
(()=>{const path=window.location.pathname;if(!/\.html$/i.test(path)||/\/404\.html$/i.test(path))return;const clean=path.replace(/\/index\.html$/i,'/').replace(/\.html$/i,'');try{history.replaceState(history.state,'',clean+window.location.search+window.location.hash)}catch{}})();
