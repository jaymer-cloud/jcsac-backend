const express = require('express');
const router  = express.Router();
const pool    = require('../db/conexion');

// ── GET /api/productos ──
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT p.*, pr.nombre as proveedor_nombre
       FROM productos p
       LEFT JOIN proveedores pr ON p.id_proveedor = pr.id
       WHERE p.activo = true
       ORDER BY p.id ASC`
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/productos/barras/:codigo ──
router.get('/barras/:codigo', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM productos WHERE codigo_barras = $1 AND activo = true',
      [req.params.codigo]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/productos/:id ──
router.get('/:id', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM productos WHERE id = $1 AND activo = true',
      [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/productos ──
router.post('/', async (req, res) => {
  try {
    const nombre        = req.body.nombre;
    const categoria     = req.body.categoria;
    const precio        = req.body.precio;
    const stock_actual  = req.body.stock_actual  || 0;
    const stock_minimo  = req.body.stock_minimo  || 0;
    const unidad        = req.body.unidad;
    const codigo_barras = req.body.codigo_barras || null;
    const id_proveedor  = req.body.id_proveedor  || null;

    if (!nombre || !categoria || !precio || !unidad) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const resultado = await pool.query(
      `INSERT INTO productos
       (codigo_barras, nombre, categoria, precio, stock_actual, stock_minimo, unidad, id_proveedor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [codigo_barras, nombre, categoria, precio, stock_actual, stock_minimo, unidad, id_proveedor]
    );

    // Registrar en auditoría
    if (req.usuario) {
      await pool.query(
        `INSERT INTO auditoria (id_usuario, nombre_usuario, accion, tabla, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.usuario.id, req.usuario.nombre, 'CREAR', 'productos',
         'Producto creado: ' + nombre]
      );
    }

    res.status(201).json({
      mensaje:  'Producto registrado correctamente',
      producto: resultado.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un producto con ese nombre o código' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/productos/:id ──
router.put('/:id', async (req, res) => {
  try {
    const { id }        = req.params;
    const nombre        = req.body.nombre;
    const categoria     = req.body.categoria;
    const precio        = req.body.precio;
    const stock_actual  = req.body.stock_actual;
    const stock_minimo  = req.body.stock_minimo;
    const unidad        = req.body.unidad;
    const codigo_barras = req.body.codigo_barras || null;
    const id_proveedor  = req.body.id_proveedor  || null;

    const resultado = await pool.query(
      `UPDATE productos
       SET codigo_barras=$1, nombre=$2, categoria=$3, precio=$4,
           stock_actual=$5, stock_minimo=$6, unidad=$7, id_proveedor=$8
       WHERE id=$9 RETURNING *`,
      [codigo_barras, nombre, categoria, precio,
       stock_actual, stock_minimo, unidad, id_proveedor, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Auditoría
    if (req.usuario) {
      await pool.query(
        `INSERT INTO auditoria (id_usuario, nombre_usuario, accion, tabla, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.usuario.id, req.usuario.nombre, 'EDITAR', 'productos',
         'Producto editado: ' + nombre]
      );
    }

    res.json({ mensaje: 'Producto actualizado', producto: resultado.rows[0] });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/productos/:id — desactivar ──
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await pool.query(
      'UPDATE productos SET activo = false WHERE id = $1 RETURNING nombre',
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    // Auditoría
    if (req.usuario) {
      await pool.query(
        `INSERT INTO auditoria (id_usuario, nombre_usuario, accion, tabla, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.usuario.id, req.usuario.nombre, 'DESACTIVAR', 'productos',
         'Producto desactivado: ' + resultado.rows[0].nombre]
      );
    }

    res.json({ mensaje: 'Producto desactivado correctamente' });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;