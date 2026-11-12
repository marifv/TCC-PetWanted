const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const ultimoRegistroAtividade = new Map();

function registrarAtividadeDiaria(usuarioId) {
    const diaAtual = new Date().toISOString().slice(0, 10);
    if (ultimoRegistroAtividade.get(usuarioId) === diaAtual) return;

    ultimoRegistroAtividade.set(usuarioId, diaAtual);
    if (ultimoRegistroAtividade.size > 10000) {
        for (const [id, dia] of ultimoRegistroAtividade) {
            if (dia !== diaAtual) {
                ultimoRegistroAtividade.delete(id);
            }
        }
    }

    Promise.resolve(pool.query(
        `INSERT INTO usuarios_atividade_diaria (usuario_id, dia)
         VALUES ($1, $2::date)
         ON CONFLICT (usuario_id, dia) DO NOTHING`,
        [usuarioId, diaAtual]
    )).catch((erro) => {
        ultimoRegistroAtividade.delete(usuarioId);
        console.error('Não foi possível registrar atividade diária do usuário:', erro.message);
    });
}

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
        if (
            typeof res.once === 'function'
            && Number.isInteger(Number(req.usuario.id))
            && Number(req.usuario.id) > 0
        ) {
            const usuarioId = Number(req.usuario.id);
            res.once('finish', () => registrarAtividadeDiaria(usuarioId));
        }
        return next();
    } catch (error) {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    }
}

module.exports = autenticarToken;