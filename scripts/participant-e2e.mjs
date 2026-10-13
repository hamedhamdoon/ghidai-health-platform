import {spawnSync} from 'node:child_process';
function run(args){const result=spawnSync(process.execPath,args,{env:process.env,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status??1);}
const selected=process.argv.slice(2),browser='node_modules/@playwright/test/cli.js',tsx='node_modules/tsx/dist/cli.mjs';
if(selected.length)run([browser,'test',...selected]);
else{
 run([tsx,'scripts/p3-test-schema.ts']);
 run([browser,'test','foundation.spec.ts','p3-auth.spec.ts']);
 run([tsx,'scripts/p4-test-schema.ts']);
 run([tsx,'tests/integration/p4-programs.ts']);
 run([browser,'test','p4-programs.spec.ts']);
 run([tsx,'scripts/participant-test-schema.ts','7']);
 run([browser,'test','p5-participant.spec.ts','p6-tracking.spec.ts','p7-analytics.spec.ts']);
}
