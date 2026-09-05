const express = require('express');
const { criarUsuario } = require('../controllers/usuarioController');

const router = express.Router();

router.post('/', criarUsuario);
router.get('/', (req, res) => {
    res.send('Rota de usuário funcionando!');
});

module.exports = router;