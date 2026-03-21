const express = require('express');
const router  = express.Router();
const pool    = require('../db/conexion');

// ── GET /api/auditoria ──
router.get('/', async (req, res) => {
  try {
    const { desde, hasta, usuario } = req.query;
    let query  = 'SELECT * FROM auditoria';
    let params = [];
    let where  = [];

    if (desde && hasta) {
      params.push(desde, hasta);
      where.push(`fecha::date >= $${params.length - 1} AND fecha::date <= $${params.length}`);
    }

    if (usuario) {
      params.push('%' + usuario + '%');
      where.push(`nombre_usuario ILIKE $${params.length}`);
    }

    if (where.length > 0) query += ' WHERE ' + where.join(' AND ');
    query += ' ORDER BY fecha DESC LIMIT 100';

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;