import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import Pressable from './ButtonPressable';
import { API_BASE_URL } from './config/api';

function iniciais(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || '?';
}

function horario(data) {
  if (!data) return '';
  return new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationBell({ token, onOpenNotification, containerStyle }) {
  const [naoLidas, setNaoLidas] = useState(0);
  const [centralVisivel, setCentralVisivel] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

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

  useEffect(() => {
    if (!centralVisivel || !token) return undefined;

    let ativo = true;
    setCarregando(true);
    setErro('');
    fetch(`${API_BASE_URL}/chat/notificacoes/lista`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (resposta) => {
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível carregar as notificações.');
        if (ativo) setNotificacoes(dados);
      })
      .catch((falha) => {
        if (ativo) setErro(falha.message || 'Não foi possível carregar as notificações.');
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [centralVisivel, token]);

  const abrirNotificacao = (notificacao) => {
    setCentralVisivel(false);
    onOpenNotification?.(notificacao);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable
        style={styles.button}
        onPress={() => setCentralVisivel(true)}
        accessibilityLabel={naoLidas > 0 ? `${naoLidas} mensagens não lidas` : 'Notificações'}
      >
        <FontAwesome name="bell-o" size={16} color="#6887a4" />
        {naoLidas > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
          </View>
        ) : null}
      </Pressable>
      <Modal
        visible={centralVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => setCentralVisivel(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setCentralVisivel(false)} accessibilityLabel="Fechar notificações" />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.title}>Notificações</Text>
                <Text style={styles.subtitle}>Mensagens recentes</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setCentralVisivel(false)} accessibilityLabel="Fechar">
                <MaterialCommunityIcons name="close" size={21} color="#557b9b" />
              </Pressable>
            </View>

            {carregando ? <ActivityIndicator style={styles.loading} color="#5791ca" /> : null}
            {erro ? <Text style={styles.error}>{erro}</Text> : null}
            {!carregando && !erro && notificacoes.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="bell-outline" size={34} color="#8caac5" />
                <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                <Text style={styles.emptyText}>Mensagens novas aparecerão aqui.</Text>
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {notificacoes.map((notificacao) => (
                <Pressable
                  key={notificacao.id}
                  style={styles.row}
                  onPress={() => abrirNotificacao(notificacao)}
                >
                  <View style={styles.avatar}>
                    {notificacao.remetente_foto ? (
                      <Image source={{ uri: notificacao.remetente_foto }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.avatarText}>{iniciais(notificacao.remetente_nome)}</Text>
                    )}
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.nameLine}>
                      <Text style={styles.sender} numberOfLines={1}>{notificacao.remetente_nome || 'Usuário'}</Text>
                      {!notificacao.lida_em ? <View style={styles.unreadDot} /> : null}
                    </View>
                    {notificacao.animal_nome ? (
                      <Text style={styles.context} numberOfLines={1}>
                        {notificacao.tipo_registro === 'Adocao' ? 'Adoção' : notificacao.tipo_registro} · {notificacao.animal_nome}
                      </Text>
                    ) : null}
                    <Text style={styles.message} numberOfLines={2}>{notificacao.conteudo}</Text>
                  </View>
                  <Text style={styles.time}>{horario(notificacao.criado_em)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 44, height: 44 },
  button: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#ffffff' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 17, height: 17, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#df655c', borderWidth: 1, borderColor: '#ffffff' },
  badgeText: { color: '#ffffff', fontSize: 9, fontWeight: '700' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(25, 45, 62, 0.3)' },
  sheet: { height: '78%', paddingTop: 10, paddingHorizontal: 18, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handle: { width: 34, height: 4, alignSelf: 'center', marginBottom: 15, borderRadius: 2, backgroundColor: '#d5e3ef' },
  sheetHeader: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5edf4' },
  title: { color: '#315f8b', fontSize: 19, fontWeight: '700' },
  subtitle: { marginTop: 3, color: '#8097aa', fontSize: 12 },
  closeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#eff6fc' },
  loading: { marginTop: 20 },
  error: { padding: 14, color: '#a94f4a', fontSize: 13 },
  list: { flex: 1 },
  listContent: { paddingBottom: 20 },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#edf2f6' },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 22, backgroundColor: '#80add7' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  copy: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sender: { flexShrink: 1, color: '#294c6b', fontSize: 13, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#df524f' },
  context: { marginTop: 2, color: '#6f8ca7', fontSize: 11 },
  message: { marginTop: 3, color: '#72889b', fontSize: 12, lineHeight: 17 },
  time: { alignSelf: 'flex-start', marginTop: 4, color: '#8a9cac', fontSize: 10 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyTitle: { color: '#456985', fontSize: 15, fontWeight: '600' },
  emptyText: { color: '#8198aa', fontSize: 12 },
});