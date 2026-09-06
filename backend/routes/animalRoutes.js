const express = require('express');
const {
    listarRegistros,
    listarAnimaisPerdidos,
    criarRegistro,
    atualizarRegistro,
    excluirRegistro
} = require('../controllers/animalController');
const autenticarToken = require('../middleware/autenticacao');

const router = express.Router();

router.get('/perdidos', autenticarToken, listarAnimaisPerdidos);
router.get('/:usuarioId', listarRegistros);
router.post('/:usuarioId', criarRegistro);
router.put('/:usuarioId/:id', atualizarRegistro);
router.delete('/:usuarioId/:id', excluirRegistro);

module.exports = router;
