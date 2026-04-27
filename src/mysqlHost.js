/**
 * If DB_HOST is "localhost", Node/mysql2 may connect via IPv6 (::1). MySQL then checks
 * 'user'@'::1' — often no grant, even when 'user'@'localhost' or '127.0.0.1' works.
 * Using 127.0.0.1 makes the same .env work with typical shared-hosting grants.
 */
function resolveMySqlHost(envHost) {
  if (envHost == null || String(envHost).trim() === '') return '127.0.0.1';
  return String(envHost).toLowerCase() === 'localhost' ? '127.0.0.1' : String(envHost).trim();
}

module.exports = { resolveMySqlHost };
