const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../database/connection');
const { enviarNotificacaoChat } = require('./firebaseMessaging');

function inicializarSocketChat(servidor) {
    const io = new Server(servidor, {
        cors: { origin: process.env.FRONTEND_ORIGIN || '*' },
    });

    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token || !process.env.JWT_SECRET) {
            return next(new Error('Autenticação necessária.'));
        }

        try {
            const usuario = jwt.verify(token, process.env.JWT_SECRET);
            socket.data.usuarioId = Number(usuario.id);
            return next();
        } catch (erro) {
            return next(new Error('Token inválido ou expirado.'));
        }
    });

    io.on('connection', (socket) => {
        const usuarioId = socket.data.usuarioId;
        socket.join(`usuario:${usuarioId}`);

        socket.on('conversa:entrar', async ({ conversaId } = {}) => {
            const id = Number(conversaId);
            if (!Number.isInteger(id) || id <= 0) return;

            const resultado = await pool.query(
                `SELECT id FROM conversas
                 WHERE id = $1 AND (usuario_1_id = $2 OR usuario_2_id = $2)`,
                [id, usuarioId]
            );
            if (resultado.rows.length) socket.join(`conversa:${id}`);
        });

        socket.on('mensagem:enviar', async (dados = {}, confirmar = () => {}) => {
            const conversaId = Number(dados.conversaId);
            const conteudo = typeof dados.conteudo === 'string' ? dados.conteudo.trim() : '';
            if (!Number.isInteger(conversaId) || conversaId <= 0 || !conteudo || conteudo.length > 2000) {
                return confirmar({ ok: false, mensagem: 'Mensagem inválida.' });
            }

            try {
                const conversa = await pool.query(
                    `SELECT id, usuario_1_id, usuario_2_id
                     FROM conversas
                     WHERE id = $1 AND (usuario_1_id = $2 OR usuario_2_id = $2)`,
                    [conversaId, usuarioId]
                );
                if (!conversa.rows.length) {
                    return confirmar({ ok: false, mensagem: 'Conversa não encontrada.' });
                }

                const resultado = await pool.query(
                    `INSERT INTO mensagens_chat (conversa_id, remetente_id, conteudo)
                     VALUES ($1, $2, $3)
                     RETURNING id, conversa_id, remetente_id, conteudo, criado_em`,
                    [conversaId, usuarioId, conteudo]
                );
                const mensagem = resultado.rows[0];
                const membros = conversa.rows[0];

                io.to(`usuario:${membros.usuario_1_id}`).to(`usuario:${membros.usuario_2_id}`).emit('mensagem:nova', mensagem);
                confirmar({ ok: true, mensagem });

                const destinatarioId = Number(membros.usuario_1_id) === usuarioId
                    ? membros.usuario_2_id
                    : membros.usuario_1_id;
                await pool.query(
                    `UPDATE preferencias_conversa
                     SET excluida_em = NULL
                     WHERE conversa_id = $1 AND usuario_id = $2`,
                    [conversaId, destinatarioId]
                );
                const remetente = await pool.query('SELECT nome FROM usuarios WHERE id = $1', [usuarioId]);
                enviarNotificacaoChat({
                    usuarioId: destinatarioId,
                    conversaId,
                    mensagem,
                    remetenteNome: remetente.rows[0]?.nome,
                });
            } catch (erro) {
                console.error('Erro ao salvar mensagem:', erro);
                confirmar({ ok: false, mensagem: 'Não foi possível enviar a mensagem.' });
            }
        });
    });

    return io;
}

module.exports = { inicializarSocketChat };