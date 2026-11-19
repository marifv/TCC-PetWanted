const { senhaAtendePolitica } = require('../utils/passwordPolicy');

describe('política de senha', () => {
    it('aceita uma senha forte com 12 caracteres', () => {
        expect(senhaAtendePolitica('SenhaForte1!')).toBe(true);
    });

    it('rejeita senha curta', () => {
        expect(senhaAtendePolitica('Senha1!')).toBe(false);
    });

    it('rejeita senha sem uma das classes exigidas', () => {
        expect(senhaAtendePolitica('senhaforte123')).toBe(false);
        expect(senhaAtendePolitica('SENHAFORTE123')).toBe(false);
        expect(senhaAtendePolitica('SenhaForte123')).toBe(false);
    });

    it('rejeita senha com mais de 72 bytes', () => {
        expect(senhaAtendePolitica(`Senha1!${'a'.repeat(70)}`)).toBe(false);
    });
});
