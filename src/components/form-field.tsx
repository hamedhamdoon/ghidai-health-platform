'use client';
export function Field({name,label,type='text',required=true,defaultValue,autoComplete,min,max,step}:{name:string;label:string;type?:string;required?:boolean;defaultValue?:string|number;autoComplete?:string;min?:number;max?:number;step?:number|'any'}) {
 return <label className="auth-field"><span>{label}</span><input name={name} type={type} required={required} defaultValue={defaultValue} autoComplete={autoComplete} min={min} max={max} step={step} minLength={type==='password'?12:undefined} maxLength={type==='password'?128:undefined} dir={['email','password','number'].includes(type)?'ltr':undefined}/></label>;
}
