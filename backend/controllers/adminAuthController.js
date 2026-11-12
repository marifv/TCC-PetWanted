const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const {
    definirCookieAdmin,
    limparCookieAdmin,
} = require('../middleware/autenticacaoAdmin');

const tentativasLogin = new Map();
const JANELA_TENTATIVAS_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS_LOGIN = 5;

function chaveTentativa(req, email) {
    return `${req.ip || 'unknown'}:${email}`;
}

function tentativasBloqueadas(chave) {
    const tentativa = tentativasLogin.get(chave);
    if (!tentativa) return false;
    if (Date.now() - tentativa.inicio >= JANELA_TENTATIVAS_MS) {
        tentativasLogin.delete(chave);
        return false;
    }
    return tentativa.quantidade >= MAX_TENTATIVAS_LOGIN;
}

function registrarFalhaLogin(chave) {
    const agora = Date.now();
    if (tentativasLogin.size > 10000) {
        for (const [email, tentativa] of tentativasLogin) {
            if (agora - tentativa.inicio >= JANELA_TENTATIVAS_MS) tentativasLogin.delete(email);
        }
    }
    const tentativa = tentativasLogin.get(chave);
    if (!tentativa || agora - tentativa.inicio >= JANELA_TENTATIVAS_MS) {
        tentativasLogin.set(chave, { inicio: agora, quantidade: 1 });
        return;
    }
    tentativa.quantidade += 1;
}

function limparTentativasLogin(chave) {
    tentativasLogin.delete(chave);
}

function criarTokenAdmin(admin) {
    return jwt.sign(
        { id: admin.id, tipo: 'admin' },
        process.env.ADMIN_JWT_SECRET,
        { expiresIn: '8h' }
    );
}

async function loginAdmin(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        || email.length > 254
        || !senha
        || Buffer.byteLength(senha, 'utf8') > 72
    ) {
        return res.status(400).json({ mensagem: 'Informe um e-mail e uma senha válidos.' });
    }
    if (!process.env.ADMIN_JWT_SECRET) {
        return res.status(500).json({ mensagem: 'Autenticação administrativa não configurada.' });
    }

    const chave = chaveTentativa(req, email);
    if (tentativasBloqueadas(chave)) {
        return res.status(429).json({ mensagem: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    }

    try {
        const resultado = await pool.query(
            `SELECT id, email, password_hash, role
             FROM admin_accounts
             WHERE LOWER(email) = $1 AND ativo = TRUE`,
            [email]
        );
        const admin = resultado.rows[0];
        const senhaValida = admin
            ? await bcrypt.compare(senha, admin.password_hash)
            : false;

        if (!senhaValida) {
            registrarFalhaLogin(chave);
            return res.status(401).json({ mensagem: 'E-mail ou senha inválidos.' });
        }

        limparTentativasLogin(chave);
        await pool.query(
            'UPDATE admin_accounts SET ultimo_login_em = NOW() WHERE id = $1',
            [admin.id]
        );
        await pool.query(
            `INSERT INTO admin_audit_logs (admin_id, acao)
             VALUES ($1, 'login')`,
            [admin.id]
        );
        const token = criarTokenAdmin(admin);
        definirCookieAdmin(res, token, req);
        return res.json({ admin: { id: admin.id, email: admin.email, role: admin.role } });
    } catch (erro) {
        console.error('Erro ao realizar login administrativo:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível realizar o login administrativo.' });
    }
}

async function aceitarConviteAdmin(req, res) {
    const tokenConvite = String(req.body?.token || '');
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
    if (
        !/^[a-f0-9]{64}$/i.test(tokenConvite)
        || senha.length < 12
        || Buffer.byteLength(senha, 'utf8') > 72
    ) {
        return res.status(400).json({
            mensagem: 'O convite é inválido ou a senha não atende aos requisitos (12 a 72 bytes).',
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const hashToken = crypto.createHash('sha256').update(tokenConvite).digest('hex');
        const convite = await client.query(
            `SELECT id, email, role
             FROM admin_invites
             WHERE token_hash = $1
               AND aceito_em IS NULL
               AND expira_em > NOW()
             FOR UPDATE`,
            [hashToken]
        );
        if (!convite.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensagem: 'O convite é inválido ou expirou.' });
        }

        const dadosConvite = convite.rows[0];
        const senhaHash = await bcrypt.hash(senha, 12);
        const novoAdmin = await client.query(
            `INSERT INTO admin_accounts (email, password_hash, role)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING
             RETURNING id, email, role`,
            [dadosConvite.email, senhaHash, dadosConvite.role]
        );
        if (!novoAdmin.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ mensagem: 'Este e-mail já possui uma conta administrativa.' });
        }

        await client.query(
            'UPDATE admin_invites SET aceito_em = NOW() WHERE id = $1',
            [dadosConvite.id]
        );
        await client.query(
            `INSERT INTO admin_audit_logs (admin_id, acao, email_alvo)
             VALUES ($1, 'convite_aceito', $2)`,
            [novoAdmin.rows[0].id, dadosConvite.email]
        );
        await client.query('COMMIT');
        return res.status(201).json({ mensagem: 'Conta administrativa criada. Você já pode entrar no painel.' });
    } catch (erro) {
        await client.query('ROLLBACK');
        console.error('Erro ao aceitar convite administrativo:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível aceitar o convite.' });
    } finally {
        client.release();
    }
}

function sairAdmin(_req, res) {
    limparCookieAdmin(res, _req);
    return res.status(204).end();
}

function obterSessaoAdmin(req, res) {
    return res.json({
        admin: {
            id: req.admin.id,
            email: req.admin.email,
            role: req.admin.role,
        },
    });
}

module.exports = {
    loginAdmin,
    aceitarConviteAdmin,
    sairAdmin,
    obterSessaoAdmin,
};
