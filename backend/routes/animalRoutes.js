const express = require('express');
const {
    listarRegistros,
    listarAnimaisPerdidos,
    listarAnimaisEncontrados,
    listarAnimaisAdocao,
    criarRegistro,
    atualizarRegistro,
    excluirRegistro
} = require('../controllers/animalController');
const autenticarToken = require('../middleware/autenticacao');

const router = express.Router();

router.get('/perdidos', autenticarToken, listarAnimaisPerdidos);
router.get('/adocao', autenticarToken, listarAnimaisAdocao);
router.get('/encontrados', listarAnimaisEncontrados);
router.post('/:usuarioId', criarRegistro);
router.put('/:usuarioId/:id', autenticarToken, atualizarRegistro);
router.delete('/:usuarioId/:id', autenticarToken, excluirRegistro);

module.exports = router;
