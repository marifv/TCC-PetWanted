jest.mock('../database/connection', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

const crypto = require('node:crypto');
const pool = require('../database/connection');
const { aceitarConviteAdmin } = require('../controllers/adminAuthController');

function criarResposta() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

describe('aceitarConviteAdmin', () => {
    let client;

    beforeEach(() => {
        client = {
            query: jest.fn(),
            release: jest.fn(),
        };
        pool.connect.mockReset().mockResolvedValue(client);
    });

    it('cria a conta, consome o convite e registra o novo admin na auditoria', async () => {
        const token = 'a'.repeat(64);
        const hashToken = crypto.createHash('sha256').update(token).digest('hex');
        client.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [{ id: 21, email: 'mariana@example.com', role: 'analyst' }],
            })
            .mockResolvedValueOnce({
                rows: [{ id: 9, email: 'mariana@example.com', role: 'analyst' }],
            })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        const req = { body: { token, senha: 'senha-forte-com-12' } };
        const res = criarResposta();

        await aceitarConviteAdmin(req, res);

        expect(client.query).toHaveBeenNthCalledWith(
            2,
            expect.stringContaining('token_hash = $1'),
            [hashToken]
        );
        expect(client.query.mock.calls[2][1][1]).toMatch(/^\$2[aby]\$/);
        expect(client.query).toHaveBeenNthCalledWith(
            5,
            expect.stringContaining("VALUES ($1, 'convite_aceito', $2)"),
            [9, 'mariana@example.com']
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('rejeita convites expirados sem criar conta', async () => {
        const token = 'b'.repeat(64);
        client.query
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        const req = { body: { token, senha: 'senha-forte-com-12' } };
        const res = criarResposta();

        await aceitarConviteAdmin(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(client.query).toHaveBeenCalledTimes(3);
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
