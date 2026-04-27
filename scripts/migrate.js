/**
 * Runs each *.sql file in migrations/ as one multi-statement batch (MySQL).
 * Use DB_NAME or DB_DATABASE (Hostinger / Laravel style).
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { resolveMySqlHost } = require('../src/mysqlHost');

function resolveDatabaseName() {
  const name = process.env.DB_NAME || process.env.DB_DATABASE;
  if (!name || String(name).trim() === '') {
    console.error(
      'Missing DB_NAME or DB_DATABASE in .env — set it to your MySQL database name (see hPanel / phpMyAdmin).'
    );
    process.exit(1);
  }
  return name;
}

async function main() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.error('No .sql files in migrations/');
    process.exit(1);
  }

  const database = resolveDatabaseName();

  const host = resolveMySqlHost(process.env.DB_HOST);
  const conn = await mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database,
    multipleStatements: true,
  });

  console.log(`Connected to ${database}@${host}`);

  try {
    for (const file of files) {
      const full = path.join(dir, file);
      const sql = fs.readFileSync(full, 'utf8');
      console.log(`\n${file}`);
      await conn.query(sql);
      console.log('  OK');
    }
    console.log('\nMigration finished.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
