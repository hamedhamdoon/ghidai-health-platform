import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
if(!process.env.npm_execpath)throw new Error('RUN_WITH_NPM');
mkdirSync('.npm-cache',{recursive:true});
for(const scope of ['full','runtime']){
 const result=spawnSync(process.execPath,[process.env.npm_execpath,'audit','--json',...(scope==='runtime'?['--omit=dev']:[])],{encoding:'utf8'});
 let report;try{report=JSON.parse(result.stdout);}catch{throw new Error('AUDIT_REPORT_UNAVAILABLE');}
 if(report.error)throw new Error('AUDIT_NETWORK_FAILED');
 writeFileSync(`.npm-cache/p4-audit-${scope}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({scope,exitCode:result.status,counts:report.metadata?.vulnerabilities,packages:Object.entries(report.vulnerabilities??{}).map(([name,v])=>({name,severity:v.severity,fixAvailable:v.fixAvailable,advisories:v.via.filter(item=>typeof item==='object').map(item=>({title:item.title,url:item.url,range:item.range}))}))},null,2));
}
