import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import argon2 from 'argon2';
export const opaque=()=>randomBytes(32).toString('base64url');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const equal=(a:string,b:string)=>{const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};
export const passwordHash=(value:string)=>argon2.hash(value,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
export const passwordMatches=(hash:string,value:string)=>argon2.verify(hash,value).catch(()=>false);
export function encrypt(value:string,key:Buffer):Buffer {
 const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
 return Buffer.concat([iv,cipher.update(value,'utf8'),cipher.final(),cipher.getAuthTag()]);
}
export function decrypt(value:Buffer,key:Buffer):string {
 const cipher=createDecipheriv('aes-256-gcm',key,value.subarray(0,12));cipher.setAuthTag(value.subarray(-16));
 return Buffer.concat([cipher.update(value.subarray(12,-16)),cipher.final()]).toString('utf8');
}
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes:Buffer):string {
 let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){result+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)result+=alphabet[(value<<(5-bits))&31];return result;
}
export function totp(secret:Buffer,step:number):string {
 const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(step));const hash=createHmac('sha1',secret).update(b).digest(),offset=hash[19]&15;
 return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
export function matchTotp(secret:Buffer,code:string,lastStep:number,now=Date.now()):number|null {
 if(!/^\d{6}$/.test(code))return null;const current=Math.floor(now/30000);
 for(const step of [current,current-1,current+1])if(step>lastStep&&equal(totp(secret,step),code))return step;return null;
}
export const sign=(key:Buffer,value:string)=>createHmac('sha256',key).update(value).digest('base64url');
