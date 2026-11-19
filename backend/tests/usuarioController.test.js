jest.mock('../database/connection', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

const pool = require('../database/connection');
const { criarUsuario } = require('../controllers/usuarioController');

function criarResposta() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
}

describe('criarUsuario', () => {
    beforeEach(() => {
        pool.connect.mockReset();
    });

    it('rejeita uma senha fraca antes de conectar ao banco', async () => {
        const req = {
            body: {
                nome: 'Maria Silva',
                email: 'maria@email.com',
                documento: '12345678901',
                senha: 'Senha1!',
                tipo_perfil: 'Tutor',
            },
        };
        const res = criarResposta();

        await criarUsuario(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'A senha deve ter 12 caracteres, maiúscula, minúscula, número e caractere especial.',
        });
        expect(pool.connect).not.toHaveBeenCalled();
    });

    it('rejeita um CPF com dígitos verificadores inválidos', async () => {
        const req = {
            body: {
                nome: 'Maria Silva',
                email: 'maria@email.com',
                documento: '11111111111',
                senha: 'SenhaForte1!',
                tipo_perfil: 'Tutor',
            },
        };
        const res = criarResposta();

        await criarUsuario(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            mensagem: 'Informe um CPF válido.',
        });
        expect(pool.connect).not.toHaveBeenCalled();
    });
});
