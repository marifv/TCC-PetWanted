jest.mock('../database/connection', () => ({
    query: jest.fn(),
}));

jest.mock('../services/imageStorage', () => ({
    salvarImagem: jest.fn(),
}));

const pool = require('../database/connection');
const { modificarPerfil } = require('../controllers/perfilController');

describe('modificarPerfil', () => {
    beforeEach(() => {
        pool.query.mockReset();
    });

    it('impede alterar o perfil usando o id de outro usuário', async () => {
        const req = {
            params: { id: '99' },
            usuario: { id: 7 },
            body: { nome: 'Nome indevido' },
        };
        const res = {
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis(),
        };

        await modificarPerfil(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Somente o usuário logado pode alterar este perfil.',
        });
        expect(pool.query).not.toHaveBeenCalled();
    });
});
