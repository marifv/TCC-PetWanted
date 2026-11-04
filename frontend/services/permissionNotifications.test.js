jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
}));

import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
    listarPermissoesNegadas,
    registrarPermissaoNegada,
    marcarPermissaoComoLida,
    abrirConfiguracoesPermissao,
} from './permissionNotifications';

describe('permissionNotifications', () => {
    let armazenamento;

    beforeEach(() => {
        armazenamento = null;
        SecureStore.getItemAsync.mockImplementation(async () => armazenamento);
        SecureStore.setItemAsync.mockImplementation(async (_chave, valor) => {
            armazenamento = valor;
        });
        jest.spyOn(DeviceEventEmitter, 'emit').mockImplementation(() => true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('lista a notificação de localização recusada', async () => {
        await registrarPermissaoNegada('location');

        const notificacoes = await listarPermissoesNegadas();

        expect(notificacoes).toHaveLength(1);
        expect(notificacoes[0]).toEqual(expect.objectContaining({
            id: 'permission-location',
            tipo: 'permission',
            permission: 'location',
            titulo: 'Localização não permitida',
            lida_em: null,
        }));
    });

    it('não cria notificação duplicada para o mesmo tipo', async () => {
        await registrarPermissaoNegada('photos');
        await registrarPermissaoNegada('photos');

        const notificacoes = await listarPermissoesNegadas();

        expect(notificacoes).toHaveLength(1);
        expect(notificacoes[0].permission).toBe('photos');
    });

    it('marca uma permissão recusada como lida', async () => {
        await registrarPermissaoNegada('notifications');
        await marcarPermissaoComoLida('notifications');

        const notificacoes = await listarPermissoesNegadas();

        expect(notificacoes[0].lida_em).toEqual(expect.any(String));
    });

    it('ignora tipos de permissão desconhecidos', async () => {
        await registrarPermissaoNegada('microphone');

        expect(await listarPermissoesNegadas()).toEqual([]);
        expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });
});
