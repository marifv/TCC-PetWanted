const pool = require('../database/connection');
const bcrypt = require('bcrypt');

async function criarUsuario(req, res) {
    try {
        const {
            nome,
            email,
            documento,
            senha,
            telefone,
            localizacao,
            tipo_perfil
        } = req.body;

        const emailNormalizado = email?.trim().toLowerCase();
        const documentoNormalizado = documento?.replace(/\D/g, '');

        if (!nome?.trim() || !emailNormalizado || !senha || !documentoNormalizado) {
            return res.status(400).json({
                mensagem: 'Preencha todos os campos obrigatórios.'
            });
        }

        if (tipo_perfil !== 'Tutor' && tipo_perfil !== 'ONG') {
            return res.status(400).json({
                mensagem: 'O tipo de perfil deve ser Tutor ou ONG.'
            });
        }

        if (tipo_perfil === 'Tutor' && documentoNormalizado.length !== 11) {
            return res.status(400).json({
                mensagem: 'O CPF deve possuir 11 dígitos.'
            });
        }

        if (tipo_perfil === 'ONG' && documentoNormalizado.length !== 14) {
            return res.status(400).json({
                mensagem: 'O CNPJ deve possuir 14 dígitos.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [847291]);

            const usuarioExistente = await client.query(
                'SELECT 1 FROM usuarios WHERE LOWER(email) = $1 OR documento = $2 LIMIT 1',
                [emailNormalizado, documentoNormalizado]
            );

            if (usuarioExistente.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({
                    mensagem: 'E-mail ou documento já cadastrado.'
                });
            }

            const proximoId = await client.query(
                'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM usuarios'
            );

            const resultado = await client.query(
                `INSERT INTO usuarios
                    (id, nome, email, documento, senha, telefone, localizacao, tipo_perfil)
                 VALUES
                    ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING id, nome, email, documento, telefone, localizacao, tipo_perfil`,
                [
                    proximoId.rows[0].id,
                    nome.trim(),
                    emailNormalizado,
                    documentoNormalizado,
                    senhaHash,
                    telefone || null,
                    localizacao || null,
                    tipo_perfil
                ]
            );

            await client.query('COMMIT');
            return res.status(201).json(resultado.rows[0]);
        } catch (erro) {
            await client.query('ROLLBACK');
            throw erro;
        } finally {
            client.release();
        }

    } catch (erro) {

        if (erro.code === '23505') {
            return res.status(409).json({
                mensagem: 'E-mail ou documento já cadastrado.'
            });
        }

        console.error(erro);

        return res.status(500).json({
            mensagem: 'Erro ao cadastrar usuário.'
        });
    }
}

module.exports = {
    criarUsuario
};