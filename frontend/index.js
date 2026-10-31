import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import App from './App';

try {
  const { getApp } = require('@react-native-firebase/app');
  const { getMessaging, setBackgroundMessageHandler } = require('@react-native-firebase/messaging');

  setBackgroundMessageHandler(getMessaging(getApp()), async (mensagem) => {
    const titulo = mensagem.data?.title || 'PetWanted';
    const corpo = mensagem.data?.body || 'Você recebeu uma nova mensagem.';
    await Notifications.scheduleNotificationAsync({
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
  console.warn('Handler de push em segundo plano indisponível:', erro.message);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
