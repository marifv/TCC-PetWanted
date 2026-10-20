const bcrypt = require('bcrypt');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

const googleClient = new OAuth2Client();

function criarTokenPetWanted(usuario) {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET não está configurado.');
    }

    return jwt.sign(
        { id: usuario.id, email: usuario.email },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
}

function dadosDaSessao(usuario) {
    return {
        token: criarTokenPetWanted(usuario),
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        documento: usuario.documento,
        telefone: usuario.telefone,
        localizacao: usuario.localizacao,
        latitude: usuario.latitude,
        longitude: usuario.longitude,
        tipo_perfil: usuario.tipo_perfil,
        foto: usuario.foto
    };
}

async function verificarTokenGoogle(idToken) {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID não está configurado.');
    }

    if (typeof idToken !== 'string' || !idToken) {
        const erro = new Error('ID token Google não informado.');
        erro.status = 400;
        throw erro;
    }

    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
    } catch (erroGoogle) {
        const erro = new Error(
            erroGoogle.response?.status >= 500
                ? 'Não foi possível verificar o login com Google agora.'
                : 'ID token Google inválido ou expirado.'
        );
        erro.status = erroGoogle.response?.status >= 500 || !erroGoogle.response ? 503 : 401;
        throw erro;
    }

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        const erro = new Error('A conta Google precisa ter um e-mail verificado.');
        erro.status = 401;
        throw erro;
    }

    return {
        sub: payload.sub,
        email: payload.email.trim().toLowerCase(),
        nome: payload.name || ''
    };
}

function responderErro(res, erro, mensagemPadrao) {
    if (erro.status) {
        return res.status(erro.status).json({ mensagem: erro.message });
    }

    console.error(erro);
    return res.status(500).json({ mensagem: mensagemPadrao });
}

async function loginGoogle(req, res) {
    try {
        const identidade = await verificarTokenGoogle(req.body?.idToken);
        const usuarioPorGoogle = await pool.query(
            `SELECT id, nome, email, documento, telefone, localizacao,
                    latitude, longitude, tipo_perfil, foto
             FROM usuarios WHERE google_sub = $1`,
            [identidade.sub]
        );

        if (usuarioPorGoogle.rows.length > 0) {
            return res.status(200).json({
                acao: 'login',
                ...dadosDaSessao(usuarioPorGoogle.rows[0])
            });
        }

        const usuarioPorEmail = await pool.query(
            'SELECT id, google_sub FROM usuarios WHERE LOWER(email) = $1',
            [identidade.email]
        );

        if (usuarioPorEmail.rows.length > 0) {
            if (usuarioPorEmail.rows[0].google_sub) {
                return res.status(409).json({
                    mensagem: 'Esta conta PetWanted já está vinculada a outra conta Google.'
                });
            }

            return res.status(200).json({ acao: 'vincular_conta' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                mensagem: 'Autenticação não configurada no servidor.'
            });
        }

        const tokenCadastro = jwt.sign(
            { tipo: 'cadastro-google', ...identidade },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        return res.status(200).json({
            acao: 'completar_cadastro',
            tokenCadastro,
            nome: identidade.nome,
            email: identidade.email
        });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao autenticar com Google.');
    }
}

async function vincularContaGoogle(req, res) {
    try {
        const { idToken, senha } = req.body || {};

        if (typeof senha !== 'string' || !senha) {
            return res.status(400).json({ mensagem: 'Informe a senha atual do PetWanted.' });
        }

        const identidade = await verificarTokenGoogle(idToken);
        const resultado = await pool.query(
            'SELECT * FROM usuarios WHERE LOWER(email) = $1',
            [identidade.email]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Conta PetWanted não encontrada.' });
        }

        const usuario = resultado.rows[0];

        if (usuario.google_sub && usuario.google_sub !== identidade.sub) {
            return res.status(409).json({
                mensagem: 'Esta conta PetWanted já está vinculada a outra conta Google.'
            });
        }

        if (!usuario.senha || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ mensagem: 'A senha do PetWanted está incorreta.' });
        }

        if (!usuario.google_sub) {
            const vinculacao = await pool.query(
                `UPDATE usuarios SET google_sub = $1
                 WHERE id = $2 AND (google_sub IS NULL OR google_sub = $1)`,
                [identidade.sub, usuario.id]
            );

            if (vinculacao.rowCount === 0) {
                return res.status(409).json({
                    mensagem: 'A conta foi vinculada a outro Google. Tente entrar novamente.'
                });
            }
        }

        return res.status(200).json({
            acao: 'login',
            ...dadosDaSessao(usuario)
        });
    } catch (erro) {
        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'Esta conta Google já está vinculada a outro perfil.'
            });
        }

        return responderErro(res, erro, 'Erro ao vincular a conta Google.');
    }
}

async function cadastrarComGoogle(req, res) {
    const { tokenCadastro, nome, documento, tipo_perfil } = req.body || {};
    let identidade;

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                mensagem: 'Autenticação não configurada no servidor.'
            });
        }

        if (typeof tokenCadastro !== 'string' || !tokenCadastro) {
            return res.status(401).json({
                mensagem: 'Sessão de cadastro Google inválida ou expirada.'
            });
        }

        const cadastro = jwt.verify(tokenCadastro, process.env.JWT_SECRET);

        if (cadastro.tipo !== 'cadastro-google' || !cadastro.sub || !cadastro.email) {
            return res.status(401).json({ mensagem: 'Sessão de cadastro Google inválida ou expirada.' });
        }

        identidade = cadastro;
    } catch (erro) {
        if (erro.name === 'JsonWebTokenError' || erro.name === 'TokenExpiredError') {
            return res.status(401).json({
                mensagem: 'Sessão de cadastro Google inválida ou expirada.'
            });
        }

        return responderErro(res, erro, 'Erro ao iniciar cadastro com Google.');
    }

    const documentoNormalizado = typeof documento === 'string'
        ? documento.replace(/\D/g, '')
        : '';

    if (
        typeof nome !== 'string'
        || !nome.trim()
        || typeof documento !== 'string'
        || !documentoNormalizado
        || !['Tutor', 'ONG'].includes(tipo_perfil)
    ) {
        return res.status(400).json({
            mensagem: 'Informe o nome, documento e tipo de perfil.'
        });
    }

    const tamanhoDocumento = tipo_perfil === 'Tutor' ? 11 : 14;
    if (documentoNormalizado.length !== tamanhoDocumento) {
        return res.status(400).json({
            mensagem: tipo_perfil === 'Tutor'
                ? 'O CPF deve possuir 11 dígitos.'
                : 'O CNPJ deve possuir 14 dígitos.'
        });
    }

    let client;

    try {
        client = await pool.connect();
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [847291]);

        const usuarioExistente = await client.query(
            'SELECT 1 FROM usuarios WHERE LOWER(email) = $1 OR documento = $2 LIMIT 1',
            [identidade.email, documentoNormalizado]
        );

        if (usuarioExistente.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                mensagem: 'E-mail ou documento já cadastrado. Entre na conta existente para vinculá-la ao Google.'
            });
        }

        const proximoId = await client.query(
            'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM usuarios'
        );

        const resultado = await client.query(
            `INSERT INTO usuarios
                (id, nome, email, documento, senha, tipo_perfil, google_sub)
             VALUES ($1, $2, $3, $4, NULL, $5, $6)
             RETURNING id, nome, email, documento, telefone, localizacao,
                       latitude, longitude, tipo_perfil, foto`,
            [
                proximoId.rows[0].id,
                nome.trim(),
                identidade.email,
                documentoNormalizado,
                tipo_perfil,
                identidade.sub
            ]
        );

        await client.query('COMMIT');
        return res.status(201).json({
            acao: 'login',
            ...dadosDaSessao(resultado.rows[0])
        });
    } catch (erro) {
        if (client) await client.query('ROLLBACK');
        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'E-mail ou documento já cadastrado.'
            });
        }
        return responderErro(res, erro, 'Erro ao criar conta com Google.');
    } finally {
        if (client) client.release();
    }
}

module.exports = {
    loginGoogle,
    vincularContaGoogle,
    cadastrarComGoogle
};
