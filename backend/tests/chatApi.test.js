jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const pool = require('../database/connection');

describe('API HTTP do backend', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'segredo-da-api-de-teste';
        pool.query.mockReset();
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it('responde com sucesso na rota pública de saúde', async () => {
        const resposta = await request(app).get('/api/health');

        expect(resposta.status).toBe(200);
        expect(resposta.body).toEqual({ status: 'ok' });
    });

    it('bloqueia rota de chat sem token', async () => {
        const resposta = await request(app).get('/api/chat/conversas');

        expect(resposta.status).toBe(401);
        expect(resposta.body).toEqual({ mensagem: 'Token não informado.' });
    });

    it('lista conversas com um JWT válido', async () => {
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 12, nome: 'Pessoa Teste', mensagens_nao_lidas: 2 }],
        });
        const token = jwt.sign({ id: 7, nome: 'Usuário Teste' }, process.env.JWT_SECRET);

        const resposta = await request(app)
            .get('/api/chat/conversas')
            .set('Authorization', `Bearer ${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body).toEqual([
            { id: 12, nome: 'Pessoa Teste', mensagens_nao_lidas: 2 },
        ]);
    });

    it('silencia uma conversa pela API', async () => {
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 12 }] })
            .mockResolvedValueOnce({ rows: [] });
        const token = jwt.sign({ id: 7, nome: 'Usuário Teste' }, process.env.JWT_SECRET);

        const resposta = await request(app)
            .patch('/api/chat/conversas/12/silenciamento')
            .set('Authorization', `Bearer ${token}`)
            .send({ silenciada: true });

        expect(resposta.status).toBe(200);
        expect(resposta.body).toEqual({ silenciada: true });
    });

    it('rejeita convite com identificação inválida', async () => {
        const token = jwt.sign({ id: 7, nome: 'Usuário Teste' }, process.env.JWT_SECRET);

        const resposta = await request(app)
            .post('/api/chat/conversas')
            .set('Authorization', `Bearer ${token}`)
            .send({ destinatarioId: 7 });

        expect(resposta.status).toBe(400);
        expect(resposta.body).toEqual({ mensagem: 'Destinatário inválido.' });
    });
});
