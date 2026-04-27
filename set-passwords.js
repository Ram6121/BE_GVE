// Run once after seed migration: sets bcrypt hashes for the 3 test users.
// Usage: npm run db:seed-passwords
require('dotenv').config();
const pool   = require('./src/db');
const bcrypt = require('bcrypt');

async function setPasswords() {
  const users = [
    { username: 'ram.prabhu', password: 'admin123' },
    { username: 'gate.staff', password: 'gev123'   },
    { username: 'anandprem',  password: 'gev123'   },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    const result = await pool.query(
      `UPDATE system_users
          SET password_hash = ?,
              failed_login_count = 0,
              is_locked = 0
        WHERE username = ?`,
      [hash, u.username]
    );
    console.log(`${result.rowCount > 0 ? '✓' : '✗'} ${u.username}`);
  }
  await pool.end();
  process.exit(0);
}

setPasswords().catch(err => {
  console.error('set-passwords failed:', err.message);
  process.exit(1);
});
