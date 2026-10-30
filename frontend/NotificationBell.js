import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Pressable from './ButtonPressable';
import { API_BASE_URL } from './config/api';

export default function NotificationBell({ token, onPress, containerStyle }) {
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    if (!token) {
      setNaoLidas(0);
      return undefined;
    }

    let ativo = true;
    const atualizar = async () => {
      try {
        const resposta = await fetch(`${API_BASE_URL}/chat/notificacoes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (ativo) setNaoLidas(Number(dados.naoLidas) || 0);
      } catch (erro) {
        if (ativo) console.warn('Não foi possível atualizar as notificações:', erro.message);
      }
    };

    atualizar();
    const intervalo = setInterval(atualizar, 10000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [token]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable
        style={styles.button}
        onPress={onPress}
        accessibilityLabel={naoLidas > 0 ? `${naoLidas} mensagens não lidas` : 'Notificações'}
      >
        <FontAwesome name="bell-o" size={16} color="#6887a4" />
        {naoLidas > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 44, height: 44 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#ffffff' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 17, height: 17, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#df655c', borderWidth: 1, borderColor: '#ffffff' },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
});