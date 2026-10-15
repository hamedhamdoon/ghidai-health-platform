import { authRuntime } from '../../../server/auth/runtime';
export const dynamic='force-dynamic';
export async function GET() {
 try {
  const runtime=authRuntime();
  await Promise.all([runtime.auth.query('SELECT 1'),runtime.app.query('SELECT 1')]);
  return Response.json({status:'ready'},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
