import {spawnSync} from 'node:child_process';
// Distinct preserved schemas keep regression and P4 browser suites isolated,
// including their shared 300/15-minute budget. Never relax the production code.
function run(args){const r=spawnSync(process.execPath,args,{env:process.env,stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
const selected=process.argv.slice(2),browser='node_modules/@playwright/test/cli.js',tsx='node_modules/tsx/dist/cli.mjs';
if(selected.length)run([browser,'test',...selected]);
else {
 run([tsx,'scripts/p3-test-schema.ts']);
 run([browser,'test','foundation.spec.ts','p3-auth.spec.ts']);
 run([tsx,'scripts/p4-test-schema.ts']);
 // P4 UI chooses an explicit synthetic policy; integration creates that fixture
 // in the same schema while exercising its real authorization and constraints.
 run([tsx,'tests/integration/p4-programs.ts']);
 run([browser,'test','p4-programs.spec.ts']);
}
