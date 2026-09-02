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

        if (tipo_perfil !== 'Tutor' && tipo_perfil !== 'ONG') {
            return res.status(400).json({
                mensagem: 'O tipo de perfil deve ser Tutor ou ONG.'
            });
        }

        if (tipo_perfil === 'Tutor' && documento.length !== 11) {
            return res.status(400).json({
                mensagem: 'O CPF deve possuir 11 dígitos.'
            });
        }

        if (tipo_perfil === 'ONG' && documento.length !== 14) {
            return res.status(400).json({
                mensagem: 'O CNPJ deve possuir 14 dígitos.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await pool.query(
            `INSERT INTO usuarios
                (nome, email, documento, senha, telefone, localizacao, tipo_perfil)
             VALUES
                ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, nome, email, documento, telefone, localizacao, tipo_perfil`,
            [
                nome,
                email,
                documento,
                senhaHash,
                telefone || null,
                localizacao || null,
                tipo_perfil
            ]
        );

        return res.status(201).json(resultado.rows[0]);

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