const express = require('express');
const router  = express.Router();
const pool    = require('../db/conexion');

// ── GET /api/proveedores ──
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM proveedores WHERE activo = true ORDER BY id ASC'
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/proveedores ──
router.post('/', async (req, res) => {
  try {
    const { nombre, ruc, telefono, email, direccion } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
    }

    const resultado = await pool.query(
      `INSERT INTO proveedores (nombre, ruc, telefono, email, direccion)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, ruc || null, telefono || null, email || null, direccion || null]
    );

    // Auditoría
    if (req.usuario) {
      await pool.query(
        `INSERT INTO auditoria (id_usuario, nombre_usuario, accion, tabla, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.usuario.id, req.usuario.nombre, 'CREAR', 'proveedores',
         'Proveedor creado: ' + nombre]
      );
    }

    res.status(201).json({
      mensaje:    'Proveedor registrado correctamente',
      proveedor:  resultado.rows[0]
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/proveedores/:id ──
router.put('/:id', async (req, res) => {
  try {
    const { id }                             = req.params;
    const { nombre, ruc, telefono, email, direccion } = req.body;

    const resultado = await pool.query(
      `UPDATE proveedores
       SET nombre=$1, ruc=$2, telefono=$3, email=$4, direccion=$5
       WHERE id=$6 RETURNING *`,
      [nombre, ruc, telefono, email, direccion, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    res.json({ mensaje: 'Proveedor actualizado', proveedor: resultado.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/proveedores/:id — desactivar ──
router.delete('/:id', async (req, res) => {
  try {
    await pool.query(
      'UPDATE proveedores SET activo = false WHERE id = $1', [req.params.id]
    );
    res.json({ mensaje: 'Proveedor desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;