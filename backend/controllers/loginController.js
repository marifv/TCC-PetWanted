const pool = require('../database/connection');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function loginUsuario(req, res) {
    try {
        const {
            email,
            senha,
        } = req.body;

        const usuario = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (usuario.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.rows[0].senha);

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'Senha incorreta.'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                mensagem: 'Autenticação não configurada no servidor.'
            });
        }

        const token = jwt.sign(
            { id: usuario.rows[0].id, email: usuario.rows[0].email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            token,
            id: usuario.rows[0].id,
            nome: usuario.rows[0].nome,
            email: usuario.rows[0].email,
            documento: usuario.rows[0].documento,
            telefone: usuario.rows[0].telefone,
            localizacao: usuario.rows[0].localizacao,
            tipo_perfil: usuario.rows[0].tipo_perfil,
            foto: usuario.rows[0].foto
        });
        }

    catch (erro) {
        return res.status(500).json({
            mensagem: 'Erro ao realizar login.',
            erro: erro.message
        });
    }
}

module.exports = {
    loginUsuario
};