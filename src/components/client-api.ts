'use client';
// Keep the same P4 receipt key after a failed response, so retrying a committed
// request cannot create a second revision. Memory only; never persistent storage.
const p4ReceiptKeys=new Map<string,string>();
export class ApiError extends Error {constructor(public code:string,message:string,public status:number){super(message);}}
export async function api(path:string,method='GET',body?:unknown,revision?:number) {
 let fingerprint:string|undefined;
 try {
 const headers:Record<string,string>={};
 if(method!=='GET'){const csrf=await fetch('/api/v1/auth/csrf',{cache:'no-store'});const data=await csrf.json();if(!csrf.ok)throw new Error(data.error?.message??'تعذر الاتصال.');headers['X-CSRF-Token']=data.data.csrfToken;headers['Content-Type']='application/json';if(method!=='GET'){if(/^(admin|coach|coaching|content-revisions|participant|enrollments|occurrences|logs|habits|reviews|notifications|privacy)(\/|$)/.test(path)){fingerprint=JSON.stringify({path,method,body,revision});const key=p4ReceiptKeys.get(fingerprint)??crypto.randomUUID();p4ReceiptKeys.set(fingerprint,key);headers['Idempotency-Key']=key;}else headers['Idempotency-Key']=crypto.randomUUID();}if(method==='PUT'&&!revision)headers['If-None-Match']='*';if(revision)headers['If-Match']=`"${revision}"`;}
 const response=await fetch(`/api/v1/${path}`,{method,headers,body:method==='GET'?undefined:JSON.stringify(body??{}),cache:'no-store'});
 const result=response.status===204?{data:{}}:await response.json();if(!response.ok)throw new ApiError(result.error?.code??'UNKNOWN',result.error?.message??'تعذر الاتصال بالخدمة.',response.status);if(/^auth\/(logout|login|mfa\/challenge|password\/reset)$/.test(path))p4ReceiptKeys.clear();if(path==='auth/logout')window.dispatchEvent(new CustomEvent('ghidai:logout'));if(fingerprint)p4ReceiptKeys.delete(fingerprint);return result.data;
 } catch(error){if(error instanceof TypeError||error instanceof SyntaxError)throw new Error('تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.');throw error;}
}
