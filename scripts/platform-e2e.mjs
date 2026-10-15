import {spawnSync} from 'node:child_process';
function run(args){const result=spawnSync(process.execPath,args,{env:process.env,stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status??1);}
const selected=process.argv.slice(2),tsx='node_modules/tsx/dist/cli.mjs',browser='node_modules/@playwright/test/cli.js';
if(selected.length)run([browser,'test',...selected]);
else{
 // Each wave uses the complete final schema, preserving previous synthetic schemas
 // and the existing per-schema rate budget. No changes while a server is running.
 run([tsx,'scripts/platform-test-schema.ts','9']);
 run([browser,'test','foundation.spec.ts','p3-auth.spec.ts']);
 run([tsx,'scripts/platform-test-schema.ts','9']);
 run([tsx,'tests/integration/p4-programs.ts']);
 run([browser,'test','p4-programs.spec.ts']);
 run([tsx,'scripts/platform-test-schema.ts','9']);
 run([browser,'test','p5-participant.spec.ts','p6-tracking.spec.ts','p7-analytics.spec.ts']);
 run([tsx,'scripts/platform-test-schema.ts','9']);
 run([browser,'test','p8-administration.spec.ts','p9-privacy-notifications.spec.ts','p10-pwa.spec.ts']);
}
