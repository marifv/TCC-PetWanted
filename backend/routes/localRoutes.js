const express = require('express');
const { buscarSugestoesEndereco, obterCoordenadasLugar } = require('../controllers/localController');
const autenticarToken = require('../middleware/autenticacao');

const router = express.Router();

router.get('/autocomplete', autenticarToken, buscarSugestoesEndereco);
router.get('/details/:placeId', autenticarToken, obterCoordenadasLugar);

module.exports = router;