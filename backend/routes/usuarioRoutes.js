const express = require('express');
const { criarUsuario } = require('../controllers/usuarioController');
const { loginUsuario } = require('../controllers/loginController');
const {
    loginGoogle,
    vincularContaGoogle,
    cadastrarComGoogle
} = require('../controllers/googleAuthController');
const autenticarToken = require('../middleware/autenticacao');
const {
    modificarPerfil,
    excluirPerfil
} = require('../controllers/perfilController');
const {
    enviarCodigoRecuperacao,
    verificarCodigoRecuperacao,
    redefinirSenha
} = require('../controllers/passwordRecoveryController');

const router = express.Router();

router.post('/', criarUsuario);
router.post('/login', loginUsuario);
router.post('/google', loginGoogle);
router.post('/google/vincular', vincularContaGoogle);
router.post('/google/cadastro', cadastrarComGoogle);
router.post('/recuperar-senha/enviar-codigo', enviarCodigoRecuperacao);
router.post('/recuperar-senha/verificar-codigo', verificarCodigoRecuperacao);
router.post('/recuperar-senha/redefinir', redefinirSenha);
router.put('/:id', modificarPerfil);
router.delete('/:id', autenticarToken, excluirPerfil);

module.exports = router;