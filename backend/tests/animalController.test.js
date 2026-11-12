jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

jest.mock('../services/imageStorage', () => ({
    salvarImagem: jest.fn(),
}));

const pool = require('../database/connection');
const { listarAnimaisEncontrados } = require('../controllers/animalController');

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
