const mockSocketEmit = jest.fn();
const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    timeout: jest.fn(() => ({ emit: mockSocketEmit })),
};

jest.mock('socket.io-client', () => ({
    io: jest.fn(() => mockSocket),
}));

jest.mock('expo-image-picker', () => ({
    requestMediaLibraryPermissionsAsync: jest.fn(),
    launchImageLibraryAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
    };
});

jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    const Icone = ({ name }) => React.createElement(Text, null, name);
    return { MaterialCommunityIcons: Icone };
});

jest.mock('./BottomNavigation', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});

jest.mock('./FotoAmpliavel', () => {
    const React = require('react');
    const { Pressable } = require('react-native');
    return ({ accessibilityLabel, ...props }) => React.createElement(
        Pressable,
        { ...props, accessibilityLabel: accessibilityLabel || 'Foto ampliada' }
    );
});

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Chat from './Chat';

describe('Chat', () => {
    beforeEach(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
        mockSocket.on.mockClear();
        mockSocket.emit.mockClear();
        mockSocket.disconnect.mockClear();
        mockSocket.timeout.mockClear();
        mockSocketEmit.mockReset();
        ImagePicker.requestMediaLibraryPermissionsAsync.mockReset();
        ImagePicker.launchImageLibraryAsync.mockReset();
        ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
        ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
        jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        global.fetch = jest.fn(async (url) => ({
            ok: true,
            json: async () => {
                if (String(url).includes('/conversas/12/mensagens')) {
                    return [{
                        id: 100,
                        conversa_id: 12,
                        remetente_id: 5,
                        conteudo: 'Última mensagem carregada',
                        criado_em: '2026-11-03T16:00:00.000Z',
                        lida_em: null,
                    }];
                }
                if (String(url).includes('/conversas')) return [];
                return {};
            },
        }));
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete global.fetch;
    });

    const abrirChat = async () => {
        const resultado = await render(
            <Chat
                usuarioId={7}
                nomeUsuario="Usuário Teste"
                token="token-teste"
                notificacaoParaChat={{
                    id: 12,
                    nome: 'Maria',
                    foto: null,
                    animal_id: null,
                }}
            />
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Digite uma mensagem')).toBeTruthy();
            expect(screen.getByText('Maria')).toBeTruthy();
        });
        return resultado;
    };

    it('não apaga uma segunda mensagem digitada enquanto a primeira é enviada', async () => {
        mockSocketEmit.mockImplementation((_evento, _dados, callback) => {
            callback(null, { ok: true });
        });

        await render(
            <Chat
                usuarioId={7}
                nomeUsuario="Usuário Teste"
                token="token-teste"
                notificacaoParaChat={{
                    id: 12,
                    nome: 'Maria',
                    foto: null,
                    animal_id: null,
                }}
            />
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Digite uma mensagem')).toBeTruthy();
            expect(screen.getByText('Maria')).toBeTruthy();
        });

        const caixa = screen.getByPlaceholderText('Digite uma mensagem');

        await act(async () => {
            fireEvent.changeText(caixa, 'Primeira mensagem');
            await Promise.resolve();
        });

        await act(async () => {
            fireEvent.press(screen.getByLabelText('Enviar mensagem'));
            await Promise.resolve();
        });

        await act(async () => {
            fireEvent.changeText(caixa, 'Segunda mensagem');
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByPlaceholderText('Digite uma mensagem').props.value).toBe('Segunda mensagem');
        });
        expect(mockSocketEmit).toHaveBeenCalledWith(
            'mensagem:enviar',
            expect.objectContaining({ conteudo: 'Primeira mensagem' }),
            expect.any(Function)
        );
    });

    it('abre uma conversa com o histórico e mostra a última mensagem', async () => {
        await render(
            <Chat
                usuarioId={7}
                nomeUsuario="Usuário Teste"
                token="token-teste"
                notificacaoParaChat={{
                    id: 12,
                    nome: 'Maria',
                    foto: null,
                    animal_id: null,
                }}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Última mensagem carregada')).toBeTruthy();
        });
        expect(screen.getByText('Maria')).toBeTruthy();
    });

    it('anexa uma foto e envia os dados do anexo pelo Socket.IO', async () => {
        ImagePicker.launchImageLibraryAsync.mockResolvedValue({
            canceled: false,
            assets: [{
                type: 'image',
                fileName: 'gato-encontrado.jpg',
                mimeType: 'image/jpeg',
                fileSize: 1024,
                base64: 'Zm90by10ZXN0ZQ==',
            }],
        });
        mockSocketEmit.mockImplementation((_evento, _dados, callback) => {
            callback(null, { ok: true });
        });

        await abrirChat();
        await act(async () => {
            fireEvent.press(screen.getByLabelText('Anexar foto ou vídeo'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('gato-encontrado.jpg')).toBeTruthy();
        });
        expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(expect.objectContaining({
            mediaTypes: ['images', 'videos'],
            base64: true,
        }));

        await act(async () => {
            fireEvent.press(screen.getByLabelText('Enviar mensagem'));
            await Promise.resolve();
        });

        expect(mockSocketEmit).toHaveBeenCalledWith(
            'mensagem:enviar',
            expect.objectContaining({
                anexoData: 'data:image/jpeg;base64,Zm90by10ZXN0ZQ==',
                anexoTipo: 'image',
            }),
            expect.any(Function)
        );
    });

    it('anexa um vídeo e permite remover o preview', async () => {
        ImagePicker.launchImageLibraryAsync.mockResolvedValue({
            canceled: false,
            assets: [{
                type: 'video',
                fileName: 'cachorro.mp4',
                mimeType: 'video/mp4',
                fileSize: 2048,
                base64: 'dmlkZW8tdGVzdGU=',
            }],
        });

        await abrirChat();
        await act(async () => {
            fireEvent.press(screen.getByLabelText('Anexar foto ou vídeo'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('cachorro.mp4')).toBeTruthy();
        });

        await act(async () => {
            fireEvent.press(screen.getByLabelText('Remover anexo'));
            await Promise.resolve();
        });
        expect(screen.queryByText('cachorro.mp4')).toBeNull();
    });

    it('mostra foto e vídeo no histórico e permite abrir o vídeo', async () => {
        global.fetch = jest.fn(async (url) => ({
            ok: true,
            json: async () => String(url).includes('/conversas/12/mensagens') ? [
                {
                    id: 101,
                    conversa_id: 12,
                    remetente_id: 5,
                    conteudo: 'Foto enviada',
                    anexo_url: 'https://exemplo.com/gato.jpg',
                    anexo_tipo: 'image',
                    criado_em: '2026-11-03T16:00:00.000Z',
                },
                {
                    id: 102,
                    conversa_id: 12,
                    remetente_id: 5,
                    conteudo: 'Vídeo enviado',
                    anexo_url: 'https://exemplo.com/cachorro.mp4',
                    anexo_tipo: 'video',
                    criado_em: '2026-11-03T16:01:00.000Z',
                },
            ] : [],
        }));

        await abrirChat();
        await waitFor(() => {
            expect(screen.getByLabelText('Ampliar foto do chat')).toBeTruthy();
            expect(screen.getByLabelText('Abrir vídeo')).toBeTruthy();
        });

        await act(async () => {
            fireEvent.press(screen.getByLabelText('Abrir vídeo'));
            await Promise.resolve();
        });
        expect(Linking.openURL).toHaveBeenCalledWith('https://exemplo.com/cachorro.mp4');
    });

    it('mostra o botão para descer até a mensagem mais recente ao rolar para cima', async () => {
        await abrirChat();
        const listaMensagens = screen.getByTestId('lista-mensagens-chat');

        await act(async () => {
            fireEvent.scroll(listaMensagens, {
                nativeEvent: {
                    layoutMeasurement: { height: 200 },
                    contentOffset: { y: 0 },
                    contentSize: { height: 500 },
                },
            });
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Descer para a mensagem mais recente')).toBeTruthy();
        });
        fireEvent.press(screen.getByLabelText('Descer para a mensagem mais recente'));
    });

    it('lista conversas enviando o token de autenticação', async () => {
        global.fetch = jest.fn(async (url, opcoes = {}) => ({
            ok: true,
            json: async () => String(url).includes('/conversas') ? [{
                id: 12,
                nome: 'Pessoa Teste',
                mensagens_nao_lidas: 2,
                ultima_mensagem: 'Olá',
            }] : [],
        }));

        await render(
            <Chat usuarioId={7} nomeUsuario="Usuário Teste" token="token-teste" />
        );

        await waitFor(() => {
            expect(screen.getByText('Pessoa Teste')).toBeTruthy();
        });

        const chamadaListagem = global.fetch.mock.calls.find(([url]) =>
            String(url).includes('/chat/conversas') &&
            !global.fetch.mock.calls.some(([_url, opcoes]) => opcoes?.method === 'POST')
        );
        expect(chamadaListagem).toBeTruthy();
        expect(chamadaListagem[1].headers.Authorization).toContain('token-teste');
    });

    it('cria uma conversa via anúncio com destinatário e animal enviados', async () => {
        global.fetch = jest.fn(async (url, opcoes = {}) => ({
            ok: true,
            json: async () => {
                if (String(url).endsWith('/conversas') && opcoes?.method === 'POST') {
                    return {
                        id: 12,
                        nome: 'Maria',
                        outro_usuario_id: 5,
                        animal_id: 31,
                    };
                }
                if (String(url).includes('/conversas/12/mensagens')) return [];
                return [];
            },
        }));

        await render(
            <Chat
                usuarioId={7}
                nomeUsuario="Usuário Teste"
                token="token-teste"
                anuncioParaChat={{ id: 31, id_usuario: 5 }}
            />
        );

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/chat/conversas'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: expect.stringContaining('token-teste'),
                    }),
                    body: JSON.stringify({
                        destinatarioId: 5,
                        animalId: 31,
                    }),
                })
            );
        });
    });

    it('silencia uma conversa pela API com o estado invertido', async () => {
        global.fetch = jest.fn(async (url, opcoes = {}) => ({
            ok: true,
            json: async () => {
                if (String(url).endsWith('/silenciamento')) return { silenciada: true };
                if (String(url).includes('/conversas/12/mensagens')) return [];
                if (String(url).endsWith('/conversas')) return [];
                return {};
            },
        }));

        await abrirChat();
        await act(async () => {
            fireEvent.press(screen.getByLabelText('Opções da conversa'));
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('Silenciar conversa'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/chat/conversas/12/silenciamento'),
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        Authorization: expect.stringContaining('token-teste'),
                    }),
                    body: JSON.stringify({ silenciada: true }),
                })
            );
        });
    });

    it('denuncia uma conversa com um motivo válido', async () => {
        global.fetch = jest.fn(async (url, opcoes = {}) => ({
            ok: true,
            json: async () => String(url).endsWith('/denuncias') ? {
                mensagem: 'A equipe analisará esta conversa.',
            } : [],
        }));

        await abrirChat();
        await act(async () => {
            fireEvent.press(screen.getByLabelText('Opções da conversa'));
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('Denunciar conversa'));
            await Promise.resolve();
        });

        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('Descreva o motivo'), 'Conteúdo abusivo e inadequado');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('Enviar'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/chat/conversas/12/denuncias'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ motivo: 'Conteúdo abusivo e inadequado' }),
                })
            );
        });
    });

    it('exclui uma conversa somente após a confirmação do alerta', async () => {
        global.fetch = jest.fn(async (url, opcoes = {}) => ({
            ok: true,
            json: async () => {
                if (String(url).includes('/conversas/12/mensagens')) return [];
                return [];
            },
        }));

        await abrirChat();
        await act(async () => {
            fireEvent.press(screen.getByLabelText('Opções da conversa'));
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('Excluir conversa'));
            await Promise.resolve();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Excluir conversa',
            expect.any(String),
            expect.arrayContaining([
                expect.objectContaining({ text: 'Cancelar' }),
                expect.objectContaining({ text: 'Excluir' }),
            ])
        );

        const botoes = Alert.alert.mock.calls.at(-1)[2];
        await act(async () => {
            await botoes[1].onPress();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/chat/conversas/12'),
                expect.objectContaining({ method: 'DELETE' })
            );
        });
    });

    it('rejeita anexos maiores que 15 MB', async () => {
        ImagePicker.launchImageLibraryAsync.mockResolvedValue({
            canceled: false,
            assets: [{
                type: 'video',
                fileName: 'video-grande.mp4',
                mimeType: 'video/mp4',
                fileSize: 16 * 1024 * 1024,
                base64: 'dmlkZW8=',
            }],
        });

        await abrirChat();
        await act(async () => {
            fireEvent.press(screen.getByLabelText('Anexar foto ou vídeo'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('O anexo deve ter no máximo 15 MB.')).toBeTruthy();
        });
        expect(screen.queryByText('video-grande.mp4')).toBeNull();
    });
});
