const express = require('express');
const {
    loginAdmin,
    aceitarConviteAdmin,
    sairAdmin,
    obterSessaoAdmin,
} = require('../controllers/adminAuthController');
const {
    obterEstatisticas,
    listarAdministradores,
    convidarAdministrador,
    atualizarAdministrador,
    listarAuditoria,
} = require('../controllers/adminController');
const {
    autenticarAdmin,
    exigirPapelAdmin,
} = require('../middleware/autenticacaoAdmin');

const router = express.Router();

router.post('/auth/login', loginAdmin);
router.post('/auth/logout', sairAdmin);
router.post('/auth/aceitar-convite', aceitarConviteAdmin);
router.get('/auth/me', autenticarAdmin, obterSessaoAdmin);
router.get('/estatisticas', autenticarAdmin, obterEstatisticas);
router.get('/administradores', autenticarAdmin, exigirPapelAdmin('owner'), listarAdministradores);
router.post('/administradores/convites', autenticarAdmin, exigirPapelAdmin('owner'), convidarAdministrador);
router.patch('/administradores/:id', autenticarAdmin, exigirPapelAdmin('owner'), atualizarAdministrador);
router.get('/auditoria', autenticarAdmin, exigirPapelAdmin('owner'), listarAuditoria);

module.exports = router;
