const sql = require('mssql');

let poolPromise = null;

function getConfigFromEnv() {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_DATABASE,
    options: {
      encrypt: String(process.env.DB_ENCRYPT || 'false') === 'true',
      trustServerCertificate: String(process.env.DB_TRUST_CERT || 'false') === 'true',
    },
    pool: {
      max: 10,
      min: 1,
      idleTimeoutMillis: 30000,
    },
  };
}

function getPool() {
  if (!poolPromise) {
    const config = getConfigFromEnv();
    poolPromise = sql.connect(config);
  }
  return poolPromise;
}

async function executeStoredProcedure(name, inputParams = {}) {
  const pool = await getPool();
  const request = pool.request();
  for (const [key, meta] of Object.entries(inputParams)) {
    if (meta && typeof meta === 'object' && 'type' in meta) {
      request.input(key, meta.type, meta.value);
    } else {
      request.input(key, inputParams[key]);
    }
  }
  const result = await request.execute(name);
  return result.recordset || [];
}

module.exports = {
  sql,
  getPool,
  executeStoredProcedure,
};
