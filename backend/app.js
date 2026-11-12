const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const usuarioRoutes = require('./routes/usuarioRoutes');
const animalRoutes = require('./routes/animalRoutes');
const localRoutes = require('./routes/localRoutes');
const chatRoutes = require('./routes/chatRoutes');
const iaRoutes = require('./routes/iaRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '32mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', (req, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('Referrer-Policy', 'no-referrer');
	res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' https: data:; style-src 'self'; script-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'");
	next();
}, express.static(path.join(__dirname, 'admin-panel')));

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/animais', animalRoutes);
app.use('/api/locais', localRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ia', iaRoutes);
app.use('/api/admin', adminRoutes);

module.exports = app;