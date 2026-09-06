const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
    const autorizacao = req.headers.authorization;
    const token = autorizacao?.startsWith('Bearer ')
        ? autorizacao.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ mensagem: 'Token não informado.' });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ mensagem: 'Autenticação não configurada no servidor.' });
    }

    try {
        req.usuario = jwt.verify(token, process.env.JWT_SECRET);
        return next();
    } catch (error) {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    }
}

module.exports = autenticarToken;