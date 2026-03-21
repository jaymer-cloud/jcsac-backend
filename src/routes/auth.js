const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/conexion');

const SECRET = process.env.JWT_SECRET || 'jcsac_secret_2024';

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true', [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario    = resultado.rows[0];
    const passValida = await bcrypt.compare(password, usuario.password);

    if (!passValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      SECRET,
      { expiresIn: '8h' }
    );

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (id_usuario, nombre_usuario, accion, tabla, descripcion)
       VALUES ($1, $2, $3, $4, $5)`,
      [usuario.id, usuario.nombre, 'LOGIN', 'usuarios', 'Inicio de sesión exitoso']
    );

    res.json({
      mensaje: '✅ Bienvenido, ' + usuario.nombre,
      token,
      usuario: {
        id:     usuario.id,
        nombre: usuario.nombre,
        email:  usuario.email,
        rol:    usuario.rol
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/auth/registro ──
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const passHash  = await bcrypt.hash(password, 10);
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol`,
      [nombre, email, passHash, rol || 'cajero']
    );

    res.status(201).json({
      mensaje:  'Usuario creado correctamente',
      usuario:  resultado.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/auth/usuarios — solo admin ──
router.get('/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, nombre, email, rol, activo, fecha_registro FROM usuarios ORDER BY id ASC'
    );
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/auth/usuarios/:id — desactivar usuario ──
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE usuarios SET activo = false WHERE id = $1', [id]);
    res.json({ mensaje: 'Usuario desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;