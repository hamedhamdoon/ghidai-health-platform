import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {writeFileSync} from 'node:fs';
const base='http://127.0.0.1:8027';
const health=await fetch(`${base}/livez`);assert(health.ok);
const tag=`p12r1-${Date.now()}`;
const transport=nodemailer.createTransport({host:'127.0.0.1',port:1027,secure:false});
try {
 await transport.sendMail({from:'synthetic@ghidai.test',to:`${tag}@ghidai.test`,subject:tag,text:'Synthetic local compatibility probe; no health data.'});
 const response=await fetch(`${base}/api/v1/messages`);assert(response.ok);const result=await response.json();
 assert(result.messages.some(message=>message.Subject===tag));
 const evidence={at:new Date().toISOString(),image:'axllent/mailpit:v1.31.6',health:true,smtpAccepted:true,httpApiMessageFound:true,currentSinkReplaced:false,externalDeliveryTested:false};
 writeFileSync('.npm-cache/p12-r1/mailpit-compatibility.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
} finally {transport.close();}
