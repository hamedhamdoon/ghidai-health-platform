import { authRuntime } from '../src/server/auth/runtime';
import { deliverMail } from '../src/server/auth/mail';
const runtime=authRuntime();
try {await deliverMail(runtime.auth,runtime.key);console.log('Local mail retry completed; inspect Mailpit delivery status.');}finally{await runtime.auth.end();await runtime.app.end();await runtime.prisma.$disconnect();}
