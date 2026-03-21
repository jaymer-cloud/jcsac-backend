const express  = require('express');
const cors     = require('cors');
require('dotenv').config();

const crearTablas        = require('./db/tablas');
const rutasAuth          = require('./routes/auth');
const rutasProductos     = require('./routes/productos');
const rutasVentas        = require('./routes/ventas');
const rutasProveedores   = require('./routes/proveedores');
const rutasAuditoria     = require('./routes/auditoria');
const { verificarToken, soloAdmin } = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    mensaje: '🏥 J.C-SAC API v4.0',
    estado:  'ok'
  });
});

// Rutas públicas
app.use('/api/auth', rutasAuth);
app.use('/api/ventas', rutasVentas);
app.use('/api/productos', rutasProductos);

// Rutas protegidas solo admin
app.use('/api/proveedores', verificarToken, soloAdmin, rutasProveedores);
app.use('/api/auditoria',   verificarToken, soloAdmin, rutasAuditoria);

app.listen(PORT, async () => {
  console.log(`✅ Servidor J.C-SAC corriendo en http://localhost:${PORT}`);
  await crearTablas();
});
