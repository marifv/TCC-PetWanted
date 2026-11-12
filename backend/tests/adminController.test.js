jest.mock('../database/connection', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../services/emailService', () => ({
    enviarEmail: jest.fn(),
}));

const pool = require('../database/connection');
const { enviarEmail } = require('../services/emailService');
const { obterEstatisticas, convidarAdministrador } = require('../controllers/adminController');

function criarResposta() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

describe('obterEstatisticas', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('calcula estatísticas sem expor dados individuais', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ total: 25, ativos_30_dias: 9 }] })
            .mockResolvedValueOnce({
                rows: [{
                    total: 30,
                    ativos: 18,
                    concluidos: 12,
                    perdidos_ativos: 5,
                    encontrados_ativos: 7,
                    adocoes_ativas: 6,
                    reunidos: 8,
                    adotados: 4,
                }],
            })
            .mockResolvedValueOnce({
                rows: [{
                    gerados_no_periodo: 20,
                    pendentes: 3,
                    confirmados: 9,
                    rejeitados: 3,
                    avaliados: 12,
                }],
            })
            .mockResolvedValueOnce({
                rows: [{ faixa: '70-79', confirmados: 2, rejeitados: 1, avaliados: 3 }],
            });
        const req = { query: { dias: '30' } };
        const res = criarResposta();

        await obterEstatisticas(req, res);

        const resultado = res.json.mock.calls[0][0];
        expect(resultado.usuarios).toEqual({ total: 25, ativosUltimos30Dias: 9 });
        expect(resultado.animais.adotados).toBe(4);
        expect(resultado.matches).toEqual(expect.objectContaining({
            geradosNoPeriodo: 20,
            confirmados: 9,
            rejeitados: 3,
            precisaoComFeedback: 75,
            taxaRejeicao: 25,
        }));
        expect(pool.query.mock.calls[2][0]).toContain("status IN ('confirmado', 'aceito_usuario')");
        expect(JSON.stringify(resultado)).not.toContain('email');
        expect(JSON.stringify(resultado)).not.toContain('documento');
    });

    it('rejeita períodos não suportados', async () => {
        const req = { query: { dias: '12' } };
        const res = criarResposta();

        await obterEstatisticas(req, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe('convidarAdministrador', () => {
    beforeEach(() => {
        pool.query.mockReset();
        enviarEmail.mockReset();
        delete process.env.ADMIN_PANEL_URL;
        delete process.env.NODE_ENV;
    });

    it('cria convite de uso único e envia o link sem salvar o token em texto puro', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        enviarEmail.mockResolvedValueOnce({});
        const req = {
            body: { email: 'mariana@example.com', role: 'analyst' },
            admin: { id: 1 },
            protocol: 'https',
            get: jest.fn().mockReturnValue('petwanted.example'),
        };
        const res = criarResposta();

        await convidarAdministrador(req, res);

        expect(pool.query.mock.calls[2][0]).toContain('token_hash');
        expect(pool.query.mock.calls[2][1][2]).toMatch(/^[a-f0-9]{64}$/);
        expect(enviarEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'mariana@example.com',
            text: expect.stringMatching(/#convite=[a-f0-9]{64}/),
        }));
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('não envia convite para um e-mail que já seja administrador', async () => {
        pool.query.mockResolvedValueOnce({ rows: [{ id: 5 }] });
        const req = {
            body: { email: 'admin@example.com', role: 'analyst' },
            admin: { id: 1 },
        };
        const res = criarResposta();

        await convidarAdministrador(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(enviarEmail).not.toHaveBeenCalled();
    });
});
