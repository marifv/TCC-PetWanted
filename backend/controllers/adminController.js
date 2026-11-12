const crypto = require('node:crypto');
const pool = require('../database/connection');
const { enviarEmail } = require('../services/emailService');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAPEIS_ADMIN = ['owner', 'analyst'];
const DIAS_PERMITIDOS = [7, 30, 90, 365];

function escaparHtml(valor) {
    return String(valor).replace(/[&<>"']/g, (caractere) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[caractere]);
}

function urlPainelAdmin(req) {
    const base = process.env.ADMIN_PANEL_URL
        || `${req.protocol}://${req.get('host')}/admin`;
    const url = new URL(base);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        throw new Error('ADMIN_PANEL_URL precisa usar HTTPS em produção.');
    }
    return `${url.origin}${url.pathname.replace(/\/$/, '')}`;
}

async function registrarAuditoria(adminId, acao, emailAlvo, detalhes = {}) {
    await pool.query(
        `INSERT INTO admin_audit_logs (admin_id, acao, email_alvo, detalhes)
         VALUES ($1, $2, $3, $4::jsonb)`,
        [adminId, acao, emailAlvo, JSON.stringify(detalhes)]
    );
}

async function obterEstatisticas(req, res) {
    const dias = Number(req.query.dias || 30);
    if (!DIAS_PERMITIDOS.includes(dias)) {
        return res.status(400).json({ mensagem: 'Período inválido. Use 7, 30, 90 ou 365 dias.' });
    }

    try {
        const [usuarios, animais, matches, faixasPontuacao] = await Promise.all([
            pool.query(
                `SELECT COUNT(*)::integer AS total,
                        (SELECT COUNT(DISTINCT usuario_id)::integer
                         FROM usuarios_atividade_diaria
                         WHERE dia >= CURRENT_DATE - INTERVAL '29 days') AS ativos_30_dias
                 FROM usuarios`
            ),
            pool.query(
                `SELECT COUNT(*)::integer AS total,
                        COUNT(*) FILTER (
                            WHERE (tipo_registro = 'Perdido' AND status = 'Perdido')
                               OR (tipo_registro = 'Encontrado' AND status = 'Procurando Dono')
                               OR (tipo_registro = 'Adocao' AND status = 'Animal para Adoção')
                        )::integer AS ativos,
                        COUNT(*) FILTER (
                            WHERE status IN ('Dono encontrado', 'Animal Adotado')
                        )::integer AS concluidos,
                        COUNT(*) FILTER (
                            WHERE tipo_registro = 'Perdido' AND status = 'Perdido'
                        )::integer AS perdidos_ativos,
                        COUNT(*) FILTER (
                            WHERE tipo_registro = 'Encontrado' AND status = 'Procurando Dono'
                        )::integer AS encontrados_ativos,
                        COUNT(*) FILTER (
                            WHERE tipo_registro = 'Adocao' AND status = 'Animal para Adoção'
                        )::integer AS adocoes_ativas,
                        COUNT(*) FILTER (
                            WHERE status = 'Dono encontrado'
                        )::integer AS reunidos,
                        COUNT(*) FILTER (
                            WHERE status = 'Animal Adotado'
                        )::integer AS adotados
                 FROM animais`
            ),
            pool.query(
                `SELECT COUNT(*) FILTER (
                            WHERE criado_em >= NOW() - ($1::integer * INTERVAL '1 day')
                        )::integer AS gerados_no_periodo,
                        COUNT(*) FILTER (
                            WHERE status IN ('pendente', 'notificado')
                        )::integer AS pendentes,
                        COUNT(*) FILTER (
                            WHERE status IN ('confirmado', 'aceito_usuario')
                        )::integer AS confirmados,
                        COUNT(*) FILTER (
                            WHERE status = 'descartado_usuario'
                        )::integer AS rejeitados,
                        COUNT(*) FILTER (
                            WHERE status IN ('confirmado', 'descartado_usuario')
                        )::integer AS avaliados
                 FROM matches_animais`,
                [dias]
            ),
            pool.query(
                `SELECT CASE
                            WHEN score_total < 60 THEN '0-59'
                            WHEN score_total < 70 THEN '60-69'
                            WHEN score_total < 80 THEN '70-79'
                            WHEN score_total < 90 THEN '80-89'
                            ELSE '90-100'
                        END AS faixa,
                        COUNT(*) FILTER (WHERE status IN ('confirmado', 'aceito_usuario'))::integer AS confirmados,
                        COUNT(*) FILTER (WHERE status = 'descartado_usuario')::integer AS rejeitados,
                        COUNT(*) FILTER (
                            WHERE status IN ('confirmado', 'aceito_usuario', 'descartado_usuario')
                        )::integer AS avaliados
                 FROM matches_animais
                 WHERE status IN ('confirmado', 'aceito_usuario', 'descartado_usuario')
                 GROUP BY faixa
                 ORDER BY MIN(score_total)`
            ),
        ]);

        const usuarioStats = usuarios.rows[0];
        const animalStats = animais.rows[0];
        const matchStats = matches.rows[0];
        const avaliados = Number(matchStats.avaliados);
        const confirmados = Number(matchStats.confirmados);
        const rejeitados = Number(matchStats.rejeitados);

        return res.json({
            periodoDias: dias,
            usuarios: {
                total: Number(usuarioStats.total),
                ativosUltimos30Dias: Number(usuarioStats.ativos_30_dias),
            },
            animais: Object.fromEntries(
                Object.entries(animalStats).map(([chave, valor]) => [chave, Number(valor)])
            ),
            matches: {
                geradosNoPeriodo: Number(matchStats.gerados_no_periodo),
                pendentes: Number(matchStats.pendentes),
                confirmados,
                rejeitados,
                avaliados,
                precisaoComFeedback: avaliados
                    ? Math.round((confirmados / avaliados) * 1000) / 10
                    : null,
                taxaRejeicao: avaliados
                    ? Math.round((rejeitados / avaliados) * 1000) / 10
                    : null,
                porFaixaPontuacao: faixasPontuacao.rows.map((faixa) => ({
                    faixa: faixa.faixa,
                    confirmados: Number(faixa.confirmados),
                    rejeitados: Number(faixa.rejeitados),
                    avaliados: Number(faixa.avaliados),
                })),
            },
            definicoes: {
                ativo: 'Usuário autenticado que usou uma rota protegida em pelo menos um dos últimos 30 dias.',
                precisaoComFeedback: 'Matches confirmados divididos pelos matches confirmados ou rejeitados pelos tutores.',
                limitacao: 'A taxa reflete decisões dos usuários, não uma verificação independente. A atividade começa a ser registrada após esta atualização.',
            },
        });
    } catch (erro) {
        console.error('Erro ao carregar estatísticas administrativas:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível carregar as estatísticas.' });
    }
}

async function listarAdministradores(_req, res) {
    try {
        const [administradores, convites] = await Promise.all([
            pool.query(
                `SELECT id, email, role, ativo, criado_em, ultimo_login_em
                 FROM admin_accounts
                 ORDER BY criado_em ASC`
            ),
            pool.query(
                `SELECT id, email, role, criado_em, expira_em
                 FROM admin_invites
                 WHERE aceito_em IS NULL AND expira_em > NOW()
                 ORDER BY criado_em DESC`
            ),
        ]);
        return res.json({ administradores: administradores.rows, convites: convites.rows });
    } catch (erro) {
        console.error('Erro ao listar administradores:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível listar os administradores.' });
    }
}

async function convidarAdministrador(req, res) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = String(req.body?.role || 'analyst');
    if (!EMAIL_VALIDO.test(email) || email.length > 254 || !PAPEIS_ADMIN.includes(role)) {
        return res.status(400).json({ mensagem: 'Informe um e-mail e um perfil administrativo válidos.' });
    }

    try {
        const existente = await pool.query(
            'SELECT id FROM admin_accounts WHERE LOWER(email) = $1',
            [email]
        );
        if (existente.rows.length) {
            return res.status(409).json({ mensagem: 'Este e-mail já possui uma conta administrativa.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await pool.query(
            `DELETE FROM admin_invites
             WHERE LOWER(email) = $1 AND aceito_em IS NULL`,
            [email]
        );
        await pool.query(
            `INSERT INTO admin_invites (email, role, token_hash, convidado_por, expira_em)
             VALUES ($1, $2, $3, $4, NOW() + INTERVAL '48 hours')`,
            [email, role, tokenHash, req.admin.id]
        );

        let link;
        try {
            link = `${urlPainelAdmin(req)}#convite=${token}`;
            const linkSeguro = escaparHtml(link);
            await enviarEmail({
                to: email,
                subject: 'Convite para o painel administrativo PetWanted',
                html: `<p>Você recebeu um convite para acessar o painel administrativo do PetWanted.</p><p><a href="${linkSeguro}">Aceitar convite</a></p><p>O convite expira em 48 horas e pode ser usado uma única vez.</p>`,
                text: `Você recebeu um convite para acessar o painel administrativo do PetWanted. Acesse ${link}. O convite expira em 48 horas e pode ser usado uma única vez.`,
            });
        } catch (erroEmail) {
            await pool.query('DELETE FROM admin_invites WHERE token_hash = $1', [tokenHash]);
            console.error('Não foi possível enviar convite administrativo:', erroEmail.message);
            return res.status(502).json({ mensagem: 'Não foi possível enviar o convite. Verifique a configuração de e-mail e ADMIN_PANEL_URL.' });
        }

        await registrarAuditoria(req.admin.id, 'convite_criado', email, { role });
        return res.status(201).json({ mensagem: 'Convite enviado. Ele expira em 48 horas.' });
    } catch (erro) {
        console.error('Erro ao convidar administrador:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível criar o convite administrativo.' });
    }
}

async function atualizarAdministrador(req, res) {
    const id = Number(req.params.id);
    const { role, ativo } = req.body || {};
    if (!Number.isInteger(id) || id <= 0 || !PAPEIS_ADMIN.includes(role) || typeof ativo !== 'boolean') {
        return res.status(400).json({ mensagem: 'Informe um administrador, perfil e estado válidos.' });
    }
    if (id === Number(req.admin.id)) {
        return res.status(400).json({ mensagem: 'Você não pode alterar o próprio perfil ou desativar sua conta.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(7412, 1)');
        const atual = await client.query(
            'SELECT id, email, role, ativo FROM admin_accounts WHERE id = $1 FOR UPDATE',
            [id]
        );
        if (!atual.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ mensagem: 'Administrador não encontrado.' });
        }

        const adminAtual = atual.rows[0];
        if (adminAtual.ativo && adminAtual.role === 'owner' && (!ativo || role !== 'owner')) {
            await client.query(
                `SELECT id FROM admin_accounts
                 WHERE role = 'owner' AND ativo = TRUE
                 FOR UPDATE`
            );
            const outrosOwners = await client.query(
                `SELECT COUNT(*)::integer AS quantidade
                 FROM admin_accounts
                 WHERE role = 'owner' AND ativo = TRUE AND id <> $1`,
                [id]
            );
            if (Number(outrosOwners.rows[0].quantidade) === 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ mensagem: 'O sistema precisa manter pelo menos um administrador owner ativo.' });
            }
        }

        const atualizado = await client.query(
            `UPDATE admin_accounts SET role = $1, ativo = $2
             WHERE id = $3
             RETURNING id, email, role, ativo, criado_em, ultimo_login_em`,
            [role, ativo, id]
        );
        await client.query(
            `INSERT INTO admin_audit_logs (admin_id, acao, email_alvo, detalhes)
             VALUES ($1, 'admin_atualizado', $2, $3::jsonb)`,
            [
                req.admin.id,
                adminAtual.email,
                JSON.stringify({ role, ativo }),
            ]
        );
        await client.query('COMMIT');
        return res.json({ administrador: atualizado.rows[0] });
    } catch (erro) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar administrador:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível atualizar o administrador.' });
    } finally {
        client.release();
    }
}

async function listarAuditoria(_req, res) {
    try {
        const resultado = await pool.query(
            `SELECT log.id, admin.email AS admin_email, log.acao, log.email_alvo,
                    log.detalhes, log.criado_em
             FROM admin_audit_logs log
             LEFT JOIN admin_accounts admin ON admin.id = log.admin_id
             ORDER BY log.criado_em DESC
             LIMIT 100`
        );
        return res.json({ registros: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar auditoria administrativa:', erro.message);
        return res.status(500).json({ mensagem: 'Não foi possível carregar o registro de auditoria.' });
    }
}

module.exports = {
    obterEstatisticas,
    listarAdministradores,
    convidarAdministrador,
    atualizarAdministrador,
    listarAuditoria,
};
