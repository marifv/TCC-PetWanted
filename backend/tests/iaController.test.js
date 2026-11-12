jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

jest.mock('../services/geminiService', () => ({
    analisarAnimal: jest.fn(),
}));

jest.mock('../services/firebaseMessaging', () => ({
    enviarNotificacaoChat: jest.fn(),
    enviarNotificacaoMatch: jest.fn(),
}));

const pool = require('../database/connection');
const { analisarAnimal } = require('../services/geminiService');
const { analisarAnuncioPorId, listarMatchesDoUsuario } = require('../controllers/iaController');

function criarResposta() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

describe('analisarAnuncioPorId', () => {
    beforeEach(() => {
        pool.query.mockReset();
        analisarAnimal.mockReset();
    });

    it('rejeita anuncios concluidos sem criar analise nem matches', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{
                id_animal: 12,
                tipo_registro: 'Encontrado',
                status: 'Dono encontrado',
            }],
        });
        const req = { params: { id: '12' }, usuario: { id: 7 } };
        const res = criarResposta();

        await analisarAnuncioPorId(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Somente anuncios ativos podem ser analisados.',
        });
        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(analisarAnimal).not.toHaveBeenCalled();
    });

    it('considera somente registros ativos como candidatos', async () => {
        const anuncio = {
            id_animal: 12,
            especie: 'Gato',
            tipo_registro: 'Perdido',
            status: 'Perdido',
            foto: 'https://example.com/gato.jpg',
            fotos: [],
        };
        pool.query
            .mockResolvedValueOnce({ rows: [anuncio] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        analisarAnimal.mockResolvedValueOnce({
            especie: 'Gato',
            confianca: 0.9,
            modelo: 'test',
        });
        const req = { params: { id: '12' }, usuario: { id: 7 } };
        const res = criarResposta();

        await analisarAnuncioPorId(req, res);

        expect(pool.query.mock.calls[0][0]).toContain('tipo_registro, status, data_evento');
        expect(pool.query.mock.calls[2][0]).toContain(
            "(tipo_registro = 'Encontrado' AND status = 'Procurando Dono')"
        );
        expect(pool.query.mock.calls[2][0]).toContain(
            "(tipo_registro = 'Perdido' AND status = 'Perdido')"
        );
        expect(res.json).toHaveBeenCalledWith({
            analise: expect.objectContaining({ especie: 'Gato' }),
            matches: [],
        });
    });
});

describe('listarMatchesDoUsuario', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('lista matches pendentes somente quando os dois anuncios continuam ativos', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });
        const req = { usuario: { id: 7 } };
        const res = criarResposta();

        await listarMatchesDoUsuario(req, res);

        const consulta = pool.query.mock.calls[0][0];
        expect(consulta).toContain("p.tipo_registro = 'Perdido' AND p.status = 'Perdido'");
        expect(consulta).toContain("e.tipo_registro = 'Encontrado' AND e.status = 'Procurando Dono'");
        expect(res.json).toHaveBeenCalledWith({ matches: [] });
    });
});
