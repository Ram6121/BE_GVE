const mysql = require('mysql2/promise');
const { resolveMySqlHost } = require('./mysqlHost');
require('dotenv').config();

// Hostinger / Laravel often use DB_DATABASE; local examples use DB_NAME.
const database = process.env.DB_NAME || process.env.DB_DATABASE;
if (!database || String(database).trim() === '') {
  throw new Error(
    'Missing database name in .env: set DB_NAME or DB_DATABASE (e.g. Hostinger MySQL database from hPanel).'
  );
}

const basePool = mysql.createPool({
  host: resolveMySqlHost(process.env.DB_HOST),
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

const rawQuery = basePool.query.bind(basePool);

/** mysql2 returns [rows, fields]; normalize to pg-like { rows, rowCount, insertId } */
basePool.query = async (text, values) => {
  const [result] = await rawQuery(text, values);
  if (Array.isArray(result)) {
    return { rows: result, rowCount: result.length };
  }
  return {
    rows: [],
    rowCount: result.affectedRows ?? 0,
    insertId: result.insertId,
  };
};

basePool.on('error', (err) => {
  console.error('Unexpected error on idle MySQL connection', err);
});

module.exports = basePool;
