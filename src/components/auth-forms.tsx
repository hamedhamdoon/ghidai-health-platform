'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Keep the same P4 receipt key after a failed response, so retrying a committed
// request cannot create a second revision. Memory only; never persistent storage.
const p4ReceiptKeys=new Map<string,string>();
export class ApiError extends Error {constructor(public code:string,message:string,public status:number){super(message);}}
export async function api(path:string,method='GET',body?:unknown,revision?:number) {
 let fingerprint:string|undefined;
 try {
 const headers:Record<string,string>={};
 if(method!=='GET'){const csrf=await fetch('/api/v1/auth/csrf',{cache:'no-store'});const data=await csrf.json();if(!csrf.ok)throw new Error(data.error?.message??'تعذر الاتصال.');headers['X-CSRF-Token']=data.data.csrfToken;headers['Content-Type']='application/json';if(method!=='GET'){if(/^(admin|coach|content-revisions|participant|enrollments|occurrences|logs|habits|reviews)(\/|$)/.test(path)){fingerprint=JSON.stringify({path,method,body,revision});const key=p4ReceiptKeys.get(fingerprint)??crypto.randomUUID();p4ReceiptKeys.set(fingerprint,key);headers['Idempotency-Key']=key;}else headers['Idempotency-Key']=crypto.randomUUID();}if(method==='PUT'&&!revision)headers['If-None-Match']='*';if(revision)headers['If-Match']=`"${revision}"`;}
 const response=await fetch(`/api/v1/${path}`,{method,headers,body:method==='GET'?undefined:JSON.stringify(body??{}),cache:'no-store'});
 const result=response.status===204?{data:{}}:await response.json();if(!response.ok)throw new ApiError(result.error?.code??'UNKNOWN',result.error?.message??'تعذر الاتصال بالخدمة.',response.status);if(/^auth\/(logout|login|mfa\/challenge|password\/reset)$/.test(path))p4ReceiptKeys.clear();return result.data;
 } catch(error){if(error instanceof TypeError||error instanceof SyntaxError)throw new Error('تعذر الاتصال بالخدمة. تحقق من الشبكة ثم أعد المحاولة.');throw error;}
}
export function Field({name,label,type='text',required=true,defaultValue,autoComplete,min,max,step}:{name:string;label:string;type?:string;required?:boolean;defaultValue?:string|number;autoComplete?:string;min?:number;max?:number;step?:number|'any'}) {
 return <label className="auth-field"><span>{label}</span><input name={name} type={type} required={required} defaultValue={defaultValue} autoComplete={autoComplete} min={min} max={max} step={step} minLength={type==='password'?12:undefined} maxLength={type==='password'?128:undefined} dir={['email','password','number'].includes(type)?'ltr':undefined}/></label>;
}
export type AuthMode='register'|'login'|'verify'|'forgot-password'|'reset-password';
const labels:Record<AuthMode,string>={register:'إنشاء حساب',login:'تسجيل الدخول',verify:'التحقق من البريد','forgot-password':'استعادة كلمة المرور','reset-password':'إعادة تعيين كلمة المرور'};
export function AuthForm({mode}:{mode:AuthMode}) {
 const router=useRouter();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[mfa,setMfa]=useState(false),[token,setToken]=useState(''),[kind,setKind]=useState('VERIFY'),[show,setShow]=useState(false);
 useEffect(()=>{const read=()=>{const fragment=new URLSearchParams(window.location.hash.slice(1));setToken(fragment.get('token')??'');setKind(fragment.get('kind')??'VERIFY');if(window.location.hash)window.history.replaceState(null,'',window.location.pathname);};window.addEventListener('hashchange',read);queueMicrotask(read);return ()=>window.removeEventListener('hashchange',read);},[]);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');setMessage('');const data=new FormData(event.currentTarget);const get=(n:string)=>String(data.get(n)??'');
  try {
   if(['register','reset-password'].includes(mode)&&get('password')!==get('confirmation'))throw new Error('كلمتا المرور غير متطابقتين.');
   let path='',body:unknown={};
   if(mode==='register'){path='auth/register';body={displayName:get('displayName'),email:get('email'),password:get('password'),policyVersion:'synthetic-local-p3-v1',privacyAccepted:data.has('privacy')};}
   if(mode==='login'){path=mfa?'auth/mfa/challenge':'auth/login';body=mfa?(get('recoveryCode')?{recoveryCode:get('recoveryCode')}:{code:get('code')}):{email:get('email'),password:get('password')};}
   if(mode==='forgot-password'){path='auth/password/forgot';body={email:get('email')};}
   if(mode==='reset-password'){path='auth/password/reset';body={token,newPassword:get('password')};}
   if(mode==='verify'){path=token?(kind==='EMAIL_CHANGE'?'auth/email/confirm':'auth/verify'):'auth/verify/resend';body=token?{token}:{email:get('email')};}
   const result=await api(path,'POST',body);
   if(mode==='login'){if(result.needsMfa){setMfa(true);setMessage('أدخل رمز تطبيق المصادقة أو رمز استرداد.');}else router.push('/onboarding');}
   else if(mode==='register')router.push('/verify');
   else {setMessage(result.message??'تم تأكيد البريد. يمكنك تسجيل الدخول.');if(mode==='verify')setToken('');}
  }catch(e){setError(e instanceof Error?e.message:'تعذر الاتصال. تحقق من الشبكة.');}finally{setBusy(false);}
 }
 return <section className="content-card auth-card"><h2>{labels[mode]}</h2><p className="local-notice">اختبار محلي بحسابات اصطناعية فقط. سياسة التسجيل المحلية مؤقتة وغير معتمدة للإنتاج.</p><form onSubmit={submit} aria-busy={busy}>
  {mode==='register'&&<Field name="displayName" label="الاسم المعروض" autoComplete="nickname"/>}
  {(['register','forgot-password'].includes(mode)||(mode==='login'&&!mfa)||(mode==='verify'&&!token))&&<Field name="email" label="البريد الإلكتروني" type="email" autoComplete="email"/>}
  {(['register','reset-password'].includes(mode)||(mode==='login'&&!mfa))&&<><Field name="password" label="كلمة المرور (12–128 حرفًا)" type={show?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'}/><button type="button" className="text-link" onClick={()=>setShow(!show)} aria-pressed={show}>{show?'إخفاء كلمة المرور':'إظهار كلمة المرور'}</button></>}
  {['register','reset-password'].includes(mode)&&<Field name="confirmation" label="تأكيد كلمة المرور" type="password" autoComplete="new-password"/>}
  {mode==='register'&&<label className="auth-check"><input name="privacy" type="checkbox" required/> أوافق على معالجة بيانات الاختبار الاصطناعية وفق السياسة المحلية synthetic-local-p3-v1 لمدة اختبار 30 يومًا، مع إمكانية سحب الموافقة.</label>}
  {mfa&&<><Field name="code" label="رمز تطبيق المصادقة" required={false} autoComplete="one-time-code"/><Field name="recoveryCode" label="أو رمز الاسترداد" required={false}/></>}
  {mode==='reset-password'&&!token&&<p role="alert">الرابط غير متاح. اطلب رابطًا جديدًا.</p>}
  <button className="button" disabled={busy||(mode==='reset-password'&&!token)}>{busy?'جارٍ التنفيذ…':mode==='verify'?(token?'تأكيد البريد':'إعادة إرسال الرابط'):labels[mode]}</button>
 </form><p role="alert" className="form-error">{error}</p><p role="status" className="form-status">{message}</p><div className="auth-links"><Link className="text-link" href="/login">لدي حساب — دخول</Link><Link className="text-link" href="/register">إنشاء حساب</Link><Link className="text-link" href="/forgot-password">نسيت كلمة المرور</Link><Link className="text-link" href="/account">حسابي</Link></div></section>;
}
