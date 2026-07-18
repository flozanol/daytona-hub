const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
});

const sqlFile = path.join(__dirname, '..', 'sql', 'checklist_weekly_run.sql');
const raw = fs.readFileSync(sqlFile, 'utf8');
const batches = raw
  .split(/^\s*GO\s*$/gim)
  .map((b) => b.trim())
  .filter((b) => b.length > 0 && !/^USE\s+/i.test(b));

(async () => {
  const pool = await sql.connect({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: +process.env.DB_PORT,
    database: 'Intranet',
    options: { encrypt: true, trustServerCertificate: true },
    requestTimeout: 60_000,
  });

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n--- Batch ${i + 1}/${batches.length} ---\n${batch.slice(0, 120)}...`);
    try {
      await pool.request().batch(batch);
      console.log('OK');
    } catch (e) {
      console.error('FAIL:', e.message);
      throw e;
    }
  }

  await pool.close();
  console.log('\nAll batches applied.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
