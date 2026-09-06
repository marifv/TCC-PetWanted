const express = require('express');
const { criarUsuario } = require('../controllers/usuarioController');
const { loginUsuario } = require('../controllers/loginController');
const {
    modificarPerfil,
    excluirPerfil
} = require('../controllers/perfilController');

const router = express.Router();

router.post('/', criarUsuario);
router.post('/login', loginUsuario);
router.put('/:id', modificarPerfil);
router.delete('/:id', excluirPerfil);
router.get('/', (req, res) => {
    res.send('Rota de usuário funcionando!');
});

module.exports = router;