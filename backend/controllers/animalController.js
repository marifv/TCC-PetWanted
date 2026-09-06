const pool = require('../database/connection');

const CAMPOS_RETORNO = `
	id,
	nome,
	especie,
	raca,
	cor,
	porte,
	sexo,
	local_desaparecimento,
	local_encontrado,
	data_evento,
	tipo_registro,
	id_usuario,
	descricao
`;

const CAMPOS_OBRIGATORIOS = ['especie', 'raca', 'cor', 'porte', 'sexo', 'local_desaparecimento', 'local_encontrado', 'data_evento'];

function validarCampos(dados) {
	return CAMPOS_OBRIGATORIOS.every((campo) => String(dados[campo] || '').trim());
}

async function listarRegistros(req, res) {
	try {
		const resultado = await pool.query(
			`SELECT ${CAMPOS_RETORNO}
				 FROM animais
			 ORDER BY id DESC`,
		);

		return res.json(resultado.rows);
	} catch (error) {
		console.error('Erro ao listar registros de animais:', error);
		return res.status(500).json({ mensagem: 'Erro ao listar registros de animais.' });
	}
}

async function criarRegistro(req, res) {
	try {
		const {
			nome,
			especie,
			raca,
			cor,
			porte,
			sexo,
			local_desaparecimento,
			local_encontrado,
			data_evento,
			tipo_registro,
			id_usuario,
			descricao
		} = req.body;

		if (!validarCampos({ especie, raca, cor, porte, sexo, local_desaparecimento, local_encontrado, data_evento })) {
			return res.status(400).json({ mensagem: 'Preencha os campos obrigatórios.' });
		}

		if (tipo_registro == 'Perdido' && !local_desaparecimento) {
			const resultado = await pool.query(
				`INSERT INTO animais
				(nome, especie, raca, cor, porte, sexo, local_desaparecimento, data_evento, tipo_registro, id_usuario, descricao)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 RETURNING ${CAMPOS_RETORNO}`,
				[
					nome?.trim() || null,
					especie.trim(),
					raca.trim(),
					cor.trim(),
					porte.trim(),
					sexo.trim(),
					local_desaparecimento.trim(),
					local_encontrado?.trim() || null,
					data_evento || null,
					tipo_registro?.trim() || null,
					id_usuario || null,
					descricao?.trim() || null
				]
			);

		}

		if (tipo_registro == 'Encontrado' && !local_encontrado) {
			const resultado = await pool.query(
				`INSERT INTO animais
				(nome, especie, raca, cor, porte, sexo, local_encontrado, data_evento, tipo_registro, id_usuario, descricao)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 RETURNING ${CAMPOS_RETORNO}`,
				[
					nome?.trim() || null,
					especie.trim(),
					raca.trim(),
					cor.trim(),
					porte.trim(),
					sexo.trim(),
					local_desaparecimento.trim(),
					local_encontrado?.trim() || null,
					data_evento || null,
					tipo_registro?.trim() || null,
					id_usuario || null,
					descricao?.trim() || null
				]
			);
		}


		return res.status(201).json(resultado.rows[0]);
	} catch (error) {
		console.error('Erro ao criar registro de animal:', error);
		return res.status(500).json({ mensagem: 'Erro ao criar registro de animal.' });
	}
}

async function atualizarRegistro(req, res) {
	try {
		const { id } = req.params;
		const {
			nome,
			especie,
			raca,
			cor,
			porte,
			sexo,
			local_desaparecimento,
			local_encontrado,
			data_evento,
			tipo_registro,
			id_usuario,
			descricao
		} = req.body;

		if (!validarCampos({ especie, raca, cor, porte, sexo, local_desaparecimento, local_encontrado, data_evento })) {
			return res.status(400).json({ mensagem: 'Preencha os campos obrigatórios.' });
		}

		const resultado = await pool.query(
			`UPDATE animais
			 SET nome = $1,
				 especie = $2,
				 raca = $3,
				 cor = $4,
				 porte = $5,
				 sexo = $6,
				local_desaparecimento = $7,
				local_encontrado = $8,
				data_evento = $9,
				tipo_registro = $10,
				id_usuario = $11,
				descricao = $12
			 WHERE id = $13
			 RETURNING ${CAMPOS_RETORNO}`,
			[
				nome?.trim() || null,
				especie.trim(),
				raca.trim(),
				cor.trim(),
				porte.trim(),
				sexo.trim(),
				local_desaparecimento.trim(),
				local_encontrado?.trim() || null,
				data_evento || null,
				tipo_registro?.trim() || null,
				id_usuario || null,
				descricao?.trim() || null,
				id
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
		const resultado = await pool.query(
			'DELETE FROM animais WHERE id = $1 RETURNING id',
			[req.params.id]
		);

		if (resultado.rows.length === 0) {
			return res.status(404).json({ mensagem: 'Registro não encontrado.' });
		}

		return res.status(204).send();
	} catch (error) {
		console.error('Erro ao excluir registro de animal:', error);
		return res.status(500).json({ mensagem: 'Erro ao excluir registro de animal.' });
	}
}

module.exports = {
	listarRegistros,
	criarRegistro,
	atualizarRegistro,
	excluirRegistro
};
