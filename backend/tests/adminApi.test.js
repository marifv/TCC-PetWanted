jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = require('../app');
const pool = require('../database/connection');

describe('API administrativa', () => {
    beforeEach(() => {
        process.env.ADMIN_JWT_SECRET = 'segredo-administrativo-de-teste-com-mais-de-32-caracteres';
        pool.query.mockReset();
    });

    afterEach(() => {
        delete process.env.ADMIN_JWT_SECRET;
    });

    it('serve o painel web com política de segurança de conteúdo', async () => {
        const resposta = await request(app).get('/admin/');

        expect(resposta.status).toBe(200);
        expect(resposta.text).toContain('Administração | PetWanted');
        expect(resposta.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('bloqueia estatísticas sem sessão administrativa', async () => {
        const resposta = await request(app).get('/api/admin/estatisticas');

        expect(resposta.status).toBe(401);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('permite acesso às estatísticas para uma sessão ativa', async () => {
        const token = jwt.sign({ id: 3, tipo: 'admin' }, process.env.ADMIN_JWT_SECRET);
        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 3, email: 'analista@example.com', role: 'analyst', ativo: true }] })
            .mockResolvedValueOnce({ rows: [{ total: 1, ativos_30_dias: 1 }] })
            .mockResolvedValueOnce({
                rows: [{
                    total: 0, ativos: 0, concluidos: 0, perdidos_ativos: 0,
                    encontrados_ativos: 0, adocoes_ativas: 0, reunidos: 0, adotados: 0,
                }],
            })
            .mockResolvedValueOnce({
                rows: [{ gerados_no_periodo: 0, pendentes: 0, confirmados: 0, rejeitados: 0, avaliados: 0 }],
            })
            .mockResolvedValueOnce({ rows: [] });

        const resposta = await request(app)
            .get('/api/admin/estatisticas')
            .set('Cookie', `petwanted_admin_session=${token}`);

        expect(resposta.status).toBe(200);
        expect(resposta.body.usuarios).toEqual({ total: 1, ativosUltimos30Dias: 1 });
    });

    it('impede analista de gerenciar administradores', async () => {
        const token = jwt.sign({ id: 3, tipo: 'admin' }, process.env.ADMIN_JWT_SECRET);
        pool.query.mockResolvedValueOnce({
            rows: [{ id: 3, email: 'analista@example.com', role: 'analyst', ativo: true }],
        });

        const resposta = await request(app)
            .get('/api/admin/administradores')
            .set('Cookie', `petwanted_admin_session=${token}`);

        expect(resposta.status).toBe(403);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('faz login administrativo com cookie HttpOnly', async () => {
        const passwordHash = await bcrypt.hash('senha-super-segura', 4);
        pool.query
            .mockResolvedValueOnce({
                rows: [{ id: 8, email: 'owner@example.com', password_hash: passwordHash, role: 'owner' }],
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });

        const resposta = await request(app)
            .post('/api/admin/auth/login')
            .send({ email: 'owner@example.com', senha: 'senha-super-segura' });

        expect(resposta.status).toBe(200);
        expect(resposta.body.admin).toEqual({
            id: 8,
            email: 'owner@example.com',
            role: 'owner',
        });
        expect(resposta.headers['set-cookie'][0]).toContain('HttpOnly');
        expect(resposta.headers['set-cookie'][0]).toContain('SameSite=Strict');
        expect(resposta.headers['set-cookie'][0]).not.toContain('senha-super-segura');
    });
});
