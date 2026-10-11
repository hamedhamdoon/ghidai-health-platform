export function GET() { return Response.json({ status: 'ok', phase: 'P1', database: 'not-checked' }, { headers: { 'Cache-Control': 'no-store' } }); }
