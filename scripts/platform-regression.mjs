import {spawnSync} from 'node:child_process';
for(const phase of [2,3,4,5,6,7,8,9]){
 const setup=phase===3?'p3-test-schema.ts':phase===4?'p4-test-schema.ts':phase<8&&phase>4?'participant-test-schema.ts':phase>=8?'platform-test-schema.ts':null;
 if(setup){const initialized=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs',`scripts/${setup}`,...(phase>=5?[String(phase)]:[])],{env:process.env,stdio:'inherit',windowsHide:true});if(initialized.status!==0)process.exit(initialized.status??1);}
 const file={2:'p2-database',3:'p3-auth',4:'p4-programs',5:'p5-participation',6:'p6-tracking',7:'p7-analytics',8:'p8-administration',9:'p9-privacy-notifications'}[phase];
 const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs',`tests/integration/${file}.ts`],{env:process.env,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status??1);
}
const deletion=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','tests/integration/p9-deletion.ts'],{env:process.env,stdio:'inherit',windowsHide:true});process.exit(deletion.status??1);
