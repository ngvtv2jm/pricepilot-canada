// Authentication callbacks may temporarily occupy the fragment before the SDK consumes it.
export function routeFromHash(hash:string){
 const value=hash.replace(/^#/,'');
 if(/(^|&)(access_token|refresh_token|error_description|type)=/.test(value))return 'account';
 return value||'home';
}

export function productLookupState(found:boolean,loading:boolean,error:string){
 return found?'ready':loading?'loading':error?'error':'missing';
}
