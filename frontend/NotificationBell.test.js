jest.mock('./services/permissionNotifications', () => ({
    abrirConfiguracoesPermissao: jest.fn(() => Promise.resolve()),
    listarPermissoesNegadas: jest.fn(),
    marcarPermissaoComoLida: jest.fn(() => Promise.resolve()),
    observarPermissoesNegadas: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('./services/iaMatches', () => ({
    listarMatches: jest.fn(() => Promise.resolve([])),
    decidirMatch: jest.fn(() => Promise.resolve({ match: {} })),
}));

jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    const Icone = ({ name }) => React.createElement(Text, null, name);
    return {
        FontAwesome: Icone,
        MaterialCommunityIcons: Icone,
    };
});

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import NotificationBell from './NotificationBell';
import {
    abrirConfiguracoesPermissao,
    listarPermissoesNegadas,
    marcarPermissaoComoLida,
} from './services/permissionNotifications';

describe('NotificationBell', () => {
    beforeEach(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
        global.fetch = jest.fn();
        jest.spyOn(global, 'setInterval').mockImplementation(() => 1);
        jest.spyOn(global, 'clearInterval').mockImplementation(() => {});
        listarPermissoesNegadas.mockResolvedValue([]);
        abrirConfiguracoesPermissao.mockResolvedValue();
        marcarPermissaoComoLida.mockResolvedValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('combina mensagens não lidas do chat com permissões negadas', async () => {
        listarPermissoesNegadas.mockResolvedValue([
            { permission: 'location', lida_em: null },
            { permission: 'photos', lida_em: '2026-11-03T00:00:00.000Z' },
        ]);
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ naoLidas: 3 }),
        });

        await render(<NotificationBell token="token-teste" />);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('4')).toBeTruthy();
        });
        expect(screen.getByLabelText('4 mensagens não lidas')).toBeTruthy();
    });

    it('mostra notificações de chat e de permissão ao abrir o sino', async () => {
        listarPermissoesNegadas.mockResolvedValue([{
            id: 'permission-location',
            tipo: 'permission',
            permission: 'location',
            remetente_nome: 'Permissão necessária',
            conteudo: 'Ative a localização nas configurações.',
            titulo: 'Localização não permitida',
            criado_em: '2026-11-03T15:00:00.000Z',
            lida_em: null,
        }]);
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ naoLidas: 1 }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 15,
                    remetente_nome: 'Maria',
                    remetente_foto: null,
                    conteudo: 'Encontramos seu pet',
                    criado_em: '2026-11-03T16:00:00.000Z',
                    lida_em: null,
                }],
            });

        await render(<NotificationBell token="token-teste" />);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        await act(async () => {
            fireEvent.press(screen.getByLabelText(/mensagens não lidas|Notificações/));
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('Localização não permitida')).toBeTruthy();
            expect(screen.getByText('Maria')).toBeTruthy();
            expect(screen.getByText('Encontramos seu pet')).toBeTruthy();
        });
    });

    it('abre configurações ao tocar em uma permissão recusada', async () => {
        listarPermissoesNegadas.mockResolvedValue([{
            id: 'permission-location',
            tipo: 'permission',
            permission: 'location',
            remetente_nome: 'Permissão necessária',
            conteudo: 'Ative a localização nas configurações.',
            titulo: 'Localização não permitida',
            criado_em: '2026-11-03T15:00:00.000Z',
            lida_em: null,
        }]);
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ naoLidas: 0 }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });

        await render(<NotificationBell token="token-teste" />);
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await act(async () => {
            fireEvent.press(screen.getByLabelText(/mensagens não lidas|Notificações/));
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('Localização não permitida')).toBeTruthy();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('Localização não permitida'));
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(marcarPermissaoComoLida).toHaveBeenCalledWith('location');
            expect(abrirConfiguracoesPermissao).toHaveBeenCalled();
        });
    });

    it('abre o chat ao tocar em uma notificação normal', async () => {
        listarPermissoesNegadas.mockResolvedValue([]);
        global.fetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ naoLidas: 1 }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [{
                    id: 15,
                    conversa_id: 12,
                    remetente_id: 5,
                    remetente_nome: 'Maria',
                    remetente_foto: null,
                    conteudo: 'Encontramos seu pet',
                    criado_em: '2026-11-03T16:00:00.000Z',
                    lida_em: null,
                }],
            });
        const onOpenNotification = jest.fn();
        await render(
            <NotificationBell token="token-teste" onOpenNotification={onOpenNotification} />
        );
        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        await act(async () => {
            fireEvent.press(screen.getByLabelText(/mensagens não lidas|Notificações/));
            await Promise.resolve();
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('Maria')).toBeTruthy();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('Maria'));
            await Promise.resolve();
        });

        expect(onOpenNotification).toHaveBeenCalledWith(expect.objectContaining({
            conversa_id: 12,
            remetente_nome: 'Maria',
        }));
    });
});
