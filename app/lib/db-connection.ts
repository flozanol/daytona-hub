import sql from 'mssql';

const BASE: Omit<sql.config, 'database'> = {
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server:   process.env.DB_SERVER ?? '',
  port:     parseInt(process.env.DB_PORT ?? '1433'),
  options:  { encrypt: true, trustServerCertificate: true },
  connectionTimeout: 30_000,
  requestTimeout:    30_000,
};

export function makeConfig(database: string): sql.config {
  return { ...BASE, database };
}

export async function withPool<T>(
  database: string,
  fn: (pool: sql.ConnectionPool) => Promise<T>,
  opts?: { requestTimeoutMs?: number; silent?: boolean },
): Promise<T> {
  const cfg = makeConfig(database);
  if (opts?.requestTimeoutMs) {
    cfg.requestTimeout = opts.requestTimeoutMs;
  }
  if (!opts?.silent) {
    console.log(`[db] connecting → server="${cfg.server}" db="${cfg.database}" user="${cfg.user}"`);
  }
  const pool = new sql.ConnectionPool(cfg);
  try {
    await pool.connect();
    return await fn(pool);
  } catch (error) {
    console.error(`[db] connection failed → server="${cfg.server}" db="${cfg.database}"`, error);
    throw error;
  } finally {
    await pool.close().catch(() => {});
  }
}
