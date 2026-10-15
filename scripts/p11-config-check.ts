import { validateProductionContract } from '../src/server/operations/config';
// Read injected environment only. Never loads local files or opens a connection.
try {
 validateProductionContract(process.env);
 console.log('PASS: production contract shape validated; production adapter remains disabled.');
}catch{
 console.error('FAIL: production contract rejected. Values and diagnostics omitted.');
 process.exitCode=1;
}
