jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

const pool = require('../database/connection');
const { alterarSilenciamento, criarConversa } = require('../controllers/chatController');

function criarResposta() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

describe('alterarSilenciamento', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('silencia uma conversa do usuário participante', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 12 }] })
            .mockResolvedValueOnce({ rows: [] });

        const req = {
            usuario: { id: 7 },
            params: { id: '12' },
            body: { silenciada: true },
        };
        const res = criarResposta();

        await alterarSilenciamento(req, res);

        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('INSERT INTO preferencias_conversa'),
            [7, 12, true]
        );
        expect(res.json).toHaveBeenCalledWith({ silenciada: true });
    });

    it('reativa as notificações da conversa', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 12 }] })
            .mockResolvedValueOnce({ rows: [] });

        const req = {
            usuario: { id: 7 },
            params: { id: '12' },
            body: { silenciada: false },
        };
        const res = criarResposta();

        await alterarSilenciamento(req, res);

        expect(pool.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('CASE WHEN $3 THEN NOW() ELSE NULL END'),
            [7, 12, false]
        );
        expect(res.json).toHaveBeenCalledWith({ silenciada: false });
    });

    it('rejeita uma conversa na qual o usuário não participa', async () => {
        pool.query.mockResolvedValueOnce({ rows: [] });

        const req = {
            usuario: { id: 7 },
            params: { id: '12' },
            body: { silenciada: true },
        };
        const res = criarResposta();

        await alterarSilenciamento(req, res);

        expect(pool.query).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ mensagem: 'Conversa não encontrada.' });
    });

    it('rejeita parâmetros inválidos sem consultar o banco', async () => {
        const req = {
            usuario: { id: 7 },
            params: { id: 'abc' },
            body: { silenciada: true },
        };
        const res = criarResposta();

        await alterarSilenciamento(req, res);

        expect(pool.query).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Conversa ou opção de silenciamento inválida.',
        });
    });

    describe('criarConversa', () => {
        beforeEach(() => {
            pool.query.mockReset();
        });

        it('normaliza os participantes antes de criar ou reutilizar a conversa', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id: 25 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 25,
                        outro_usuario_id: 5,
                        nome: 'Pessoa Teste',
                        animal_id: null,
                    }],
                });

            const req = {
                usuario: { id: 9 },
                body: { destinatarioId: 5 },
            };
            const res = criarResposta();

            await criarConversa(req, res);

            expect(pool.query).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('ON CONFLICT (usuario_1_id, usuario_2_id)'),
                [5, 9, null]
            );
            expect(pool.query).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('INSERT INTO preferencias_conversa'),
                [9, 25]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 25 }));
        });

        it('associa um anúncio válido à conversa', async () => {
            pool.query
                .mockResolvedValueOnce({ rows: [{ id_usuario: 5 }] })
                .mockResolvedValueOnce({ rows: [{ id: 25 }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 25,
                        outro_usuario_id: 5,
                        nome: 'Pessoa Teste',
                        animal_id: 30,
                    }],
                });

            const req = {
                usuario: { id: 9 },
                body: { destinatarioId: 5, animalId: 30 },
            };
            const res = criarResposta();

            await criarConversa(req, res);

            expect(pool.query).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('INSERT INTO conversas'),
                [5, 9, 30]
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ animal_id: 30 }));
        });

        it('recusa um destinatário igual ao usuário autenticado', async () => {
            const req = {
                usuario: { id: 9 },
                body: { destinatarioId: 9 },
            };
            const res = criarResposta();

            await criarConversa(req, res);

            expect(pool.query).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ mensagem: 'Destinatário inválido.' });
        });

        it('recusa um anúncio que não pertence ao destinatário', async () => {
            pool.query.mockResolvedValueOnce({ rows: [{ id_usuario: 11 }] });

            const req = {
                usuario: { id: 9 },
                body: { destinatarioId: 5, animalId: 30 },
            };
            const res = criarResposta();

            await criarConversa(req, res);

            expect(pool.query).toHaveBeenCalledTimes(1);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ mensagem: 'O anúncio não pertence ao destinatário.' });
        });
    });
});
