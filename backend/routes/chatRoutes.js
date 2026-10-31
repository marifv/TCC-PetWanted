const express = require('express');
const autenticarToken = require('../middleware/autenticacao');
const {
    buscarUsuarios,
    listarConversas,
    contarNotificacoes,
    listarNotificacoes,
    criarConversa,
    listarMensagens,
    registrarDispositivo,
    alterarSilenciamento,
    excluirConversa,
    denunciarConversa
} = require('../controllers/chatController');

const router = express.Router();

router.use(autenticarToken);
router.get('/usuarios', buscarUsuarios);
router.get('/conversas', listarConversas);
router.get('/notificacoes', contarNotificacoes);
router.get('/notificacoes/lista', listarNotificacoes);
router.post('/conversas', criarConversa);
router.get('/conversas/:id/mensagens', listarMensagens);
router.patch('/conversas/:id/silenciamento', alterarSilenciamento);
router.delete('/conversas/:id', excluirConversa);
router.post('/conversas/:id/denuncias', denunciarConversa);
router.post('/dispositivos', registrarDispositivo);

module.exports = router;