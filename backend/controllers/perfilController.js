const pool = require('../database/connection');

async function modificarPerfil(req, res) {
    try {
        const { id } = req.params;
        const { nome, telefone, localizacao } = req.body;

        if (!nome?.trim() || !telefone?.trim() || !localizacao?.trim()) {
            return res.status(400).json({
            mensagem: 'Preencha nome, telefone e localização.'
            });
        }

        const resultado = await pool.query(
            `UPDATE usuarios
             SET nome = $1,
                 telefone = $2,
                 localizacao = $3
             WHERE id = $4
             RETURNING id, nome, email, documento, telefone, localizacao, tipo_perfil`,
             
            [
                nome.trim(),
                telefone.trim(),
                localizacao.trim(),
                id
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        return res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao modificar perfil:', error);

        return res.status(500).json({
            mensagem: 'Erro ao modificar perfil.'
        });
    }
}

async function excluirPerfil(req, res) {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        if (String(req.usuario?.id) !== String(id)) {
            return res.status(403).json({
                mensagem: 'Somente o usuário logado pode excluir este perfil.'
            });
        }

        await client.query('BEGIN');
        await client.query('DELETE FROM animais WHERE id_usuario = $1', [id]);
        const resultado = await client.query(
            'DELETE FROM usuarios WHERE id = $1 RETURNING id',
            [id]
        );

        if (resultado.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                mensagem: 'Usuário não encontrado.'
            });
        }

        await client.query('COMMIT');

        return res.status(200).json({
            mensagem: 'Usuário excluído com sucesso.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao excluir perfil:', error);
        return res.status(500).json({
            mensagem: 'Erro interno do servidor.'
        });
    } finally {
        client.release();
    }
}

module.exports = {
    modificarPerfil,
    excluirPerfil
};