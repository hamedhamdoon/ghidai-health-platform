import {spawnSync} from 'node:child_process';
import {mkdirSync,openSync,closeSync,writeFileSync} from 'node:fs';
const directory=`.npm-cache/p12-r1/regression-${Date.now()}`;mkdirSync(directory,{recursive:true});
const tasks=[
 ['canonical-test-setup','scripts/platform-setup.ts','test'],
 ['database-probe','scripts/check-database.ts','test'],
 ['native-original','scripts/platform-regression.mjs'],
 ['native-nutrition-new','scripts/p12r1-nutrition-test.ts'],
 ['native-administration-new','scripts/p12r1-administration-test.ts'],
 ['auth-outages','tests/integration/p3-outages.ts'],
 ['participant-outages','tests/integration/participant-outages.ts'],
 ['restore','scripts/p12-backup-rehearsal.ts'],
 ['browser','scripts/p12-r1-e2e.mjs'],
 ['capacity-schema','scripts/platform-test-schema.ts','9'],
 ['capacity-single','scripts/p12-capacity.ts'],
 ['capacity-multiuser','scripts/p12-capacity.ts','multiuser'],
];
const results=[];
for(const [name,file,...args] of tasks){
 const log=`${directory}/${name}.log`,fd=openSync(log,'wx'),startedAt=new Date().toISOString();let result;
 try{result=spawnSync(process.execPath,[...(file.endsWith('.ts')?['node_modules/tsx/dist/cli.mjs']:[]),file,...args],{env:process.env,stdio:['ignore',fd,fd],windowsHide:true});}finally{closeSync(fd);}
 results.push({name,startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,log});
 writeFileSync(`${directory}/results.json`,JSON.stringify({node:process.version,results},null,2));console.log(JSON.stringify(results.at(-1)));
 if(result.status!==0)process.exit(result.status??1);
}
