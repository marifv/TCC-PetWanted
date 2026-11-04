const pool = require('../database/connection');
const { analisarAnimal } = require('../services/geminiService');

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

        const analise = await analisarAnimal({
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
                process.env.GEMINI_MODEL || 'gemini-2.5-flash',
                JSON.stringify(analise),
                Math.max(0, Math.min(1, Number(analise.confianca) || 0)),
            ]
        );

        const tipoCandidato = anuncio.tipo_registro === 'Perdido' ? 'Encontrado' : 'Perdido';
        const candidatos = await pool.query(
            `SELECT id_animal, especie, raca, cor, porte, sexo, descricao, tipo_registro,
                    data_evento, local_latitude, local_longitude
             FROM animais
             WHERE tipo_registro = $1 AND id_animal <> $2`,
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
            await pool.query(
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
                 WHERE matches_animais.status IN ('pendente', 'notificado', 'descartado_sistema')`,
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
               AND m.status IN ('pendente', 'notificado', 'aceito_usuario')
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
            `UPDATE matches_animais m SET status = $1, atualizado_em = NOW()
             FROM animais p, animais e
             WHERE m.id = $2
               AND p.id_animal = m.anuncio_perdido_id
               AND e.id_animal = m.anuncio_encontrado_id
               AND (p.id_usuario = $3 OR e.id_usuario = $3)
             RETURNING m.*`,
            [status, req.params.id, req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Match nao encontrado.' });
        }

        return res.json({ match: resultado.rows[0] });
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
