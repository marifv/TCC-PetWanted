const { validarMensagemChat } = require('../services/chatSocket');

describe('validarMensagemChat', () => {
    it('aceita uma mensagem de texto válida', () => {
        const resultado = validarMensagemChat({
            conversaId: 12,
            conteudo: '  Olá, encontrei seu pet  ',
            animalId: null,
        }, 7);

        expect(resultado).toEqual(expect.objectContaining({
            ok: true,
            conversaId: 12,
            conteudo: 'Olá, encontrei seu pet',
        }));
    });

    it('rejeita mensagem vazia sem anexo', () => {
        const resultado = validarMensagemChat({
            conversaId: 12,
            conteudo: '   ',
        }, 7);

        expect(resultado).toEqual({
            ok: false,
            mensagem: 'Mensagem inválida.',
        });
    });

    it('rejeita texto maior que 2000 caracteres', () => {
        const resultado = validarMensagemChat({
            conversaId: 12,
            conteudo: 'a'.repeat(2001),
        }, 7);

        expect(resultado).toEqual({
            ok: false,
            mensagem: 'Mensagem inválida.',
        });
    });

    it('aceita uma foto em Base64 dentro do limite', () => {
        const base64 = Buffer.from('foto-de-teste').toString('base64');
        const resultado = validarMensagemChat({
            conversaId: 12,
            conteudo: '',
            anexoData: `data:image/jpeg;base64,${base64}`,
            anexoTipo: 'image',
        }, 7);

        expect(resultado.ok).toBe(true);
        expect(resultado.anexoTipo).toBe('image');
    });

    it('rejeita um tipo de anexo inválido', () => {
        const resultado = validarMensagemChat({
            conversaId: 12,
            conteudo: '',
            anexoData: 'data:application/pdf;base64,cGRm',
            anexoTipo: 'document',
        }, 7);

        expect(resultado).toEqual({
            ok: false,
            mensagem: 'Tipo de anexo inválido.',
        });
    });

    it('rejeita um anexo maior que 15 MB', () => {
        const base64 = Buffer.alloc(15 * 1024 * 1024 + 1).toString('base64');
        const resultado = validarMensagemChat({
            conversaId: 12,
            conteudo: '',
            anexoData: `data:image/jpeg;base64,${base64}`,
            anexoTipo: 'image',
        }, 7);

        expect(resultado).toEqual({
            ok: false,
            mensagem: 'O anexo excede o limite de 15 MB.',
        });
    });
});
