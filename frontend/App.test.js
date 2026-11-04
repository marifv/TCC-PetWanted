jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-status-bar', () => {
    const React = require('react');
    const { View } = require('react-native');
    return { StatusBar: (props) => React.createElement(View, props) };
});

jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return {
        FontAwesome: ({ name }) => React.createElement(Text, null, name),
    };
});

jest.mock('./utils/googleSignIn', () => ({
    GoogleSignin: {
        hasPlayServices: jest.fn(async () => true),
        signIn: jest.fn(async () => ({ type: 'cancelled' })),
    },
    isCancelledResponse: jest.fn((response) => response?.type === 'cancelled'),
}));

jest.mock('./services/pushNotifications', () => ({
    registrarPushNotifications: jest.fn(async () => jest.fn()),
}));

jest.mock('./Homepage', () => {
    const React = require('react');
    const { Text } = require('react-native');
    return () => React.createElement(Text, null, 'Homepage teste');
});

jest.mock('./Perfil', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});
jest.mock('./EdicaoPerfil', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});
jest.mock('./AnimalPerdido', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});
jest.mock('./AnimalEncontrado', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});
jest.mock('./AnimalAdocao', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});
jest.mock('./EdicaoAnimal', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});
jest.mock('./Chat', () => {
    const React = require('react');
    const { View } = require('react-native');
    return () => React.createElement(View);
});

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Animated } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import App from './App';

describe('Autenticação no App', () => {
    beforeAll(() => {
        jest.spyOn(Animated, 'timing').mockImplementation(() => ({
            start: (callback) => callback?.({ finished: true }),
        }));
    });

    beforeEach(() => {
        global.IS_REACT_ACT_ENVIRONMENT = true;
        SecureStore.getItemAsync.mockReset();
        SecureStore.getItemAsync.mockResolvedValue(null);
        SecureStore.setItemAsync.mockClear();
        SecureStore.deleteItemAsync.mockClear();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        global.fetch = jest.fn();
    });

    afterEach(() => {
        cleanup();
        jest.clearAllMocks();
        delete global.fetch;
    });

    const abrirLogin = async () => {
        await act(async () => {
            render(<App />);
            await Promise.resolve();
        });
        await waitFor(() => {
            expect(screen.getByPlaceholderText('exemplo@gmail.com')).toBeTruthy();
        });
    };

    it('exige e-mail e senha antes de enviar o login', async () => {
        await abrirLogin();
        fireEvent.press(screen.getByText('ENTRAR'));

        expect(Alert.alert).toHaveBeenCalledWith(
            'Atenção',
            'Informe seu e-mail e sua senha.',
            [{ text: 'OK' }]
        );
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('rejeita um endereço de e-mail inválido', async () => {
        await abrirLogin();
        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('exemplo@gmail.com'), 'email-invalido');
            fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha123');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('ENTRAR'));
            await Promise.resolve();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'E-mail inválido',
            'Informe um endereço de e-mail válido.',
            [{ text: 'OK' }]
        );
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('mostra a mensagem retornada pelo servidor para credenciais inválidas', async () => {
        global.fetch.mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ mensagem: 'E-mail ou senha incorretos.' }),
        });
        await abrirLogin();
        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('exemplo@gmail.com'), '  TESTE@EMAIL.COM  ');
            fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha123');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('ENTRAR'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/usuarios/login'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        email: 'teste@email.com',
                        senha: 'senha123',
                    }),
                })
            );
            expect(Alert.alert).toHaveBeenCalledWith(
                'Não foi possível entrar',
                'E-mail ou senha incorretos.',
                [{ text: 'OK' }]
            );
        });
    });

    it('entra na homepage e persiste uma sessão válida', async () => {
        global.fetch.mockImplementation(async (url) => {
            if (String(url).endsWith('/usuarios/login')) {
                return {
                    ok: true,
                    json: async () => ({
                        id: 7,
                        nome: 'Usuário Teste',
                        email: 'teste@email.com',
                        documento: '12345678900',
                        tipo_perfil: 'Tutor',
                        localizacao: 'São Paulo',
                        foto: null,
                        token: 'jwt-token-teste',
                    }),
                };
            }
            return {
                ok: true,
                json: async () => ({ naoLidas: 0 }),
            };
        });
        await abrirLogin();
        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('exemplo@gmail.com'), 'Teste@Email.com');
            fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha123');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('ENTRAR'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('Homepage teste')).toBeTruthy();
        });
        expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
            'petwanted.session',
            expect.stringContaining('jwt-token-teste')
        );
    });

    it('valida que as senhas informadas no cadastro são iguais', async () => {
        await abrirLogin();
        await act(async () => {
            fireEvent.press(screen.getByText('Criar conta'));
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('Nome completo'), 'Maria Silva');
            fireEvent.changeText(screen.getByPlaceholderText('CPF'), '12345678901');
            fireEvent.changeText(screen.getByPlaceholderText('exemplo@gmail.com'), 'maria@email.com');
            fireEvent.changeText(screen.getAllByPlaceholderText('Senha')[0], 'Senha1!');
            fireEvent.changeText(screen.getByPlaceholderText('Confirmar senha'), 'Senha2!');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('CRIAR CONTA'));
            await Promise.resolve();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Atenção',
            'As senhas não são iguais.',
            [{ text: 'OK' }]
        );
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('cria uma conta válida pelo cadastro local', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ id: 8, nome: 'Maria Silva' }),
        });
        await abrirLogin();
        await act(async () => {
            fireEvent.press(screen.getByText('Criar conta'));
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('Nome completo'), 'Maria Silva');
            fireEvent.changeText(screen.getByPlaceholderText('CPF'), '123.456.789-01');
            fireEvent.changeText(screen.getByPlaceholderText('exemplo@gmail.com'), 'Maria@Email.com');
            fireEvent.changeText(screen.getAllByPlaceholderText('Senha')[0], 'Senha1!');
            fireEvent.changeText(screen.getByPlaceholderText('Confirmar senha'), 'Senha1!');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('CRIAR CONTA'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/usuarios'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        nome: 'Maria Silva',
                        email: 'maria@email.com',
                        documento: '12345678901',
                        senha: 'Senha1!',
                        tipo_perfil: 'Tutor',
                    }),
                })
            );
            expect(Alert.alert).toHaveBeenCalledWith(
                'Sucesso',
                'Conta criada com sucesso!',
                [{ text: 'OK' }]
            );
        });
    });

    it('envia o código de recuperação para o e-mail informado', async () => {
        global.fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ mensagem: 'Código enviado.' }),
        });
        await abrirLogin();
        await act(async () => {
            fireEvent.press(screen.getByText('Esqueceu a senha?'));
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.changeText(screen.getByPlaceholderText('E-mail cadastrado'), 'Maria@Email.com');
            await Promise.resolve();
        });
        await act(async () => {
            fireEvent.press(screen.getByText('ENVIAR CÓDIGO'));
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/usuarios/recuperar-senha/enviar-codigo'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ email: 'maria@email.com' }),
                })
            );
        });
        expect(screen.getByText('Código')).toBeTruthy();
    });

    it('restaura uma sessão persistida sem pedir login novamente', async () => {
        SecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
            id: 7,
            token: 'sessao-salva',
            nome: 'Usuário Salvo',
            email: 'salvo@email.com',
            tipo_perfil: 'Tutor',
        }));
        global.fetch.mockImplementation(async () => ({
            ok: true,
            json: async () => ({ naoLidas: 0 }),
        }));

        await act(async () => {
            render(<App />);
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByText('Homepage teste')).toBeTruthy();
        });
        expect(SecureStore.getItemAsync).toHaveBeenCalledWith('petwanted.session');
    });
});
