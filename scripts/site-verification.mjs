// Public ownership identifiers only. Never accept HTML or executable code here.
export function publisherId(env={}){
 const id=(env.ADSENSE_PUBLISHER_ID||'').trim();
 if(id&&!/^ca-pub-\d{16}$/.test(id))throw Error('ADSENSE_PUBLISHER_ID must be ca-pub- followed by 16 digits');
 return id;
}
export function verificationMarkup(env={}){
 const id=publisherId(env), token=(env.GOOGLE_SITE_VERIFICATION||'').trim();
 if(token&&!/^[a-zA-Z0-9_-]+$/.test(token))throw Error('GOOGLE_SITE_VERIFICATION must contain only the Google verification token');
 return '<!-- site-verification:start -->'+(id?`<meta name="google-adsense-account" content="${id}">`:'')+(token?`<meta name="google-site-verification" content="${token}">`:'')+'<!-- site-verification:end -->';
}
export function adsTxt(env={}){
 const id=publisherId(env);
 return id?`google.com, ${id.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`:'# No advertising sellers are authorized yet.\n';
}
