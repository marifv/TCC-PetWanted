const express = require('express');
const cors = require('cors');
const path = require('path');
const usuarioRoutes = require('./routes/usuarioRoutes');
const animalRoutes = require('./routes/animalRoutes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '12mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok' });
});

app.use('/api/usuarios', usuarioRoutes);
app.use('/api/animais', animalRoutes);

module.exports = app;