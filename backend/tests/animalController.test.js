jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

jest.mock('../services/imageStorage', () => ({
    salvarImagem: jest.fn(),
}));

const pool = require('../database/connection');
const {
    criarRegistro,
    listarAnimaisEncontrados,
} = require('../controllers/animalController');

describe('listarAnimaisEncontrados', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('não lista animais cujo dono já foi encontrado', async () => {
        const animais = [{ id: 12, tipo_registro: 'Encontrado', status: 'Procurando Dono' }];
        pool.query.mockResolvedValueOnce({ rows: animais });
        const req = { get: jest.fn().mockReturnValue('localhost:3000'), protocol: 'http' };
        const res = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };

        await listarAnimaisEncontrados(req, res);

        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining(
            "AND status IS DISTINCT FROM 'Dono encontrado'"
        ));
        expect(res.json).toHaveBeenCalledWith([
            expect.objectContaining(animais[0]),
        ]);
    });
});

describe('criarRegistro', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('impede criar um registro usando o id de outro usuário', async () => {
        const req = {
            params: { usuarioId: '99' },
            usuario: { id: 7 },
            body: {},
        };
        const res = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };

        await criarRegistro(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Somente o usuário logado pode criar um registro para esta conta.',
        });
        expect(pool.query).not.toHaveBeenCalled();
    });
});
