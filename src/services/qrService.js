const { randomUUID } = require('crypto');
const QRCode = require('qrcode');
const pool   = require('../db');

// pass_type is required. zone_access stored as JSON (MySQL JSON column).
async function createQRPass(
  person_id, zone_access, valid_from, valid_until, group_size,
  pass_type = 'day_pass'
) {
  const qr_id = randomUUID();
  await pool.query(
    `INSERT INTO qr_passes
      (qr_id, person_id, pass_type, zone_access, valid_from, valid_until, group_size, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      qr_id,
      person_id,
      pass_type,
      JSON.stringify(zone_access),
      valid_from,
      valid_until,
      group_size || 1,
    ]
  );
  const sel = await pool.query('SELECT * FROM qr_passes WHERE qr_id = ?', [qr_id]);
  return sel.rows[0];
}

async function generateQRImage(qr_id) {
  return await QRCode.toDataURL(qr_id, {
    width: 400, margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

function getQRPublicURL(qr_id) {
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  return `${base}/api/gate/image/${qr_id}`;
}

function getZoneAccess(person_type) {
  const zoneMap = {
    room_guest:                 ['zone1','zone2','zone3'],
    paid_day_visitor:           ['zone1','zone2'],
    free_day_visitor:           ['zone1','zone2'],
    course_student:             ['zone1','zone2','zone3'],
    volunteer_seva:             ['zone1','zone2','zone3'],
    sustainability_intern:      ['zone1','zone2','zone3'],
    resident_staff:             ['zone1','zone2','zone3','zone4'],
    staff_dependant:            ['zone1','zone2','zone3'],
    brahmachari:                ['zone1','zone2','zone3','zone4'],
    varishtha_vaishnava:        ['zone1','zone2','zone3','zone4'],
    weekly_labourer_local:      ['zone1','zone2','zone3'],
    weekly_labourer_outstation: ['zone1','zone2','zone3'],
    construction_labourer:      ['zone1','zone2','zone3'],
    vendor_supplier:            ['zone1'],
    corporate_tour_group:       ['zone1','zone2'],
    vip_dignitary:              ['zone1','zone2','zone3','zone4'],
  };
  return zoneMap[person_type] || ['zone1'];
}

module.exports = { createQRPass, generateQRImage, getQRPublicURL, getZoneAccess };
