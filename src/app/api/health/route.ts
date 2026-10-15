export const dynamic='force-dynamic';
/** Liveness only: deliberately does not imply database or release readiness. */
export function GET() { return Response.json({ status: 'ok', phase: 'P1', database: 'not-checked' }, { headers: { 'Cache-Control': 'no-store' } }); }
