const fs = require('fs');
const path = require('path');
const pool = require('../database/connection');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function salvarFotoPerfil(idUsuario, fotoBase64, req) {
    if (!fotoBase64 || typeof fotoBase64 !== 'string') return null;

    const correspondencia = fotoBase64.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/i);
    if (!correspondencia) return null;

    const extensao = correspondencia[1].toLowerCase() === 'jpeg'
        ? 'jpg'
        : correspondencia[1].toLowerCase();
    const base64Limpo = fotoBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    const fotosAnteriores = fs.existsSync(UPLOAD_DIR)
        ? fs.readdirSync(UPLOAD_DIR).filter((arquivo) => (
            arquivo.startsWith(`perfil-${idUsuario}.`) || arquivo.startsWith(`perfil-${idUsuario}-`)
        ))
        : [];

    fotosAnteriores.forEach((arquivo) => {
        fs.unlinkSync(path.join(UPLOAD_DIR, arquivo));
    });

    const arquivo = `perfil-${idUsuario}-${Date.now()}.${extensao}`;

    fs.writeFileSync(
        path.join(UPLOAD_DIR, arquivo),
        Buffer.from(base64Limpo, 'base64')
    );

    const host = req?.get('host') || 'localhost:3000';
    const protocolo = req?.protocol || 'http';
    return `${protocolo}://${host}/uploads/${arquivo}`;
}

async function modificarPerfil(req, res) {
    try {
        const { id } = req.params;
        const { nome, telefone, localizacao, foto, latitude, longitude } = req.body;

        if (!nome?.trim() || !telefone?.trim()) {
            return res.status(400).json({
                mensagem: 'Preencha nome e telefone.'
            });
        }

        if (!localizacao?.trim() && latitude == null && longitude == null) {
            return res.status(400).json({
                mensagem: 'Informe a localização ou as coordenadas do usuário.'
            });
        }

        const fotoUrl = salvarFotoPerfil(id, foto, req);
        const resultado = await pool.query(
            `UPDATE usuarios
             SET nome = $1,
                 telefone = $2,
                 localizacao = COALESCE($3, localizacao),
                 latitude = CASE WHEN $4::double precision IS NULL THEN latitude ELSE $4::double precision END,
                 longitude = CASE WHEN $5::double precision IS NULL THEN longitude ELSE $5::double precision END,
                 foto = COALESCE($6, foto)
             WHERE id = $7
             RETURNING id, nome, email, documento, telefone, localizacao, latitude, longitude, tipo_perfil, foto`,
            [
                nome.trim(),
                telefone.trim(),
                localizacao?.trim() || null,
                latitude ?? null,
                longitude ?? null,
                fotoUrl,
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