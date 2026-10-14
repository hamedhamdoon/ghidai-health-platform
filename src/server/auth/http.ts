import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { ContractError } from '../contracts/p2';
import { AuthError } from './contracts';
import { opaque, sign, equal, digest } from './crypto';
import { authRuntime } from './runtime';
import { AuthService } from './service';
import { deliverMail } from './mail';
import { ProgramService } from '../programs/service';
import { ParticipationService } from '../participation/service';
import { TrackingService } from '../tracking/service';
import { AnalyticsService } from '../analytics/service';
import { AdministrationService } from '../administration/service';
import { P9Service } from '../notifications/service';
const cookieOptions={httpOnly:true,secure:false,sameSite:'strict' as const,path:'/'};
const names={session:'ghidai_session',preauth:'ghidai_preauth',csrf:'ghidai_csrf'};
export function localOrigin(url:string):string {const parsed=new URL(url);if(parsed.protocol!=='http:'||parsed.hostname!=='127.0.0.1'||!['3000','3100'].includes(parsed.port))throw new AuthError('LOCAL_ONLY',403);return parsed.origin;}
export function csrfValue(key:Buffer,nonce:string,bound:string,stamp:number){return `${stamp}.${sign(key,`${nonce}:${digest(bound)}:${stamp}`)}`;}
export function validCsrf(key:Buffer,nonce:string,bound:string,value:string){const stamp=Number(value.split('.')[0]);return !!nonce&&Number.isSafeInteger(stamp)&&stamp<=Date.now()&&Date.now()-stamp<3600000&&equal(csrfValue(key,nonce,bound,stamp),value);}
export async function handle(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
 const requestId=randomUUID();
 try {
  // Next may reconstruct request.url with localhost internally. Only the explicit loopback
  // Host allowlist determines the browser origin; forwarded host headers are ignored.
  const origin=localOrigin(`http://${request.headers.get('host')??''}`),path=(await params).path.join('/'),runtime=authRuntime(),service=new AuthService(runtime.auth,runtime.app,runtime.key,runtime.prisma);
  const session=request.cookies.get(names.session)?.value??'',preauth=request.cookies.get(names.preauth)?.value??'';
  if(path==='auth/csrf'&&request.method==='GET'){
   const nonce=request.cookies.get(names.csrf)?.value??opaque(),value=csrfValue(runtime.key,nonce,session||preauth,Date.now());
   const response=NextResponse.json({data:{csrfToken:value},meta:{requestId,serverTime:new Date().toISOString()}},{headers:{'Cache-Control':'private, no-store'}});response.cookies.set(names.csrf,nonce,{...cookieOptions,maxAge:3600});return response;
  }
  let input:unknown={};
  if(request.method!=='GET'){
   if(request.headers.get('origin')!==origin||request.headers.get('host')!==new URL(origin).host||!validCsrf(runtime.key,request.cookies.get(names.csrf)?.value??'',session||preauth,request.headers.get('x-csrf-token')??''))throw new AuthError('CSRF_INVALID',403);
   if(request.headers.get('content-length')&&Number(request.headers.get('content-length'))>32768)throw new AuthError('BODY_TOO_LARGE',413);
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new AuthError('VALIDATION_FAILED',422);
   const reader=request.body?.getReader();const chunks:Uint8Array[]=[];let size=0;
   if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();throw new AuthError('BODY_TOO_LARGE',413);}chunks.push(part.value);}
   try{input=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw new AuthError('VALIDATION_FAILED',422);}
   // Loopback only; untrusted forwarded IP headers cannot bypass this process-wide persistent budget.
   await service.rate('local-browser-global',300);
  }
  const p4=/^(admin|coach|content-revisions|programs)(\/|$)/.test(path);
  const participant=/^(participant|enrollments|today|occurrences)(\/|$)/.test(path);
  const tracking=/^(logs|habits|reviews)(\/|$)/.test(path);
  const analytics=/^(analytics|achievements|certificates)(\/|$)/.test(path);
  const administration=/^coaching(\/|$)/.test(path)||/^coach\/participants(\/|$)/.test(path)||/^admin\/(users|assignments|operations|audit)(\/|$)/.test(path);
  const privacyNotifications=/^(notifications|privacy)(\/|$)/.test(path);
  const output=privacyNotifications?await new P9Service(service).execute(path,request.method,input,session,request.headers.get('if-match'),request.headers.get('idempotency-key')):administration?await new AdministrationService(service).execute(path,request.method,input,session,request.headers.get('if-match'),request.headers.get('idempotency-key')):analytics?{body:await new AnalyticsService(service).execute(path,request.method,input,session,request.headers.get('if-match'),request.headers.get('idempotency-key'),request.nextUrl.searchParams)}:tracking?await new TrackingService(service).execute(path,request.method,request.method==='GET'?Object.fromEntries(request.nextUrl.searchParams):input,session,request.headers.get('if-match'),request.headers.get('idempotency-key'),request.headers.get('if-none-match')):participant?await new ParticipationService(service).execute(path,request.method,request.method==='GET'?Object.fromEntries(request.nextUrl.searchParams):input,session,request.headers.get('if-match'),request.headers.get('idempotency-key')):p4?await new ProgramService(service).execute(path,request.method,input,session,request.headers.get('if-match'),request.headers.get('idempotency-key')):await service.execute(path,request.method,input,session,preauth,origin,request.headers.get('if-match'));
  if(['auth/register','auth/password/forgot','auth/verify/resend','auth/email/change'].includes(path))await deliverMail(runtime.auth,runtime.key);
  const response=new NextResponse(output.status===204?null:JSON.stringify({data:output.body??{},meta:{requestId,serverTime:new Date().toISOString()}}),{status:output.status??200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store'}});
  if(output.clear||output.preauth){response.cookies.set(names.session,'',{...cookieOptions,maxAge:0});response.cookies.set(names.preauth,'',{...cookieOptions,maxAge:0});}
  if(output.session){response.cookies.set(names.session,output.session,{...cookieOptions,maxAge:604800});response.cookies.set(names.preauth,'',{...cookieOptions,maxAge:0});}
  if(output.preauth)response.cookies.set(names.preauth,output.preauth,{...cookieOptions,maxAge:300});
  const body=output.body as {revision?:number}|undefined;if(body?.revision)response.headers.set('ETag',`"${body.revision}"`);
  return response;
 } catch(error){
  const known=error instanceof AuthError||error instanceof ContractError;
  const dbCode=error&&typeof error==='object'&&'code'in error?error.code:null;
  const safeDatabaseError=error instanceof Error&&['LAST_ADMIN_PROTECTED','REVISION_CONFLICT','FORBIDDEN','NOT_FOUND'].includes(error.message)?error.message:null;
  const status=known?error.status:safeDatabaseError==='FORBIDDEN'?403:safeDatabaseError==='NOT_FOUND'?404:['23505','23P01','23514','23503'].includes(String(dbCode))?409:503;
  const code=known?error.code:safeDatabaseError??(status===409?'CONFLICT':'SERVICE_UNAVAILABLE');
  const messages:Record<string,string>={EXERCISE_NOT_FINISHED:'سجل التمرين بعد انتهاء مدته.',CERTIFICATE_REVOKED:'لم تعد شهادة الاختبار مستحقة بعد تحديث السجلات.',SAVE_WINDOW_CLOSED:'هذا اليوم خارج نافذة الحفظ المتاحة.',USE_LOG:'سجل النشاط المرتبط بهذه المهمة لإتمامها.',FORBIDDEN:'لا تملك صلاحية هذه العملية.',NOT_FOUND:'العنصر غير متاح ضمن صلاحياتك.',STATE_CONFLICT:'الحالة الحالية لا تسمح بهذه العملية.',MFA_REQUIRED:'أكد الهوية باستخدام المصادقة متعددة العوامل.',SELF_REVIEW_FORBIDDEN:'لا يمكن للمؤلف اعتماد محتواه بنفسه.',QUALIFICATION_REQUIRED:'يلزم تأهيل موثق وساري في نطاق المحتوى.',INCOMPLETE_DAYS:'أكمل مهام جميع الأيام قبل إرسال النسخة.',DRAFT_REQUIRED:'التحرير متاح للمسودات فقط. أنشئ نسخة جديدة.',APPROVAL_REQUIRED:'يلزم اعتماد جميع إصدارات المحتوى قبل النشر.',IDEMPOTENCY_CONFLICT:'مفتاح الطلب مستخدم لمحتوى مختلف.',APPROVED_CONVERSION_REQUIRED:'التحويل يحتاج معاملًا معتمدًا؛ لا يمكن افتراضه.',CREDENTIALS_INVALID:'تعذر تسجيل الدخول. تحقق من بيانات الدخول.',TOKEN_INVALID:'الرابط غير صالح أو انتهت صلاحيته.',MFA_INVALID:'رمز التحقق غير صالح أو مستخدم.',REAUTH_REQUIRED:'أكد هويتك بكلمة المرور ورمز الأمان أولًا.',UNAUTHENTICATED:'يرجى تسجيل الدخول.',RATE_LIMITED:'محاولات كثيرة. حاول لاحقًا.',CSRF_INVALID:'انتهت حماية الطلب. أعد المحاولة.',REVISION_CONFLICT:'تغيرت البيانات. حدث الصفحة ثم أعد المحاولة.',VALIDATION_FAILED:'تحقق من الحقول المطلوبة والقيم المدخلة.',PRECONDITION_REQUIRED:'حدث البيانات قبل التعديل.',CONFLICT:'تعارض الطلب مع بيانات محفوظة.',SERVICE_UNAVAILABLE:'الخدمة غير متاحة مؤقتًا. حاول لاحقًا.'};
  const additionalMessages:Record<string,string>={LAST_ADMIN_PROTECTED:'لا يمكن تعطيل آخر حساب إداري نشط أو إزالة دوره.',CONSENT_REQUIRED:'امنح موافقة التنبيهات صراحة قبل تفعيلها.',EXPORT_LIMIT_EXCEEDED:'حجم البيانات يتجاوز حد التصدير المحلي المتاح.'};
  return NextResponse.json({error:{code,message:messages[code]??additionalMessages[code]??'تعذر تنفيذ الطلب.',requestId}},{status,headers:{'Cache-Control':'private, no-store',...(status===429?{'Retry-After':String(Math.ceil((900000-Date.now()%900000)/1000))}:{})}});
 }
}
