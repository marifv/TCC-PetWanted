import { DeviceEventEmitter, Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'petwanted.permission-notifications';
const EVENT_NAME = 'petwanted:permission-notification';

const mensagens = {
  location: {
    title: 'Localização não permitida',
    content: 'Ative a localização nas configurações para usar sua posição no mapa.',
  },
  photos: {
    title: 'Acesso às fotos não permitido',
    content: 'Permita o acesso às fotos nas configurações para anexar imagens.',
  },
  notifications: {
    title: 'Notificações não permitidas',
    content: 'Ative as notificações nas configurações para receber mensagens.',
  },
};

export async function listarPermissoesNegadas() {
  if (Platform.OS === 'web') return [];
  try {
    const dados = await SecureStore.getItemAsync(STORAGE_KEY);
    return dados ? JSON.parse(dados) : [];
  } catch (erro) {
    console.warn('Não foi possível carregar notificações de permissão:', erro.message);
    return [];
  }
}

export async function registrarPermissaoNegada(tipo) {
  if (Platform.OS === 'web') return;
  const mensagem = mensagens[tipo];
  if (!mensagem) return;

  try {
    const atuais = await listarPermissoesNegadas();
    const semTipo = atuais.filter((item) => item.permission !== tipo);
    const notificacao = {
      id: `permission-${tipo}`,
      tipo: 'permission',
      permission: tipo,
      remetente_nome: 'Permissão necessária',
      remetente_foto: null,
      conteudo: mensagem.content,
      titulo: mensagem.title,
      criado_em: new Date().toISOString(),
      lida_em: null,
    };
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify([notificacao, ...semTipo]));
    DeviceEventEmitter.emit(EVENT_NAME);
  } catch (erro) {
    console.warn('Não foi possível salvar a notificação de permissão:', erro.message);
  }
}

export async function marcarPermissaoComoLida(tipo) {
  if (Platform.OS === 'web') return;
  try {
    const atuais = await listarPermissoesNegadas();
    const atualizadas = atuais.map((item) =>
      item.permission === tipo ? { ...item, lida_em: new Date().toISOString() } : item
    );
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(atualizadas));
    DeviceEventEmitter.emit(EVENT_NAME);
  } catch (erro) {
    console.warn('Não foi possível marcar a permissão como lida:', erro.message);
  }
}

export function observarPermissoesNegadas(callback) {
  return DeviceEventEmitter.addListener(EVENT_NAME, callback);
}

export async function abrirConfiguracoesPermissao() {
  await Linking.openSettings();
}
