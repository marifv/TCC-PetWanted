const pool = require('../database/connection');

const consultaConversa = `
    SELECT c.id,
           outro.id AS outro_usuario_id,
           outro.nome,
           outro.foto,
           c.animal_id,
           animal.nome AS animal_nome,
           COALESCE(animal.foto, animal.fotos->>0) AS animal_foto,
           animal.tipo_registro,
           ultima.conteudo AS ultima_mensagem,
           ultima.criado_em AS ultima_mensagem_em,
           nao_lidas.quantidade AS mensagens_nao_lidas,
           COALESCE(preferencia.silenciada_em IS NOT NULL, FALSE) AS silenciada
    FROM conversas c
    JOIN usuarios outro ON outro.id = CASE
        WHEN c.usuario_1_id = $1 THEN c.usuario_2_id
        ELSE c.usuario_1_id
    END
    LEFT JOIN animais animal ON animal.id_animal = c.animal_id
    LEFT JOIN LATERAL (
        SELECT conteudo, criado_em
        FROM mensagens_chat
        WHERE conversa_id = c.id
        ORDER BY criado_em DESC, id DESC
        LIMIT 1
    ) ultima ON TRUE
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS quantidade
        FROM mensagens_chat
        WHERE conversa_id = c.id
          AND remetente_id <> $1
          AND lida_em IS NULL
    ) nao_lidas ON TRUE
    LEFT JOIN preferencias_conversa preferencia
        ON preferencia.conversa_id = c.id AND preferencia.usuario_id = $1
`;

async function buscarUsuarios(req, res) {
    const busca = req.query.q?.trim();
    if (!busca || busca.length < 2) {
        return res.status(400).json({ mensagem: 'Informe ao menos 2 caracteres para buscar.' });
    }

    try {
        const resultado = await pool.query(
            `SELECT id, nome, foto
             FROM usuarios
             WHERE id <> $1 AND nome ILIKE $2
             ORDER BY nome
             LIMIT 20`,
            [req.usuario.id, `%${busca}%`]
        );
        return res.json(resultado.rows);
    } catch (erro) {
        return res.status(500).json({ mensagem: 'Erro ao buscar usuários.' });
    }
}

async function listarConversas(req, res) {
    try {
        const resultado = await pool.query(
            `${consultaConversa}
                         WHERE (c.usuario_1_id = $1 OR c.usuario_2_id = $1)
                             AND preferencia.excluida_em IS NULL
             ORDER BY COALESCE(ultima.criado_em, c.criado_em) DESC`,
            [req.usuario.id]
        );
        return res.json(resultado.rows);
    } catch (erro) {
        return res.status(500).json({ mensagem: 'Erro ao carregar conversas.' });
    }
}

async function contarNotificacoes(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT COUNT(*)::integer AS nao_lidas
             FROM mensagens_chat m
             JOIN conversas c ON c.id = m.conversa_id
             WHERE (c.usuario_1_id = $1 OR c.usuario_2_id = $1)
               AND m.remetente_id <> $1
                             AND m.lida_em IS NULL
                             AND NOT EXISTS (
                                     SELECT 1 FROM preferencias_conversa preferencia
                                     WHERE preferencia.usuario_id = $1
                                         AND preferencia.conversa_id = c.id
                                         AND preferencia.excluida_em IS NOT NULL
                             )`,
            [req.usuario.id]
        );
        return res.json({ naoLidas: resultado.rows[0].nao_lidas });
    } catch (erro) {
        return res.status(500).json({ mensagem: 'Erro ao carregar notificações.' });
    }
}

async function listarNotificacoes(req, res) {
        try {
                const resultado = await pool.query(
                        `SELECT m.id,
                                        m.conversa_id,
                                        m.remetente_id,
                                        remetente.nome AS remetente_nome,
                                        remetente.foto AS remetente_foto,
                                        m.conteudo,
                                        m.criado_em,
                                        m.lida_em,
                                        animal.nome AS animal_nome,
                                        animal.tipo_registro
                         FROM mensagens_chat m
                         JOIN conversas c ON c.id = m.conversa_id
                         JOIN usuarios remetente ON remetente.id = m.remetente_id
                         LEFT JOIN animais animal ON animal.id_animal = c.animal_id
                         LEFT JOIN preferencias_conversa preferencia
                             ON preferencia.usuario_id = $1 AND preferencia.conversa_id = c.id
                         WHERE (c.usuario_1_id = $1 OR c.usuario_2_id = $1)
                             AND m.remetente_id <> $1
                             AND preferencia.excluida_em IS NULL
                         ORDER BY m.criado_em DESC, m.id DESC
                         LIMIT 50`,
                        [req.usuario.id]
                );
                return res.json(resultado.rows);
        } catch (erro) {
                console.error('Erro ao carregar notificações:', erro);
                return res.status(500).json({ mensagem: 'Erro ao carregar notificações.' });
        }
}

async function criarConversa(req, res) {
    const destinatarioId = Number(req.body.destinatarioId);
    const animalId = req.body.animalId == null ? null : Number(req.body.animalId);
    const usuarioId = Number(req.usuario.id);

    if (!Number.isInteger(destinatarioId) || destinatarioId <= 0 || destinatarioId === usuarioId) {
        return res.status(400).json({ mensagem: 'Destinatário inválido.' });
    }
    if (animalId !== null && (!Number.isInteger(animalId) || animalId <= 0)) {
        return res.status(400).json({ mensagem: 'Anúncio inválido.' });
    }

    const primeiroUsuario = Math.min(usuarioId, destinatarioId);
    const segundoUsuario = Math.max(usuarioId, destinatarioId);

    try {
        if (animalId !== null) {
            const animal = await pool.query(
                'SELECT id_usuario FROM animais WHERE id_animal = $1',
                [animalId]
            );
            if (!animal.rows.length || Number(animal.rows[0].id_usuario) !== destinatarioId) {
                return res.status(400).json({ mensagem: 'O anúncio não pertence ao destinatário.' });
            }
        }

        const resultado = await pool.query(
            `INSERT INTO conversas (usuario_1_id, usuario_2_id, animal_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (usuario_1_id, usuario_2_id)
             DO UPDATE SET animal_id = COALESCE(EXCLUDED.animal_id, conversas.animal_id)
             RETURNING id`,
            [primeiroUsuario, segundoUsuario, animalId]
        );
        await pool.query(
            `INSERT INTO preferencias_conversa (usuario_id, conversa_id, excluida_em)
             VALUES ($1, $2, NULL)
             ON CONFLICT (usuario_id, conversa_id)
             DO UPDATE SET excluida_em = NULL`,
            [usuarioId, resultado.rows[0].id]
        );
        const conversa = await pool.query(
            `${consultaConversa} WHERE c.id = $2`,
            [usuarioId, resultado.rows[0].id]
        );
        return res.status(201).json(conversa.rows[0]);
    } catch (erro) {
        console.error('Erro ao criar conversa:', erro);
        return res.status(500).json({ mensagem: 'Erro ao iniciar conversa.' });
    }
}

async function listarMensagens(req, res) {
    const conversaId = Number(req.params.id);
    if (!Number.isInteger(conversaId) || conversaId <= 0) {
        return res.status(400).json({ mensagem: 'Conversa inválida.' });
    }

    try {
        const participante = await pool.query(
            `SELECT id FROM conversas
             WHERE id = $1 AND (usuario_1_id = $2 OR usuario_2_id = $2)`,
            [conversaId, req.usuario.id]
        );
        if (!participante.rows.length) {
            return res.status(404).json({ mensagem: 'Conversa não encontrada.' });
        }

        await pool.query(
            `UPDATE mensagens_chat
             SET lida_em = NOW()
             WHERE conversa_id = $1 AND remetente_id <> $2 AND lida_em IS NULL`,
            [conversaId, req.usuario.id]
        );

        const resultado = await pool.query(
            `SELECT m.id, m.conversa_id, m.remetente_id, m.conteudo, m.criado_em, m.lida_em,
                    m.animal_id, m.anexo_url, m.anexo_tipo,
                    animal.nome AS animal_nome, animal.tipo_registro
             FROM mensagens_chat m
             JOIN conversas c ON c.id = m.conversa_id
             LEFT JOIN animais animal ON animal.id_animal = m.animal_id
             WHERE c.id = $1 AND (c.usuario_1_id = $2 OR c.usuario_2_id = $2)
             ORDER BY m.criado_em ASC, m.id ASC`,
            [conversaId, req.usuario.id]
        );
        return res.json(resultado.rows);
    } catch (erro) {
        return res.status(500).json({ mensagem: 'Erro ao carregar mensagens.' });
    }
}

async function registrarDispositivo(req, res) {
    const token = req.body.token?.trim();
    if (!token || token.length > 4096) {
        return res.status(400).json({ mensagem: 'Token de dispositivo inválido.' });
    }

    try {
        await pool.query(
            `INSERT INTO chat_dispositivos (usuario_id, token)
             VALUES ($1, $2)
             ON CONFLICT (token)
             DO UPDATE SET usuario_id = EXCLUDED.usuario_id, atualizado_em = NOW()`,
            [req.usuario.id, token]
        );
        return res.status(204).end();
    } catch (erro) {
        return res.status(500).json({ mensagem: 'Erro ao registrar dispositivo.' });
    }
}

async function alterarSilenciamento(req, res) {
    const conversaId = Number(req.params.id);
    const silenciada = req.body.silenciada;
    if (!Number.isInteger(conversaId) || conversaId <= 0 || typeof silenciada !== 'boolean') {
        return res.status(400).json({ mensagem: 'Conversa ou opção de silenciamento inválida.' });
    }

    try {
        const participante = await pool.query(
            `SELECT id FROM conversas
             WHERE id = $1 AND (usuario_1_id = $2 OR usuario_2_id = $2)`,
            [conversaId, req.usuario.id]
        );
        if (!participante.rows.length) {
            return res.status(404).json({ mensagem: 'Conversa não encontrada.' });
        }

        await pool.query(
            `INSERT INTO preferencias_conversa (usuario_id, conversa_id, silenciada_em)
             VALUES ($1, $2, CASE WHEN $3 THEN NOW() ELSE NULL END)
             ON CONFLICT (usuario_id, conversa_id)
             DO UPDATE SET silenciada_em = CASE WHEN $3 THEN NOW() ELSE NULL END`,
            [req.usuario.id, conversaId, silenciada]
        );
        return res.json({ silenciada });
    } catch (erro) {
        console.error('Erro ao alterar silenciamento:', erro);
        return res.status(500).json({ mensagem: 'Não foi possível alterar o silenciamento.' });
    }
}

async function excluirConversa(req, res) {
    const conversaId = Number(req.params.id);
    if (!Number.isInteger(conversaId) || conversaId <= 0) {
        return res.status(400).json({ mensagem: 'Conversa inválida.' });
    }

    try {
        const participante = await pool.query(
            `SELECT id FROM conversas
             WHERE id = $1 AND (usuario_1_id = $2 OR usuario_2_id = $2)`,
            [conversaId, req.usuario.id]
        );
        if (!participante.rows.length) {
            return res.status(404).json({ mensagem: 'Conversa não encontrada.' });
        }

        await pool.query(
            `INSERT INTO preferencias_conversa (usuario_id, conversa_id, excluida_em)
             VALUES ($1, $2, NOW())
             ON CONFLICT (usuario_id, conversa_id)
             DO UPDATE SET excluida_em = NOW()`,
            [req.usuario.id, conversaId]
        );
        return res.status(204).end();
    } catch (erro) {
        console.error('Erro ao excluir conversa:', erro);
        return res.status(500).json({ mensagem: 'Não foi possível excluir a conversa.' });
    }
}

async function denunciarConversa(req, res) {
    const conversaId = Number(req.params.id);
    const motivo = typeof req.body.motivo === 'string' ? req.body.motivo.trim() : '';
    if (!Number.isInteger(conversaId) || conversaId <= 0 || motivo.length < 5 || motivo.length > 500) {
        return res.status(400).json({ mensagem: 'Informe um motivo entre 5 e 500 caracteres.' });
    }

    try {
        const conversa = await pool.query(
            `SELECT usuario_1_id, usuario_2_id FROM conversas
             WHERE id = $1 AND (usuario_1_id = $2 OR usuario_2_id = $2)`,
            [conversaId, req.usuario.id]
        );
        if (!conversa.rows.length) {
            return res.status(404).json({ mensagem: 'Conversa não encontrada.' });
        }

        const participantes = conversa.rows[0];
        const denunciadoId = Number(participantes.usuario_1_id) === Number(req.usuario.id)
            ? participantes.usuario_2_id
            : participantes.usuario_1_id;

        await pool.query(
            `INSERT INTO denuncias_chat (conversa_id, denunciante_id, denunciado_id, motivo)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (conversa_id, denunciante_id)
             DO UPDATE SET denunciado_id = EXCLUDED.denunciado_id,
                           motivo = EXCLUDED.motivo,
                           criada_em = NOW()`,
            [conversaId, req.usuario.id, denunciadoId, motivo]
        );
        return res.status(201).json({ mensagem: 'Denúncia enviada para análise.' });
    } catch (erro) {
        console.error('Erro ao denunciar conversa:', erro);
        return res.status(500).json({ mensagem: 'Não foi possível enviar a denúncia.' });
    }
}

module.exports = {
    buscarUsuarios,
    listarConversas,
    contarNotificacoes,
    listarNotificacoes,
    criarConversa,
    listarMensagens,
    registrarDispositivo,
    alterarSilenciamento,
    excluirConversa,
    denunciarConversa
};