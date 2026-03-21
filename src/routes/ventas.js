const express = require('express');
const router  = express.Router();
const pool    = require('../db/conexion');
const generarComprobantePDF = require('../utils/generarPDF');

// ── POST /api/ventas ──
router.post('/', async (req, res) => {
  try {
    const { id_producto, cantidad, cajero } = req.body;

    const prodResult = await pool.query(
      'SELECT * FROM productos WHERE id = $1 AND activo = true', [id_producto]
    );

    if (prodResult.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const producto = prodResult.rows[0];

    if (producto.stock_actual < cantidad) {
      return res.status(400).json({
        error: 'Stock insuficiente. Disponible: ' + producto.stock_actual
      });
    }

    const total      = producto.precio * cantidad;
    const nuevoStock = producto.stock_actual - cantidad;
    const idUsuario  = req.usuario ? req.usuario.id : null;

    const ventaResult = await pool.query(
      `INSERT INTO ventas
       (id_producto, nombre_producto, cantidad, precio_unit, total, cajero, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id_producto, producto.nombre, cantidad, producto.precio, total, cajero, idUsuario]
    );

    await pool.query(
      'UPDATE productos SET stock_actual = $1 WHERE id = $2',
      [nuevoStock, id_producto]
    );

    await pool.query(
      `INSERT INTO movimientos
       (id_producto, nombre_producto, tipo, cantidad, stock_resultante, observacion, id_usuario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id_producto, producto.nombre, 'VENTA', cantidad, nuevoStock,
       'Venta #' + ventaResult.rows[0].id, idUsuario]
    );

    // Auditoría
    if (req.usuario) {
      await pool.query(
        `INSERT INTO auditoria (id_usuario, nombre_usuario, accion, tabla, descripcion)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.usuario.id, req.usuario.nombre, 'VENTA', 'ventas',
         'Venta #' + ventaResult.rows[0].id + ' — ' + producto.nombre + ' x' + cantidad]
      );
    }

    res.status(201).json({
      mensaje:    'Venta registrada correctamente',
      venta:      ventaResult.rows[0],
      stockNuevo: nuevoStock,
      alerta:     nuevoStock <= producto.stock_minimo
        ? '⚠️ Stock bajo: solo quedan ' + nuevoStock + ' unidades'
        : null
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/ventas/resumen ──
router.get('/resumen', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT
        COUNT(*)                   AS total_ventas,
        COALESCE(SUM(total), 0)   AS total_recaudado,
        COALESCE(SUM(cantidad), 0) AS total_unidades
      FROM ventas
    `);
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/ventas/:id/pdf ──
router.get('/:id/pdf', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT * FROM ventas WHERE id = $1', [req.params.id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }
    generarComprobantePDF(resultado.rows[0], res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/ventas ──
router.get('/', async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    let query  = 'SELECT * FROM ventas';
    let params = [];

    if (desde && hasta) {
      query  += ' WHERE fecha::date >= $1 AND fecha::date <= $2';
      params  = [desde, hasta];
    }

    query += ' ORDER BY fecha DESC';
    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;