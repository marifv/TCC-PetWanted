const express = require('express');
const {
    listarRegistros,
    criarRegistro,
    atualizarRegistro,
    excluirRegistro
} = require('../controllers/animalController');

const router = express.Router();

router.get('/:usuarioId', listarRegistros);
router.post('/:usuarioId', criarRegistro);
router.put('/:usuarioId/:id', atualizarRegistro);
router.delete('/:usuarioId/:id', excluirRegistro);

module.exports = router;
