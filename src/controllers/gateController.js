const pool = require('../db');

function normalizeZoneAccess(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') {
    return Object.values(raw);
  }
  return [];
}

// Main scan endpoint — called by Gate Tablet App.
async function scanQR(req, res) {
  const { qr_id, gate } = req.body;

  if (!qr_id || !gate) {
    return res.status(400).json({ error: 'qr_id and gate are required' });
  }

  try {
    const result = await pool.query(
      `SELECT
         qp.qr_id, qp.zone_access, qp.valid_from, qp.valid_until,
         qp.group_size, qp.is_active, qp.pass_type,
         p.person_id, p.full_name, p.person_type, p.mobile,
         p.dept_id, p.status,
         d.dept_name
       FROM qr_passes qp
       JOIN persons p  ON qp.person_id = p.person_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       WHERE qp.qr_id = ?`,
      [qr_id]
    );

    if (result.rows.length === 0) {
      return await logAndRespond(req, res, gate, null, 'denied', 'QR code not found in system', null);
    }

    const pass = result.rows[0];
    pass.zone_access = normalizeZoneAccess(pass.zone_access);

    if (!pass.is_active) {
      return await logAndRespond(req, res, gate, pass, 'denied', 'QR pass has been deactivated', null);
    }

    const now = new Date();
    if (pass.valid_from && new Date(pass.valid_from) > now) {
      return await logAndRespond(req, res, gate, pass, 'denied', 'QR pass is not yet valid', null);
    }
    if (pass.valid_until && new Date(pass.valid_until) < now) {
      return await logAndRespond(req, res, gate, pass, 'denied', 'QR pass has expired', null);
    }

    const gateZoneMap = {
      main_gate:  'zone1',
      gate_7:     'zone2',
      sbt_gate:   'zone3',
      exit_gate:  null,
    };
    const requiredZone = gateZoneMap[gate];

    if (requiredZone && !pass.zone_access.includes(requiredZone)) {
      const upgradeEligible = gate === 'sbt_gate' &&
        ['free_day_visitor','paid_day_visitor','corporate_tour_group'].includes(pass.person_type);

      return await logAndRespond(
        req, res, gate, pass, 'denied',
        `${requiredZone.replace('zone','Zone ')} access not permitted for this pass`,
        upgradeEligible ? 'Offer Zone 3 café upgrade — Rs.350 per person' : 'Contact admin for access'
      );
    }

    return await logAndRespond(req, res, gate, pass, 'allowed', null, null);
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Server error during scan' });
  }
}

async function logAndRespond(req, res, gate, pass, result, deny_reason, action) {
  try {
    await pool.query(
      `INSERT INTO gate_events
        (person_id, qr_id, gate, event_type, result, deny_reason, scanned_by)
       VALUES (?, ?, ?, 'entry', ?, ?, ?)`,
      [
        pass?.person_id || null,
        pass?.qr_id || null,
        gate,
        result,
        deny_reason,
        req.user?.user_id || null,
      ]
    );
  } catch (err) {
    console.error('Gate event log error:', err.message);
  }

  if (result === 'denied' || !pass) {
    return res.json({
      result: 'deny',
      person: pass ? buildPersonResponse(pass) : null,
      deny_reason: deny_reason || 'Unknown QR code',
      action,
    });
  }

  return res.json({
    result: 'allow',
    person: buildPersonResponse(pass),
    deny_reason: null,
    action: null,
  });
}

function buildPersonResponse(pass) {
  return {
    name:       pass.full_name,
    type:       pass.person_type,
    dept:       pass.dept_name || '—',
    stay:       pass.valid_until
      ? new Date(pass.valid_until).toLocaleDateString('en-IN')
      : 'Permanent',
    pass_type:  pass.pass_type,
    mobile:     pass.mobile,
    zones:      pass.zone_access,
    group_size: pass.group_size || 1,
  };
}

async function gateStats(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         gate,
         SUM(CASE WHEN result = 'allowed' THEN 1 ELSE 0 END) AS allowed,
         SUM(CASE WHEN result = 'denied' THEN 1 ELSE 0 END) AS denied,
         MAX(scanned_at) AS last_scan
       FROM gate_events
       WHERE DATE(scanned_at) = CURDATE()
       GROUP BY gate`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function batchEntry(req, res) {
  const { gate, count, note } = req.body;
  if (!gate || !count) {
    return res.status(400).json({ error: 'gate and count required' });
  }
  try {
    await pool.query(
      `INSERT INTO gate_events
        (gate, event_type, result, is_batch_count, batch_count, deny_reason, scanned_by)
       VALUES (?, 'entry', 'allowed', 1, ?, ?, ?)`,
      [gate, count, note || 'Festival batch entry', req.user.user_id]
    );
    res.json({ success: true, message: `Batch entry of ${count} recorded at ${gate}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function override(req, res) {
  const { gate, person_id, reason } = req.body;
  if (!gate || !reason) {
    return res.status(400).json({ error: 'gate and reason required' });
  }
  try {
    await pool.query(
      `INSERT INTO gate_events
        (person_id, gate, event_type, result, deny_reason, scanned_by)
       VALUES (?, ?, 'entry', 'manual_override', ?, ?)`,
      [person_id || null, gate, `MANUAL OVERRIDE: ${reason}`, req.user.user_id]
    );
    await pool.query(
      `INSERT INTO audit_log
        (user_id, action, module, \`table_name\`, record_id, new_value, ip_address)
       VALUES (?, 'MANUAL_GATE_OVERRIDE', 'gate', 'gate_events', ?, ?, ?)`,
      [
        req.user.user_id,
        person_id || null,
        JSON.stringify({ gate, reason, person_id }),
        req.ip,
      ]
    );
    res.json({ success: true, message: 'Override logged.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { scanQR, gateStats, batchEntry, override };
