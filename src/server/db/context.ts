import type { Pool, PoolClient } from 'pg';

// Only a future server-side session resolver can create trusted identities.
// No constructor, browser route, header, cookie or payload is accepted in P2.
declare const verified: unique symbol;
export type VerifiedActor = Readonly<{ id: string; [verified]: true }>;
export async function withActor<T>(pool: Pool, actor: VerifiedActor, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const role=(await client.query('SELECT current_user AS name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    if(role.name!=='ghidai_app'||role.rolsuper||role.rolbypassrls)throw new Error('APP_ROLE_REQUIRED');
    await client.query("SELECT set_config('app.user_id',$1,true)",[actor.id]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
