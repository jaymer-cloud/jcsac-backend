const pool    = require('./conexion');
const bcrypt  = require('bcryptjs');

async function crearTablas() {
  try {

    // ── Tabla: usuarios ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id             SERIAL PRIMARY KEY,
        nombre         VARCHAR(100) NOT NULL,
        email          VARCHAR(150) NOT NULL UNIQUE,
        password       VARCHAR(255) NOT NULL,
        rol            VARCHAR(20)  NOT NULL DEFAULT 'cajero',
        activo         BOOLEAN DEFAULT true,
        fecha_registro TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla usuarios lista');

    // ── Tabla: proveedores ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id             SERIAL PRIMARY KEY,
        nombre         VARCHAR(200) NOT NULL,
        ruc            VARCHAR(20),
        telefono       VARCHAR(20),
        email          VARCHAR(150),
        direccion      TEXT,
        activo         BOOLEAN DEFAULT true,
        fecha_registro TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla proveedores lista');

    // ── Tabla: productos ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id              SERIAL PRIMARY KEY,
        codigo_barras   VARCHAR(50) UNIQUE,
        nombre          VARCHAR(200) NOT NULL UNIQUE,
        categoria       VARCHAR(100) NOT NULL,
        precio          DECIMAL(10,2) NOT NULL,
        stock_actual    INTEGER NOT NULL DEFAULT 0,
        stock_minimo    INTEGER NOT NULL DEFAULT 0,
        unidad          VARCHAR(50) NOT NULL,
        id_proveedor    INTEGER REFERENCES proveedores(id),
        activo          BOOLEAN DEFAULT true,
        fecha_registro  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla productos lista');

    // ── Tabla: ventas ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id              SERIAL PRIMARY KEY,
        id_producto     INTEGER REFERENCES productos(id),
        nombre_producto VARCHAR(200),
        cantidad        INTEGER NOT NULL,
        precio_unit     DECIMAL(10,2) NOT NULL,
        total           DECIMAL(10,2) NOT NULL,
        cajero          VARCHAR(100),
        id_usuario      INTEGER REFERENCES usuarios(id),
        fecha           TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla ventas lista');

    // ── Tabla: movimientos ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimientos (
        id               SERIAL PRIMARY KEY,
        id_producto      INTEGER REFERENCES productos(id),
        nombre_producto  VARCHAR(200),
        tipo             VARCHAR(50),
        cantidad         INTEGER,
        stock_resultante INTEGER,
        observacion      TEXT,
        id_usuario       INTEGER REFERENCES usuarios(id),
        fecha            TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla movimientos lista');

    // ── Tabla: auditoria ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id          SERIAL PRIMARY KEY,
        id_usuario  INTEGER REFERENCES usuarios(id),
        nombre_usuario VARCHAR(100),
        accion      VARCHAR(100) NOT NULL,
        tabla       VARCHAR(50),
        descripcion TEXT,
        ip          VARCHAR(50),
        fecha       TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla auditoria lista');

    // ── Tabla: ordenes_compra ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ordenes_compra (
        id            SERIAL PRIMARY KEY,
        id_proveedor  INTEGER REFERENCES proveedores(id),
        nombre_proveedor VARCHAR(200),
        estado        VARCHAR(20) DEFAULT 'pendiente',
        total         DECIMAL(10,2) DEFAULT 0,
        id_usuario    INTEGER REFERENCES usuarios(id),
        observacion   TEXT,
        fecha         TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla ordenes_compra lista');

    // ── Tabla: detalle_ordenes ──
    await pool.query(`
      CREATE TABLE IF NOT EXISTS detalle_ordenes (
        id            SERIAL PRIMARY KEY,
        id_orden      INTEGER REFERENCES ordenes_compra(id),
        id_producto   INTEGER REFERENCES productos(id),
        nombre_producto VARCHAR(200),
        cantidad      INTEGER NOT NULL,
        precio_unit   DECIMAL(10,2) NOT NULL,
        subtotal      DECIMAL(10,2) NOT NULL
      );
    `);
    console.log('✅ Tabla detalle_ordenes lista');

    // ── Crear usuario admin por defecto ──
    const adminExiste = await pool.query(
      "SELECT id FROM usuarios WHERE email = 'hacha19888@gmail.com'"
    );

    if (adminExiste.rows.length === 0) {
      const passHash = await bcrypt.hash('alexachazo12345', 10);
      await pool.query(
        `INSERT INTO usuarios (nombre, email, password, rol)
         VALUES ($1, $2, $3, $4)`,
        ['Administrador', 'hacha19888@gmail.com', passHash, 'admin']
      );
      console.log('✅ Usuario admin creado:');
      console.log('   Email:    hacha19888@gmail.com');
      console.log('   Password: alexachazo12345');
    }

    console.log('✅ Base de datos J.C-SAC lista para usar');

  } catch (error) {
    console.error('❌ Error creando tablas:', error.message);
  }
}

module.exports = crearTablas;