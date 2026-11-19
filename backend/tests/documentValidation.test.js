const {
    cpfValido,
    cnpjValido,
} = require('../utils/documentValidation');

describe('validação estrutural de documentos', () => {
    it('aceita CPFs válidos', () => {
        expect(cpfValido('52998224725')).toBe(true);
        expect(cpfValido('12345678901')).toBe(false);
    });

    it('rejeita sequências repetidas e documentos incompletos', () => {
        expect(cpfValido('11111111111')).toBe(false);
        expect(cpfValido('123456789')).toBe(false);
        expect(cnpjValido('00000000000000')).toBe(false);
    });

    it('valida CNPJ pelos dígitos verificadores', () => {
        expect(cnpjValido('11222333000181')).toBe(true);
        expect(cnpjValido('11222333000182')).toBe(false);
    });
});
