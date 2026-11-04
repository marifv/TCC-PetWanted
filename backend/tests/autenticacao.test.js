const jwt = require('jsonwebtoken');
const autenticarToken = require('../middleware/autenticacao');

describe('autenticarToken', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'segredo-de-teste';
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    it('bloqueia uma requisição sem token', () => {
        const req = { headers: {} };
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();
        const res = { status, json };
        const next = jest.fn();

        autenticarToken(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({ mensagem: 'Token não informado.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('coloca os dados do usuário autenticado na requisição', () => {
        const token = jwt.sign({ id: 7, nome: 'Teste' }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();
        const res = { status, json };
        const next = jest.fn();

        autenticarToken(req, res, next);

        expect(req.usuario).toMatchObject({ id: 7, nome: 'Teste' });
        expect(next).toHaveBeenCalledTimes(1);
        expect(status).not.toHaveBeenCalled();
    });

    it('rejeita um token inválido', () => {
        const req = { headers: { authorization: 'Bearer token-invalido' } };
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();
        const res = { status, json };
        const next = jest.fn();

        autenticarToken(req, res, next);

        expect(status).toHaveBeenCalledWith(401);
        expect(json).toHaveBeenCalledWith({ mensagem: 'Token inválido ou expirado.' });
        expect(next).not.toHaveBeenCalled();
    });
});
