const pool = require('../database/connection');
const { analisarAnimal } = require('../services/geminiService');
const { enviarNotificacaoChat, enviarNotificacaoMatch } = require('../services/firebaseMessaging');

const LIMITE_MATCH_PADRAO = 70;

function limparTexto(valor) {
    return String(valor || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function distanciaKm(latitude1, longitude1, latitude2, longitude2) {
    if (![latitude1, longitude1, latitude2, longitude2].every(Number.isFinite)) return null;
    const converter = (graus) => graus * Math.PI / 180;
    const raioTerra = 6371;
    const deltaLatitude = converter(latitude2 - latitude1);
    const deltaLongitude = converter(longitude2 - longitude1);
    const a = Math.sin(deltaLatitude / 2) ** 2
        + Math.cos(converter(latitude1)) * Math.cos(converter(latitude2))
        * Math.sin(deltaLongitude / 2) ** 2;
    return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pontuacaoDescricao(texto1, texto2, analise, candidato) {
    const palavrasTexto = new Set(limparTexto(`${texto1} ${texto2}`).split(' ').filter((item) => item.length >= 4));
    if (palavrasTexto.size === 0) return 0;

    const termosCandidato = limparTexto([
        candidato.especie,
        candidato.raca,
        candidato.cor,
        candidato.porte,
        candidato.sexo,
        candidato.descricao,
    ].join(' ')).split(' ').filter((item) => item.length >= 4);

    const caracteres = [
        analise?.especie,
        analise?.porte,
        analise?.pelagem,
        ...(analise?.cores || []),
        ...(analise?.marcasDistintivas || []),
    ].map(limparTexto);
    const termosIA = caracteres.join(' ').split(' ').filter((item) => item.length >= 4);
    const total = new Set([...termosCandidato, ...termosIA]);
    if (total.size === 0) return 50;

    let iguais = 0;
    for (const termo of total) {
        if (palavrasTexto.has(termo)) iguais += 1;
    }
    return Math.round((iguais / total.size) * 100);
}

function calcularMatch(anuncio, candidato, analise) {
    if (limparTexto(anuncio.especie) !== limparTexto(candidato.especie)) {
        return null;
    }

    const confiancaVisual = Math.max(0, Math.min(1, Number(analise?.confianca) || 0));
    const scoreVisual = Math.round(confiancaVisual * 100);

    const scoreDescricao = pontuacaoDescricao(
        anuncio.descricao,
        candidato.descricao,
        analise,
        candidato
    );

    const km = distanciaKm(
        anuncio.local_latitude,
        anuncio.local_longitude,
        candidato.local_latitude,
        candidato.local_longitude
    );
    const scoreLocalizacao = km == null ? 50 : km <= 5 ? 100 : km <= 20 ? 85 : km <= 50 ? 65 : km <= 100 ? 40 : 20;

    const dias = Math.abs(
        new Date(anuncio.data_evento).getTime() - new Date(candidato.data_evento).getTime()
    ) / 86400000;
    const scoreTempo = Number.isFinite(dias) ? dias <= 3 ? 100 : dias <= 7 ? 85 : dias <= 30 ? 65 : 40 : 50;

    const scoreTotal = Math.round(
        scoreVisual * 0.50
        + scoreDescricao * 0.25
        + scoreLocalizacao * 0.15
        + scoreTempo * 0.10
    );

    return {
        scoreTotal,
        scoreVisual,
        scoreDescricao,
        scoreLocalizacao,
        scoreTempo,
        motivo: { especie: anuncio.especie, distanciaKm: km == null ? null : Math.round(km * 10) / 10, dias: Number.isFinite(dias) ? Math.round(dias) : null },
    };
}

async function analisarAnuncioPorId(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT id_animal, especie, raca, cor, porte, sexo, descricao, foto, fotos,
                    tipo_registro, data_evento, local_latitude, local_longitude
             FROM animais
             WHERE id_animal = $1 AND id_usuario = $2`,
            [req.params.id, req.usuario?.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Anuncio nao encontrado.' });
        }

        const anuncio = resultado.rows[0];
        let fotos = Array.isArray(anuncio.fotos) ? anuncio.fotos : [];
        if (typeof anuncio.fotos === 'string') {
            try {
                fotos = JSON.parse(anuncio.fotos);
            } catch {
                fotos = [];
            }
        }
        const imagemUrl = anuncio.foto || fotos[0];
        if (!imagemUrl) {
            return res.status(400).json({ mensagem: 'O anuncio nao possui foto para analise.' });
        }

        let analise;
        let modeloUsado;
        try {
            analise = await analisarAnimal({
                imagemUrl,
                descricao: anuncio.descricao,
                dadosAnuncio: {
                    especie: anuncio.especie,
                    raca: anuncio.raca,
                    cor: anuncio.cor,
                    porte: anuncio.porte,
                    sexo: anuncio.sexo,
                },
            });
            modeloUsado = analise.modelo || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
        } catch (erro) {
            console.warn(`Gemini indisponivel para o anuncio ${anuncio.id_animal}: ${erro.message}`);
            analise = {
                especie: anuncio.especie,
                porte: anuncio.porte,
                pelagem: '',
                cores: anuncio.cor ? String(anuncio.cor).split(',').map((item) => item.trim()).filter(Boolean) : [],
                marcasDistintivas: [],
                caracteristicas: anuncio.descricao || '',
                confianca: 0.75,
            };
            modeloUsado = 'fallback-local';
        }

        await pool.query(
            `INSERT INTO analises_ia_animais (anuncio_id, modelo, resultado_json, confianca)
             VALUES ($1, $2, $3::jsonb, $4)
             ON CONFLICT (anuncio_id) DO UPDATE SET
                modelo = EXCLUDED.modelo,
                resultado_json = EXCLUDED.resultado_json,
                confianca = EXCLUDED.confianca,
                atualizado_em = NOW()`,
            [
                anuncio.id_animal,
                modeloUsado,
                JSON.stringify(analise),
                Math.max(0, Math.min(1, Number(analise.confianca) || 0)),
            ]
        );

        const tipoCandidato = anuncio.tipo_registro === 'Perdido' ? 'Encontrado' : 'Perdido';
        const candidatos = await pool.query(
            `SELECT id_animal, especie, raca, cor, porte, sexo, descricao, tipo_registro,
                    data_evento, local_latitude, local_longitude
             FROM animais
             WHERE tipo_registro = $1
               AND id_animal <> $2
               AND NOT EXISTS (
                   SELECT 1
                   FROM matches_animais m
                   WHERE (
                       ($1 = 'Encontrado' AND m.anuncio_perdido_id = $2 AND m.anuncio_encontrado_id = animais.id_animal)
                       OR ($1 = 'Perdido' AND m.anuncio_perdido_id = animais.id_animal AND m.anuncio_encontrado_id = $2)
                   )
                   AND m.status IN ('descartado_usuario', 'aceito_usuario', 'confirmado')
               )`,
            [tipoCandidato, anuncio.id_animal]
        );

        const limiar = Math.max(0, Math.min(100, Number(process.env.IA_MATCH_THRESHOLD) || LIMITE_MATCH_PADRAO));
        const matches = candidatos.rows
            .map((candidato) => {
                const pontuacao = calcularMatch(anuncio, candidato, analise);
                if (!pontuacao) return null;
                return { candidato, ...pontuacao };
            })
            .filter((match) => match && match.scoreTotal >= limiar)
            .sort((a, b) => b.scoreTotal - a.scoreTotal)
            .slice(0, 3);

        for (const match of matches) {
            const perdidoId = anuncio.tipo_registro === 'Perdido' ? anuncio.id_animal : match.candidato.id_animal;
            const encontradoId = anuncio.tipo_registro === 'Encontrado' ? anuncio.id_animal : match.candidato.id_animal;
            const matchInserido = await pool.query(
                `INSERT INTO matches_animais (
                    anuncio_perdido_id, anuncio_encontrado_id, score_total,
                    score_visual, score_descricao, score_localizacao, score_tempo, motivo_json
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
                 ON CONFLICT (anuncio_perdido_id, anuncio_encontrado_id) DO UPDATE SET
                    score_total = EXCLUDED.score_total,
                    score_visual = EXCLUDED.score_visual,
                    score_descricao = EXCLUDED.score_descricao,
                    score_localizacao = EXCLUDED.score_localizacao,
                    score_tempo = EXCLUDED.score_tempo,
                    motivo_json = EXCLUDED.motivo_json,
                    atualizado_em = NOW()
                 WHERE matches_animais.status IN ('pendente', 'notificado', 'descartado_sistema')
                 RETURNING id`,
                [
                    perdidoId,
                    encontradoId,
                    match.scoreTotal,
                    match.scoreVisual,
                    match.scoreDescricao,
                    match.scoreLocalizacao,
                    match.scoreTempo,
                    JSON.stringify(match.motivo),
                ]
            );
            if (matchInserido.rows.length) {
                const participantes = await pool.query(
                    `SELECT p.id_usuario AS perdido_usuario, p.nome AS perdido_nome,
                            e.id_usuario AS encontrado_usuario, e.nome AS encontrado_nome
                     FROM animais p, animais e
                     WHERE p.id_animal = $1 AND e.id_animal = $2`,
                    [perdidoId, encontradoId]
                );
                if (participantes.rows.length) {
                    const participante = participantes.rows[0];
                    await enviarNotificacaoMatch({
                        usuarioIds: [participante.perdido_usuario, participante.encontrado_usuario],
                        matchId: matchInserido.rows[0].id,
                        scoreTotal: match.scoreTotal,
                        perdidoNome: participante.perdido_nome,
                        encontradoNome: participante.encontrado_nome,
                    });
                }
            }
        }

        return res.json({ analise, matches: matches.map((match) => ({
            scoreTotal: match.scoreTotal,
            anuncio: match.candidato,
        })) });
    } catch (erro) {
        console.error('Erro na analise Gemini:', erro.message);
        return res.status(502).json({ mensagem: erro.message || 'Nao foi possivel analisar o anuncio.' });
    }
}

async function listarMatchesDoUsuario(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT m.*,
                    p.especie AS perdido_especie, p.nome AS perdido_nome, p.descricao AS perdido_descricao,
                    p.foto AS perdido_foto, p.fotos AS perdido_fotos, p.id_animal AS perdido_id,
                    e.especie AS encontrado_especie, e.nome AS encontrado_nome, e.descricao AS encontrado_descricao,
                    e.foto AS encontrado_foto, e.fotos AS encontrado_fotos, e.id_animal AS encontrado_id
             FROM matches_animais m
             JOIN animais p ON p.id_animal = m.anuncio_perdido_id
             JOIN animais e ON e.id_animal = m.anuncio_encontrado_id
             WHERE (p.id_usuario = $1 OR e.id_usuario = $1)
               AND m.status IN ('pendente', 'notificado')
             ORDER BY m.score_total DESC, m.criado_em DESC
             LIMIT 50`,
            [req.usuario.id]
        );
        return res.json({ matches: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar matches de IA:', erro.message);
        return res.status(500).json({ mensagem: 'Nao foi possivel listar os potenciais matches.' });
    }
}

async function atualizarStatusMatch(req, res) {
    try {
        const statusPermitidos = ['aceito_usuario', 'descartado_usuario'];
        const status = req.body?.status;
        if (!statusPermitidos.includes(status)) {
            return res.status(400).json({ mensagem: 'Status de match invalido.' });
        }

        const resultado = await pool.query(
            `SELECT m.*
             FROM matches_animais m
             JOIN animais p ON p.id_animal = m.anuncio_perdido_id
             JOIN animais e ON e.id_animal = m.anuncio_encontrado_id
             WHERE m.id = $1
               AND (p.id_usuario = $2 OR e.id_usuario = $2)`,
            [req.params.id, req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Match nao encontrado.' });
        }

        if (status !== 'aceito_usuario') {
            const descartado = await pool.query(
                `UPDATE matches_animais SET status = 'descartado_usuario', atualizado_em = NOW()
                 WHERE id = $1 RETURNING *`,
                [req.params.id]
            );
            return res.json({ match: descartado.rows[0] });
        }

        const dadosMatch = await pool.query(
            `SELECT m.id, p.id_usuario AS dono_perdido, p.nome AS perdido_nome,
                    p.id_animal AS perdido_id,
                    e.id_usuario AS dono_encontrado, e.nome AS encontrado_nome,
                    e.id_animal AS encontrado_id
             FROM matches_animais m
             JOIN animais p ON p.id_animal = m.anuncio_perdido_id
             JOIN animais e ON e.id_animal = m.anuncio_encontrado_id
             WHERE m.id = $1`,
            [req.params.id]
        );
        if (!dadosMatch.rows.length) {
            return res.json({ match: resultado.rows[0] });
        }

        const dados = dadosMatch.rows[0];
        if (Number(req.usuario.id) !== Number(dados.dono_perdido)) {
            return res.status(403).json({ mensagem: 'Somente o tutor do animal perdido pode confirmar o encontro.' });
        }

        const transacao = await pool.connect();
        try {
            await transacao.query('BEGIN');
            await transacao.query(
                `UPDATE animais SET status = 'Dono encontrado', atualizado_em = NOW()
                 WHERE id_animal = $1 AND id_usuario = $2`,
                [dados.encontrado_id, dados.dono_encontrado]
            );
            await transacao.query(
                `UPDATE matches_animais SET status = 'confirmado', atualizado_em = NOW()
                 WHERE id = $1`,
                [req.params.id]
            );
            await transacao.query(
                `DELETE FROM animais WHERE id_animal = $1 AND id_usuario = $2`,
                [dados.perdido_id, dados.dono_perdido]
            );
            await transacao.query('COMMIT');
        } catch (erro) {
            await transacao.query('ROLLBACK');
            throw erro;
        } finally {
            transacao.release();
        }

        const usuario1 = Math.min(Number(dados.dono_perdido), Number(dados.dono_encontrado));
        const usuario2 = Math.max(Number(dados.dono_perdido), Number(dados.dono_encontrado));
        const animalId = Number(req.usuario.id) === Number(dados.dono_perdido)
            ? dados.encontrado_id
            : dados.perdido_id;

        const conversa = await pool.query(
            `INSERT INTO conversas (usuario_1_id, usuario_2_id, animal_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (usuario_1_id, usuario_2_id)
             DO UPDATE SET animal_id = COALESCE(EXCLUDED.animal_id, conversas.animal_id)
             RETURNING id`,
            [usuario1, usuario2, animalId]
        );
        const conversaId = conversa.rows[0].id;

        await pool.query(
            `INSERT INTO preferencias_conversa (usuario_id, conversa_id, excluida_em)
             VALUES ($1, $2, NULL), ($3, $2, NULL)
             ON CONFLICT (usuario_id, conversa_id)
             DO UPDATE SET excluida_em = NULL`,
            [dados.dono_perdido, conversaId, dados.dono_encontrado]
        );

        const mensagemAutomatica =
            'Olá! Acredito que podemos estar falando do mesmo animal. O PetWanted encontrou uma possível correspondência entre os nossos anúncios.';
        const mensagemExiste = await pool.query(
            `SELECT id FROM mensagens_chat
             WHERE conversa_id = $1 AND remetente_id = $2 AND conteudo = $3
             LIMIT 1`,
            [conversaId, req.usuario.id, mensagemAutomatica]
        );
        let mensagem = null;
        if (!mensagemExiste.rows.length) {
            const inserida = await pool.query(
                `INSERT INTO mensagens_chat
                 (conversa_id, remetente_id, conteudo, animal_id, lida_em)
                 VALUES ($1, $2, $3, $4, NULL)
                 RETURNING id, conversa_id, remetente_id, conteudo, animal_id, criado_em`,
                [conversaId, req.usuario.id, mensagemAutomatica, animalId]
            );
            mensagem = inserida.rows[0];
            const destinatarioId = Number(req.usuario.id) === Number(dados.dono_perdido)
                ? Number(dados.dono_encontrado)
                : Number(dados.dono_perdido);
            enviarNotificacaoChat({
                usuarioId: destinatarioId,
                conversaId,
                mensagem,
                remetenteNome: req.usuario?.nome || 'PetWanted',
            });
        }

        return res.json({
            match: { ...resultado.rows[0], status: 'confirmado' },
            conversaId,
            mensagemAutomatica: mensagem,
        });
    } catch (erro) {
        console.error('Erro ao atualizar match de IA:', erro.message);
        return res.status(500).json({ mensagem: 'Nao foi possivel atualizar o match.' });
    }
}

module.exports = {
    analisarAnuncioPorId,
    listarMatchesDoUsuario,
    atualizarStatusMatch,
};
