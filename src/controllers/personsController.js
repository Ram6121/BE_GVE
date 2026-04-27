const pool = require('../db');

const ALIVE_STATUSES = ['pre_registered', 'on_campus'];

async function list(req, res) {
  const { type, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const lim = Number(limit);

  try {
    const placeholders = ALIVE_STATUSES.map(() => '?').join(', ');
    let sql = `SELECT * FROM persons WHERE status IN (${placeholders})`;
    const params = [...ALIVE_STATUSES];

    if (type) {
      sql += ' AND person_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(lim, offset);

    const result = await pool.query(sql, params);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getById(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM persons WHERE person_id = ?',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function create(req, res) {
  const {
    full_name, person_type, mobile,
    dept_id, id_proof_type, id_proof_number,
    date_of_birth, gender,
    perm_address, city, state, pincode,
    accommodation_block, room_number,
    registration_source,
  } = req.body;

  if (!full_name || !person_type || !mobile) {
    return res.status(400).json({ error: 'full_name, person_type, and mobile are required' });
  }

  try {
    const ins = await pool.query(
      `INSERT INTO persons
        (full_name, person_type, mobile, dept_id,
         id_proof_type, id_proof_number, date_of_birth, gender,
         perm_address, city, state, pincode,
         accommodation_block, room_number,
         registered_by, registration_source, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pre_registered')`,
      [
        full_name, person_type, mobile, dept_id,
        id_proof_type, id_proof_number, date_of_birth, gender,
        perm_address, city, state, pincode,
        accommodation_block, room_number,
        req.user.user_id, registration_source || 'admin_portal',
      ]
    );
    const pid = Number(ins.insertId);
    const sel = await pool.query('SELECT * FROM persons WHERE person_id = ?', [pid]);
    res.status(201).json({ data: sel.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function update(req, res) {
  const fields = req.body;
  const allowed = [
    'full_name','mobile','dept_id','id_proof_type','id_proof_number',
    'date_of_birth','gender','perm_address','city','state','pincode',
    'accommodation_block','room_number','status',
  ];

  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (keys.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const updates = keys.map((k) => `${k} = ?`);
  const values = keys.map(k => fields[k]);

  try {
    const upd = await pool.query(
      `UPDATE persons SET ${updates.join(', ')}, updated_at = NOW()
       WHERE person_id = ?`,
      [...values, req.params.id]
    );
    if (upd.rowCount === 0) return res.status(404).json({ error: 'Person not found' });
    const sel = await pool.query('SELECT * FROM persons WHERE person_id = ?', [req.params.id]);
    res.json({ data: sel.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { list, getById, create, update };
