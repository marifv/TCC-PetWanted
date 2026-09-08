const fs = require('fs');
const path = require('path');
const pool = require('../database/connection');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const CAMPOS_RETORNO = `
    id_animal AS id,
    nome,
    especie,
    raca,
    cor,
    porte,
    sexo,
    local_desaparecimento,
    local_encontrado,
    CASE
        WHEN tipo_registro = 'Perdido' THEN local_desaparecimento
        ELSE local_encontrado
    END AS local,
    data_evento AS data,
    tipo_registro,
    id_usuario,
    status,
    idade,
    faixa_etaria AS "faixaEtaria",
    responsavel,
    contato,
    descricao
`;

const TIPOS_REGISTRO = ['Perdido', 'Encontrado', 'Adocao'];
const CAMPOS_OBRIGATORIOS = ['especie', 'raca', 'cor', 'porte', 'sexo', 'dataEvento'];

function textoPreenchido(valor) {
    return String(valor || '').trim().length > 0;
}

function normalizarData(valor) {
    const data = String(valor || '').trim();
    const brasileira = data.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    return brasileira
        ? `${brasileira[3]}-${brasileira[2]}-${brasileira[1]}`
        : data;
}

function obterDadosRegistro(body, usuarioId) {
    const tipoRegistro = String(body.tipo_registro || '').trim();
    const localDesaparecimento = String(body.local_desaparecimento || '').trim();
    const localEncontrado = String(body.local_encontrado || '').trim();
    const localObrigatorio = tipoRegistro === 'Perdido'
        ? localDesaparecimento
        : localEncontrado;

    return {
        nome: body.nome?.trim() || null,
        especie: body.especie?.trim(),
        raca: body.raca?.trim(),
        cor: body.cor?.trim(),
        porte: body.porte?.trim(),
        sexo: body.sexo?.trim(),
        localDesaparecimento: tipoRegistro === 'Perdido' ? localDesaparecimento : null,
        localEncontrado: tipoRegistro === 'Perdido' ? null : localEncontrado,
        localObrigatorio,
        dataEvento: normalizarData(body.data_evento),
        tipoRegistro,
        idUsuario: usuarioId,
        status: body.status || null,
        idade: tipoRegistro === 'Adocao' ? body.idade?.trim() : null,
        faixaEtaria: tipoRegistro === 'Adocao' ? body.faixa_etaria?.trim() : null,
        responsavel: tipoRegistro === 'Adocao' ? body.responsavel?.trim() : null,
        contato: tipoRegistro === 'Adocao' ? body.contato?.trim() : null,
        descricao: body.descricao?.trim() || null,
        foto: body.foto ? String(body.foto).trim() : null,
    };
}

function base64ParaExtensao(base64) {
    if (!base64 || typeof base64 !== 'string') return null;

    const match = base64.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/i);
    if (!match) return null;

    const extensaoMap = {
        jpeg: 'jpg',
        png: 'png',
        jpg: 'jpg',
        webp: 'webp',
    };

    return extensaoMap[match[1].toLowerCase()] || 'jpg';
}

function salvarFotoArquivo(idAnimal, fotoBase64, req) {
    if (!fotoBase64 || typeof fotoBase64 !== 'string' || !fotoBase64.startsWith('data:image')) {
        return null;
    }

    const extensao = base64ParaExtensao(fotoBase64);
    if (!extensao) {
        return null;
    }

    const base64Limpo = fotoBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
    const fotosAnteriores = fs.existsSync(UPLOAD_DIR)
        ? fs.readdirSync(UPLOAD_DIR).filter((arquivo) => (
            arquivo.startsWith(`${idAnimal}.`) || arquivo.startsWith(`${idAnimal}-`)
        ))
        : [];

    fotosAnteriores.forEach((arquivo) => {
        fs.unlinkSync(path.join(UPLOAD_DIR, arquivo));
    });

    const arquivo = `${idAnimal}-${Date.now()}.${extensao}`;
    const caminho = path.join(UPLOAD_DIR, arquivo);

    fs.writeFileSync(caminho, Buffer.from(base64Limpo, 'base64'));

    const host = req?.get('host') || 'localhost:3000';
    const protocolo = req?.protocol || 'http';
    return `${protocolo}://${host}/uploads/${arquivo}`;
}

function fotoRegistrada(idAnimal, req) {
    const arquivos = fs.existsSync(UPLOAD_DIR)
        ? fs.readdirSync(UPLOAD_DIR).filter((arquivo) => (
            arquivo.startsWith(`${idAnimal}.`) || arquivo.startsWith(`${idAnimal}-`)
        )).map((arquivo) => ({
            arquivo,
            dataModificacao: fs.statSync(path.join(UPLOAD_DIR, arquivo)).mtimeMs,
        })).sort((primeiro, segundo) => segundo.dataModificacao - primeiro.dataModificacao)
        : [];

    if (arquivos.length === 0) {
        return null;
    }

    const host = req?.get('host') || 'localhost:3000';
    const protocolo = req?.protocol || 'http';
    return `${protocolo}://${host}/uploads/${arquivos[0].arquivo}?v=${arquivos[0].dataModificacao}`;
}

function anexarFotoAoRegistro(req, registro) {
    if (!registro || !registro.id) {
        return registro;
    }

    const foto = fotoRegistrada(registro.id, req);
    return foto ? { ...registro, foto } : registro;
}

function validarRegistro(dados) {
    const falhas = [];

    if (!TIPOS_REGISTRO.includes(dados.tipoRegistro)) {
        falhas.push('tipo de registro inválido');
    }

    if (!textoPreenchido(dados.idUsuario)) {
        falhas.push('usuário não identificado');
    }

    const camposObrigatoriosFaltando = CAMPOS_OBRIGATORIOS.filter((campo) => !textoPreenchido(dados[campo]));
    if (camposObrigatoriosFaltando.length > 0) {
        falhas.push(`campos obrigatórios faltando: ${camposObrigatoriosFaltando.join(', ')}`);
    }

    if (!textoPreenchido(dados.localObrigatorio)) {
        const nomeLocal = dados.tipoRegistro === 'Perdido'
            ? 'local do desaparecimento'
            : 'local encontrado';
        falhas.push(`campo obrigatório faltando: ${nomeLocal}`);
    }

    return falhas;
}

async function listarRegistros(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT ${CAMPOS_RETORNO}
             FROM animais
             WHERE id_usuario = $1
             ORDER BY id_animal DESC`,
            [req.params.usuarioId]
        );

        return res.json(resultado.rows.map((registro) => anexarFotoAoRegistro(req, registro)));
    } catch (error) {
        console.error('Erro ao listar registros de animais:', error);
        return res.status(500).json({ mensagem: 'Erro ao listar registros de animais.' });
    }
}

async function listarAnimaisPerdidos(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT ${CAMPOS_RETORNO}
             FROM animais
             WHERE tipo_registro = 'Perdido'
             ORDER BY id_animal DESC`
        );

        return res.json(resultado.rows.map((registro) => anexarFotoAoRegistro(req, registro)));
    } catch (error) {
        console.error('Erro ao listar animais perdidos:', error);
        return res.status(500).json({ mensagem: 'Erro ao listar animais perdidos.' });
    }
}

async function listarAnimaisEncontrados(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT ${CAMPOS_RETORNO}
             FROM animais
             WHERE tipo_registro = 'Encontrado'
             ORDER BY id_animal DESC`
        );

        return res.json(resultado.rows.map((registro) => anexarFotoAoRegistro(req, registro)));
    } catch (error) {
        console.error('Erro ao listar animais encontrados:', error);
        return res.status(500).json({ mensagem: 'Erro ao listar animais encontrados.' });
    }
}

async function listarAnimaisAdocao(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT ${CAMPOS_RETORNO}
             FROM animais
                         WHERE tipo_registro = 'Adocao'
                             AND status IS DISTINCT FROM 'Animal Adotado'
             ORDER BY id_animal DESC`
        );

        return res.json(resultado.rows.map((registro) => anexarFotoAoRegistro(req, registro)));
    } catch (error) {
        console.error('Erro ao listar animais para adoção:', error);
        return res.status(500).json({ mensagem: 'Erro ao listar animais para adoção.' });
    }
}

async function criarRegistro(req, res) {
    try {
        const dados = obterDadosRegistro(req.body, req.params.usuarioId);
        const falhas = validarRegistro(dados);

        if (falhas.length > 0) {
            return res.status(400).json({
                mensagem: `Erro ao criar registro de animal: ${falhas.join('; ')}.`
            });
        }

        const resultado = await pool.query(
            `INSERT INTO animais (
                nome, especie, raca, cor, porte, sexo,
                local_desaparecimento, local_encontrado, data_evento,
                tipo_registro, id_usuario, status, idade, faixa_etaria,
                responsavel, contato, descricao
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING ${CAMPOS_RETORNO}`,
            [
                dados.nome,
                dados.especie,
                dados.raca,
                dados.cor,
                dados.porte,
                dados.sexo,
                dados.localDesaparecimento || '',
                dados.localEncontrado || '',
                dados.dataEvento,
                dados.tipoRegistro,
                dados.idUsuario,
                dados.status || (dados.tipoRegistro === 'Encontrado' ? 'Procurando Dono' : dados.tipoRegistro === 'Adocao' ? 'Animal para Adoção' : 'Perdido'),
                dados.idade || null,
                dados.faixaEtaria || null,
                dados.responsavel || null,
                dados.contato || null,
                dados.descricao,
            ]
        );

        const animalCriado = resultado.rows[0];
        const foto = salvarFotoArquivo(animalCriado.id, dados.foto, req);

        return res.status(201).json({
            ...animalCriado,
            ...(foto ? { foto } : {}),
        });
    } catch (error) {
        console.error('Erro ao criar registro de animal:', error);
        const mensagem = error?.message || 'Erro ao criar registro de animal.';
        return res.status(500).json({ mensagem: `Erro ao criar registro de animal: ${mensagem}` });
    }
}

async function atualizarRegistro(req, res) {
    try {
        if (String(req.usuario?.id) !== String(req.params.usuarioId)) {
            return res.status(403).json({ mensagem: 'Somente o usuário que registrou o animal pode alterar seu status.' });
        }

        const dados = obterDadosRegistro(req.body, req.params.usuarioId);
        const falhas = validarRegistro(dados);

        if (falhas.length > 0) {
            return res.status(400).json({
                mensagem: `Erro ao atualizar registro de animal: ${falhas.join('; ')}.`
            });
        }

        const resultado = await pool.query(
            `UPDATE animais SET
                nome = $1, especie = $2, raca = $3, cor = $4, porte = $5, sexo = $6,
                local_desaparecimento = $7, local_encontrado = $8, data_evento = $9,
                tipo_registro = $10, status = $11, idade = $12, faixa_etaria = $13,
                responsavel = $14, contato = $15, descricao = $16
            WHERE id_animal = $17 AND id_usuario = $18
            RETURNING ${CAMPOS_RETORNO}`,
            [
                dados.nome,
                dados.especie,
                dados.raca,
                dados.cor,
                dados.porte,
                dados.sexo,
                dados.localDesaparecimento || '',
                dados.localEncontrado || '',
                dados.dataEvento,
                dados.tipoRegistro,
                dados.status || (dados.tipoRegistro === 'Encontrado' ? 'Procurando Dono' : dados.tipoRegistro === 'Adocao' ? 'Animal para Adoção' : 'Perdido'),
                dados.idade || null,
                dados.faixaEtaria || null,
                dados.responsavel || null,
                dados.contato || null,
                dados.descricao,
                req.params.id,
                dados.idUsuario
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado.' });
        }

        const foto = salvarFotoArquivo(Number(req.params.id), dados.foto, req);
        const atualizado = { ...resultado.rows[0], ...(foto ? { foto } : {}) };

        return res.json(atualizado);
    } catch (error) {
        console.error('Erro ao atualizar registro de animal:', error);
        const mensagem = error?.message || 'Erro ao atualizar registro de animal.';
        return res.status(500).json({ mensagem: `Erro ao atualizar registro de animal: ${mensagem}` });
    }
}

async function excluirRegistro(req, res) {
    try {
        if (String(req.usuario?.id) !== String(req.params.usuarioId)) {
            return res.status(403).json({ mensagem: 'Somente o usuário que registrou o animal pode excluí-lo.' });
        }

        const resultado = await pool.query(
            'DELETE FROM animais WHERE id_animal = $1 AND id_usuario = $2 RETURNING id_animal AS id',
            [req.params.id, req.params.usuarioId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Registro não encontrado.' });
        }

        return res.status(200).json({
            id: resultado.rows[0].id,
            mensagem: 'Animal excluído com sucesso.'
        });
    } catch (error) {
        console.error('Erro ao excluir registro de animal:', error);
        return res.status(500).json({ mensagem: 'Erro ao excluir registro de animal.' });
    }
}

module.exports = {
    listarRegistros,
    listarAnimaisPerdidos,
    listarAnimaisEncontrados,
    listarAnimaisAdocao,
    criarRegistro,
    atualizarRegistro,
    excluirRegistro
};
