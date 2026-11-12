const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const NOME_COOKIE_ADMIN = 'petwanted_admin_session';

function cookieSegura(req) {
    return process.env.NODE_ENV === 'production'
        || req.secure
        || req.get('x-forwarded-proto') === 'https';
}

function obterToken(req) {
    const cookie = req.headers.cookie
        ?.split(';')
        .map((item) => item.trim())
        .find((item) => item.startsWith(`${NOME_COOKIE_ADMIN}=`));

    return cookie ? cookie.slice(NOME_COOKIE_ADMIN.length + 1) : null;
}

function definirCookieAdmin(res, token, req) {
    res.cookie(NOME_COOKIE_ADMIN, token, {
        httpOnly: true,
        secure: cookieSegura(req),
        sameSite: 'strict',
        path: '/api/admin',
        maxAge: 8 * 60 * 60 * 1000,
    });
}

function limparCookieAdmin(res, req) {
    res.clearCookie(NOME_COOKIE_ADMIN, {
        httpOnly: true,
        secure: cookieSegura(req),
        sameSite: 'strict',
        path: '/api/admin',
    });
}

async function autenticarAdmin(req, res, next) {
    const token = obterToken(req);
    if (!token) {
        return res.status(401).json({ mensagem: 'Sessão administrativa não encontrada.' });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
        return res.status(500).json({ mensagem: 'Autenticação administrativa não configurada.' });
    }

    try {
        const sessao = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
        if (sessao.tipo !== 'admin' || !Number.isInteger(Number(sessao.id)) || Number(sessao.id) <= 0) {
            return res.status(401).json({ mensagem: 'Sessão administrativa inválida.' });
        }

        const resultado = await pool.query(
            `SELECT id, email, role, ativo
             FROM admin_accounts
             WHERE id = $1 AND ativo = TRUE`,
            [sessao.id]
        );
        if (!resultado.rows.length) {
            return res.status(401).json({ mensagem: 'Sessão administrativa inválida.' });
        }

        req.admin = resultado.rows[0];
        return next();
    } catch (erro) {
        if (erro.name === 'JsonWebTokenError' || erro.name === 'TokenExpiredError') {
            return res.status(401).json({ mensagem: 'Sessão administrativa inválida ou expirada.' });
        }
        console.error('Erro ao validar sessão administrativa:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível validar a sessão administrativa.' });
    }
}

function exigirPapelAdmin(...papeis) {
    return (req, res, next) => {
        if (!papeis.includes(req.admin?.role)) {
            return res.status(403).json({ mensagem: 'Você não tem permissão para esta ação.' });
        }
        return next();
    };
}

module.exports = {
    NOME_COOKIE_ADMIN,
    autenticarAdmin,
    exigirPapelAdmin,
    definirCookieAdmin,
    limparCookieAdmin,
};
