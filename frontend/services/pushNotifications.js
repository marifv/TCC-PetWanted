import { PermissionsAndroid, Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';

const Notifications = require('expo-notifications');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registrarPushNotifications(token) {
  if (!token || Platform.OS === 'web') return () => {};

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Mensagens',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const resultadoPermissao = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      if (resultadoPermissao !== PermissionsAndroid.RESULTS.GRANTED) return () => {};
    }

    const { getApp } = require('@react-native-firebase/app');
    const {
      AuthorizationStatus,
      getMessaging,
      getToken,
      onMessage,
      requestPermission,
    } = require('@react-native-firebase/messaging');
    const messaging = getMessaging(getApp());
    const permissao = await requestPermission(messaging);
    if (![AuthorizationStatus.AUTHORIZED, AuthorizationStatus.PROVISIONAL].includes(permissao)) {
      return () => {};
    }

    const tokenDispositivo = await getToken(messaging);
    const resposta = await fetch(`${API_BASE_URL}/chat/dispositivos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token: tokenDispositivo }),
    });
    if (!resposta.ok) throw new Error('O servidor não registrou o dispositivo.');

    return onMessage(messaging, (mensagem) => {
      const titulo = mensagem.notification?.title || 'PetWanted';
      const corpo = mensagem.notification?.body || 'Você recebeu uma nova mensagem.';
      return Notifications.scheduleNotificationAsync({
        content: {
          title: titulo,
          body: corpo,
          data: mensagem.data || {},
          channelId: 'chat-messages',
          sound: 'default',
        },
        trigger: null,
      });
    });
  } catch (erro) {
    console.warn('Notificações push não configuradas neste dispositivo:', erro.message);
    return () => {};
  }
}