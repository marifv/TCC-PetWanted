const pool = require('../database/connection');

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
    };
}

function registroValido(dados) {
    return TIPOS_REGISTRO.includes(dados.tipoRegistro)
        && textoPreenchido(dados.idUsuario)
        && CAMPOS_OBRIGATORIOS.every((campo) => textoPreenchido(dados[campo]))
        && textoPreenchido(dados.localObrigatorio);
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

        return res.json(resultado.rows);
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

        return res.json(resultado.rows);
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

        return res.json(resultado.rows);
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

        return res.json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar animais para adoção:', error);
        return res.status(500).json({ mensagem: 'Erro ao listar animais para adoção.' });
    }
}

async function criarRegistro(req, res) {
    try {
        const dados = obterDadosRegistro(req.body, req.params.usuarioId);

        if (!registroValido(dados)) {
            return res.status(400).json({
                mensagem: 'Preencha os campos obrigatórios e informe um tipo de registro válido.'
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
                dados.descricao
            ]
        );

        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao criar registro de animal:', error);
        return res.status(500).json({ mensagem: 'Erro ao criar registro de animal.' });
    }
}

async function atualizarRegistro(req, res) {
    try {
        if (String(req.usuario?.id) !== String(req.params.usuarioId)) {
            return res.status(403).json({ mensagem: 'Somente o usuário que registrou o animal pode alterar seu status.' });
        }

        const dados = obterDadosRegistro(req.body, req.params.usuarioId);

        if (!registroValido(dados)) {
            return res.status(400).json({
                mensagem: 'Preencha os campos obrigatórios e informe um tipo de registro válido.'
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

        return res.json(resultado.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar registro de animal:', error);
        return res.status(500).json({ mensagem: 'Erro ao atualizar registro de animal.' });
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
