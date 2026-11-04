const express = require('express');
const autenticarToken = require('../middleware/autenticacao');
const {
    analisarAnuncioPorId,
    listarMatchesDoUsuario,
    atualizarStatusMatch,
} = require('../controllers/iaController');

const router = express.Router();

router.post('/anuncios/:id/analisar', autenticarToken, analisarAnuncioPorId);
router.get('/matches', autenticarToken, listarMatchesDoUsuario);
router.post('/matches/:id/aceitar', autenticarToken, (req, res, next) => {
    req.body = req.body || {};
    req.body.status = 'aceito_usuario';
    atualizarStatusMatch(req, res, next);
});
router.post('/matches/:id/descartar', autenticarToken, (req, res, next) => {
    req.body = req.body || {};
    req.body.status = 'descartado_usuario';
    atualizarStatusMatch(req, res, next);
});

module.exports = router;
