const { createHmac, randomBytes, randomInt, timingSafeEqual } = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../database/connection');
const { enviarEmail } = require('../services/emailService');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_FORTE_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const RESPOSTA_GENERICA = 'Se o e-mail estiver associado a uma conta, enviaremos um código de verificação.';
const MAX_TENTATIVAS_CODIGO = 5;

function hashRecuperacao(tipo, valor) {
    const segredo = process.env.JWT_SECRET;
    if (!segredo) throw new Error('JWT_SECRET não está configurado.');

    return createHmac('sha256', segredo)
        .update(`${tipo}:${valor}`)
        .digest('hex');
}

function hashesIguais(hashArmazenado, hashRecebido) {
    if (!hashArmazenado || !hashRecebido) return false;

    const armazenado = Buffer.from(hashArmazenado, 'hex');
    const recebido = Buffer.from(hashRecebido, 'hex');
    return armazenado.length === recebido.length && timingSafeEqual(armazenado, recebido);
}

async function enviarCodigoRecuperacao(req, res) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ mensagem: 'Informe um endereço de e-mail válido.' });
    }

    let client;
    let hashCodigo;
    try {
        const usuario = await pool.query(
            'SELECT email FROM usuarios WHERE LOWER(email) = $1 AND senha IS NOT NULL',
            [email]
        );

        if (usuario.rows.length === 0) {
            return res.status(200).json({ mensagem: RESPOSTA_GENERICA });
        }

        const codigo = String(randomInt(100000, 1000000));
        hashCodigo = hashRecuperacao('codigo', `${email}:${codigo}`);
        client = await pool.connect();
        await client.query('BEGIN');

        const solicitacao = await client.query(
            `INSERT INTO password_reset_requests
                (email, code_hash, code_expires_at, code_attempts, last_sent_at, reset_token_hash, reset_token_expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '10 minutes', 0, NOW(), NULL, NULL)
             ON CONFLICT (email) DO UPDATE SET
                code_hash = EXCLUDED.code_hash,
                code_expires_at = EXCLUDED.code_expires_at,
                code_attempts = 0,
                last_sent_at = NOW(),
                reset_token_hash = NULL,
                reset_token_expires_at = NULL
             WHERE password_reset_requests.last_sent_at <= NOW() - INTERVAL '60 seconds'
             RETURNING email`,
            [email, hashCodigo]
        );

        await client.query('COMMIT');
        client.release();
        client = null;

        if (solicitacao.rows.length === 0) {
            return res.status(200).json({ mensagem: RESPOSTA_GENERICA });
        }

        await enviarEmail({
            to: usuario.rows[0].email,
            subject: 'Código para redefinir sua senha - PetWanted',
            text: `Seu código de verificação é ${codigo}. Ele expira em 10 minutos. Se você não solicitou a redefinição, ignore este e-mail.`,
            html: `<p>Seu código de verificação é:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${codigo}</p><p>Ele expira em 10 minutos. Se você não solicitou a redefinição, ignore este e-mail.</p>`
        });

        return res.status(200).json({ mensagem: RESPOSTA_GENERICA });
    } catch (erro) {
        if (client) {
            await client.query('ROLLBACK');
            client.release();
        }
        if (hashCodigo) {
            await pool.query(
                'DELETE FROM password_reset_requests WHERE email = $1 AND code_hash = $2',
                [email, hashCodigo]
            );
        }
        console.error('Erro ao solicitar recuperação de senha:', erro);
        return res.status(500).json({ mensagem: 'Não foi possível enviar o código agora. Tente novamente mais tarde.' });
    }
}

async function verificarCodigoRecuperacao(req, res) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const codigo = typeof req.body?.codigo === 'string' ? req.body.codigo.trim() : '';
    if (!EMAIL_REGEX.test(email) || !/^\d{6}$/.test(codigo)) {
        return res.status(400).json({ mensagem: 'E-mail ou código inválido.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await client.query(
            'SELECT code_hash, code_expires_at, code_attempts FROM password_reset_requests WHERE email = $1 FOR UPDATE',
            [email]
        );
        const solicitacao = resultado.rows[0];
        if (
            !solicitacao?.code_hash ||
            new Date(solicitacao.code_expires_at) <= new Date() ||
            solicitacao.code_attempts >= MAX_TENTATIVAS_CODIGO
        ) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensagem: 'Código inválido ou expirado. Solicite um novo código.' });
        }

        const hashRecebido = hashRecuperacao('codigo', `${email}:${codigo}`);
        if (!hashesIguais(solicitacao.code_hash.trim(), hashRecebido)) {
            const tentativas = solicitacao.code_attempts + 1;
            await client.query(
                `UPDATE password_reset_requests
                 SET code_attempts = $2,
                     code_hash = CASE WHEN $2 >= $3 THEN NULL ELSE code_hash END
                 WHERE email = $1`,
                [email, tentativas, MAX_TENTATIVAS_CODIGO]
            );
            await client.query('COMMIT');
            return res.status(400).json({
                mensagem: tentativas >= MAX_TENTATIVAS_CODIGO
                    ? 'Limite de tentativas atingido. Solicite um novo código.'
                    : 'Código incorreto.'
            });
        }

        const tokenRedefinicao = randomBytes(32).toString('hex');
        const hashToken = hashRecuperacao('token', tokenRedefinicao);
        await client.query(
            `UPDATE password_reset_requests
             SET code_hash = NULL,
                 code_expires_at = NULL,
                 reset_token_hash = $2,
                 reset_token_expires_at = NOW() + INTERVAL '10 minutes'
             WHERE email = $1`,
            [email, hashToken]
        );
        await client.query('COMMIT');

        return res.status(200).json({ tokenRedefinicao });
    } catch (erro) {
        await client.query('ROLLBACK');
        console.error('Erro ao verificar código de recuperação:', erro);
        return res.status(500).json({ mensagem: 'Não foi possível verificar o código agora.' });
    } finally {
        client.release();
    }
}

async function redefinirSenha(req, res) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const tokenRedefinicao = typeof req.body?.tokenRedefinicao === 'string' ? req.body.tokenRedefinicao : '';
    const novaSenha = typeof req.body?.novaSenha === 'string' ? req.body.novaSenha : '';

    if (!EMAIL_REGEX.test(email) || !tokenRedefinicao || !SENHA_FORTE_REGEX.test(novaSenha)) {
        return res.status(400).json({
            mensagem: 'Informe um token válido e uma senha com 8 caracteres, maiúscula, minúscula, número e caractere especial.'
        });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await client.query(
            'SELECT reset_token_hash, reset_token_expires_at FROM password_reset_requests WHERE email = $1 FOR UPDATE',
            [email]
        );
        const solicitacao = resultado.rows[0];
        const hashRecebido = hashRecuperacao('token', tokenRedefinicao);
        if (
            !solicitacao?.reset_token_hash ||
            new Date(solicitacao.reset_token_expires_at) <= new Date() ||
            !hashesIguais(solicitacao.reset_token_hash.trim(), hashRecebido)
        ) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensagem: 'Sessão de redefinição inválida ou expirada. Solicite um novo código.' });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);
        const atualizacao = await client.query(
            'UPDATE usuarios SET senha = $2 WHERE LOWER(email) = $1 AND senha IS NOT NULL',
            [email, senhaHash]
        );
        if (atualizacao.rowCount !== 1) {
            await client.query('ROLLBACK');
            return res.status(400).json({ mensagem: 'Não foi possível redefinir a senha dessa conta.' });
        }

        await client.query('DELETE FROM password_reset_requests WHERE email = $1', [email]);
        await client.query('COMMIT');
        return res.status(200).json({ mensagem: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' });
    } catch (erro) {
        await client.query('ROLLBACK');
        console.error('Erro ao redefinir senha:', erro);
        return res.status(500).json({ mensagem: 'Não foi possível redefinir sua senha agora.' });
    } finally {
        client.release();
    }
}

module.exports = {
    enviarCodigoRecuperacao,
    verificarCodigoRecuperacao,
    redefinirSenha
};
