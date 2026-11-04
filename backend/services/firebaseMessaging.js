const admin = require('firebase-admin');
const pool = require('../database/connection');

function carregarCredenciais() {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        return JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
    }
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
    return null;
}

let firebaseDisponivel = false;
try {
    const credenciais = carregarCredenciais();
    if (credenciais) {
        credenciais.private_key = credenciais.private_key?.replace(/\\n/g, '\n');
        admin.initializeApp({ credential: admin.credential.cert(credenciais) });
        firebaseDisponivel = true;
    }
} catch (erro) {
    console.error('Não foi possível inicializar o Firebase Admin:', erro.message);
}

async function enviarNotificacaoChat({ usuarioId, conversaId, mensagem, remetenteNome }) {
    if (!firebaseDisponivel) return;

    try {
        const resultado = await pool.query(
                        `SELECT dispositivo.token
                         FROM chat_dispositivos dispositivo
                         LEFT JOIN preferencias_conversa preferencia
                             ON preferencia.usuario_id = dispositivo.usuario_id
                            AND preferencia.conversa_id = $2
                         WHERE dispositivo.usuario_id = $1
                             AND preferencia.silenciada_em IS NULL`,
                        [usuarioId, conversaId]
        );
        const tokens = resultado.rows.map((linha) => linha.token);
        if (!tokens.length) return;

        const resposta = await admin.messaging().sendEachForMulticast({
            tokens,
            data: {
                title: remetenteNome || 'Nova mensagem',
                body: mensagem.conteudo.slice(0, 120),
                conversaId: String(mensagem.conversa_id),
                mensagemId: String(mensagem.id),
            },
            android: {
                priority: 'high',
            },
        });

        const invalidos = resposta.responses
            .map((item, indice) => ({ item, token: tokens[indice] }))
            .filter(({ item }) => !item.success && [
                'messaging/invalid-registration-token',
                'messaging/registration-token-not-registered',
            ].includes(item.error?.code))
            .map(({ token }) => token);

        if (invalidos.length) {
            await pool.query('DELETE FROM chat_dispositivos WHERE token = ANY($1)', [invalidos]);
        }
    } catch (erro) {
        console.error('Erro ao enviar notificação de chat:', erro.message);
    }
}

async function enviarNotificacaoMatch({ usuarioIds, matchId, scoreTotal, perdidoNome, encontradoNome }) {
    if (!firebaseDisponivel || !Array.isArray(usuarioIds) || usuarioIds.length === 0) return;

    try {
        for (const usuarioId of new Set(usuarioIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))) {
            const resultado = await pool.query(
                `SELECT token FROM chat_dispositivos WHERE usuario_id = $1`,
                [usuarioId]
            );
            const tokens = resultado.rows.map((linha) => linha.token);
            if (!tokens.length) continue;

            const resposta = await admin.messaging().sendEachForMulticast({
                tokens,
                data: {
                    type: 'match',
                    title: 'Novo potencial match',
                    body: `${perdidoNome || 'Um animal perdido'} e ${encontradoNome || 'um encontrado'} podem ser a mesma correspondência.`,
                    matchId: String(matchId),
                    score: String(scoreTotal),
                },
                android: { priority: 'high' },
            });

            const invalidos = resposta.responses
                .map((item, indice) => ({ item, token: tokens[indice] }))
                .filter(({ item }) => !item.success && [
                    'messaging/invalid-registration-token',
                    'messaging/registration-token-not-registered',
                ].includes(item.error?.code))
                .map(({ token }) => token);
            if (invalidos.length) {
                await pool.query('DELETE FROM chat_dispositivos WHERE token = ANY($1)', [invalidos]);
            }
        }
    } catch (erro) {
        console.error('Erro ao enviar notificação de match:', erro.message);
    }
}

module.exports = { enviarNotificacaoChat, enviarNotificacaoMatch };