-- GEV ICMS — initial schema (MySQL 8+ / MariaDB / Hostinger)
-- Run: npm run db:migrate
-- Then: npm run db:seed-passwords
--
-- phpMyAdmin: use the same DB_HOST, DB_PORT (usually 3306), DB_USER, DB_PASSWORD, DB_NAME
-- as in .env (e.g. XAMPP: user root, empty password, create database gev_icms in phpMyAdmin).

CREATE TABLE IF NOT EXISTS departments (
  dept_id     INT AUTO_INCREMENT PRIMARY KEY,
  dept_name   VARCHAR(255) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS persons (
  person_id             INT AUTO_INCREMENT PRIMARY KEY,
  full_name             VARCHAR(255) NOT NULL,
  person_type           VARCHAR(64)  NOT NULL,
  mobile                VARCHAR(32)  NOT NULL,
  dept_id               INT NULL,
  id_proof_type         VARCHAR(64) NULL,
  id_proof_number       VARCHAR(128) NULL,
  date_of_birth         DATE NULL,
  gender                VARCHAR(16) NULL,
  perm_address          TEXT NULL,
  city                  VARCHAR(128) NULL,
  state                 VARCHAR(128) NULL,
  pincode               VARCHAR(16) NULL,
  accommodation_block   VARCHAR(64) NULL,
  room_number           VARCHAR(32) NULL,
  registered_by         INT NULL,
  registration_source   VARCHAR(64) NOT NULL DEFAULT 'admin_portal',
  status                VARCHAR(32)  NOT NULL DEFAULT 'pre_registered',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_persons_dept FOREIGN KEY (dept_id) REFERENCES departments (dept_id)
);

CREATE TABLE IF NOT EXISTS system_users (
  user_id             INT AUTO_INCREMENT PRIMARY KEY,
  username            VARCHAR(128) NOT NULL UNIQUE,
  password_hash       TEXT         NOT NULL,
  role                VARCHAR(64)  NOT NULL,
  module_access       LONGTEXT     NOT NULL DEFAULT ('{}'),
  dept_id             INT NULL,
  person_id           INT NOT NULL UNIQUE,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  is_locked           TINYINT(1) NOT NULL DEFAULT 0,
  failed_login_count  INT NOT NULL DEFAULT 0,
  last_login          DATETIME NULL,
  CONSTRAINT fk_system_users_dept FOREIGN KEY (dept_id) REFERENCES departments (dept_id),
  CONSTRAINT fk_system_users_person FOREIGN KEY (person_id) REFERENCES persons (person_id)
);

CREATE TABLE IF NOT EXISTS qr_passes (
  qr_id       CHAR(36) NOT NULL PRIMARY KEY,
  person_id   INT NOT NULL,
  pass_type   VARCHAR(64)  NOT NULL,
  zone_access LONGTEXT     NOT NULL,
  valid_from  DATETIME NULL,
  valid_until DATETIME NULL,
  group_size  INT NOT NULL DEFAULT 1,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_qr_passes_person FOREIGN KEY (person_id) REFERENCES persons (person_id),
  KEY idx_qr_passes_person (person_id)
);

CREATE TABLE IF NOT EXISTS gate_events (
  event_id        INT AUTO_INCREMENT PRIMARY KEY,
  person_id       INT NULL,
  qr_id           CHAR(36) NULL,
  gate            VARCHAR(64)  NOT NULL,
  event_type      VARCHAR(32)  NOT NULL DEFAULT 'entry',
  result          VARCHAR(32)  NOT NULL,
  deny_reason     TEXT NULL,
  scanned_by      INT NULL,
  scanned_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_batch_count  TINYINT(1) NOT NULL DEFAULT 0,
  batch_count     INT NULL,
  CONSTRAINT fk_gate_events_person FOREIGN KEY (person_id) REFERENCES persons (person_id),
  CONSTRAINT fk_gate_events_qr FOREIGN KEY (qr_id) REFERENCES qr_passes (qr_id),
  CONSTRAINT fk_gate_events_scanner FOREIGN KEY (scanned_by) REFERENCES system_users (user_id),
  KEY idx_gate_events_scanned_at (scanned_at),
  KEY idx_gate_events_gate (gate)
);

CREATE TABLE IF NOT EXISTS audit_log (
  audit_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NULL,
  person_id  INT NULL,
  action     VARCHAR(128) NOT NULL,
  module     VARCHAR(64)  NOT NULL,
  `table_name` VARCHAR(128) NOT NULL,
  record_id  VARCHAR(128) NULL,
  old_value  LONGTEXT NULL,
  new_value  LONGTEXT NULL,
  ip_address VARCHAR(64) NULL,
  device_id  VARCHAR(128) NULL,
  notes      TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES system_users (user_id),
  CONSTRAINT fk_audit_person FOREIGN KEY (person_id) REFERENCES persons (person_id),
  KEY idx_audit_log_created_at (created_at)
);

SET @db = DATABASE();
SET @fk_registered_by = (
  SELECT IF(
    (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = @db AND TABLE_NAME = 'persons' AND CONSTRAINT_NAME = 'fk_persons_registered_by') > 0,
    'SELECT 1',
    'ALTER TABLE persons ADD CONSTRAINT fk_persons_registered_by FOREIGN KEY (registered_by) REFERENCES system_users(user_id)'
  )
);
PREPARE stmt_fk_registered_by FROM @fk_registered_by;
EXECUTE stmt_fk_registered_by;
DEALLOCATE PREPARE stmt_fk_registered_by;

INSERT INTO departments (dept_name)
SELECT 'Administration' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM departments WHERE dept_name = 'Administration');
INSERT INTO departments (dept_name)
SELECT 'Operations' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM departments WHERE dept_name = 'Operations');

INSERT INTO persons (
  full_name, person_type, mobile, dept_id, status, registered_by, registration_source
)
SELECT 'Ram Prabhu', 'resident_staff', '9000000001',
       (SELECT dept_id FROM departments WHERE dept_name = 'Administration' LIMIT 1),
       'on_campus', NULL, 'seed'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM persons WHERE mobile = '9000000001');

INSERT INTO persons (
  full_name, person_type, mobile, dept_id, status, registered_by, registration_source
)
SELECT 'Gate Staff', 'volunteer_seva', '9000000002',
       (SELECT dept_id FROM departments WHERE dept_name = 'Operations' LIMIT 1),
       'on_campus', NULL, 'seed'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM persons WHERE mobile = '9000000002');

INSERT INTO persons (
  full_name, person_type, mobile, dept_id, status, registered_by, registration_source
)
SELECT 'Anand Prem', 'resident_staff', '9000000003',
       (SELECT dept_id FROM departments WHERE dept_name = 'Administration' LIMIT 1),
       'on_campus', NULL, 'seed'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM persons WHERE mobile = '9000000003');

INSERT INTO system_users (username, password_hash, role, module_access, dept_id, person_id)
SELECT 'ram.prabhu',
  '$2b$12$HJ3psg0Ex7IR8pbkMTRgVeI1vd4bqNr7kOuUtiqIp/FsIyUVGQFDO',
  'super_admin', '{}',
  (SELECT dept_id FROM departments WHERE dept_name = 'Administration' LIMIT 1),
  p.person_id
FROM persons p
WHERE p.mobile = '9000000001'
  AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'ram.prabhu')
LIMIT 1;

INSERT INTO system_users (username, password_hash, role, module_access, dept_id, person_id)
SELECT 'gate.staff',
  '$2b$12$HJ3psg0Ex7IR8pbkMTRgVeI1vd4bqNr7kOuUtiqIp/FsIyUVGQFDO',
  'gate_staff', '{}',
  (SELECT dept_id FROM departments WHERE dept_name = 'Operations' LIMIT 1),
  p.person_id
FROM persons p
WHERE p.mobile = '9000000002'
  AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'gate.staff')
LIMIT 1;

INSERT INTO system_users (username, password_hash, role, module_access, dept_id, person_id)
SELECT 'anandprem',
  '$2b$12$HJ3psg0Ex7IR8pbkMTRgVeI1vd4bqNr7kOuUtiqIp/FsIyUVGQFDO',
  'module_admin', '{}',
  (SELECT dept_id FROM departments WHERE dept_name = 'Administration' LIMIT 1),
  p.person_id
FROM persons p
WHERE p.mobile = '9000000003'
  AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'anandprem')
LIMIT 1;

UPDATE persons p
INNER JOIN system_users u ON u.username = 'ram.prabhu' AND p.mobile = '9000000001' AND p.registered_by IS NULL
SET p.registered_by = u.user_id;

UPDATE persons p
INNER JOIN system_users u ON u.username = 'ram.prabhu'
SET p.registered_by = u.user_id
WHERE p.mobile IN ('9000000002', '9000000003') AND p.registered_by IS NULL;
