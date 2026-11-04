import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import Pressable from './ButtonPressable';
import { API_BASE_URL } from './config/api';
import {
  abrirConfiguracoesPermissao,
  listarPermissoesNegadas,
  marcarPermissaoComoLida,
  observarPermissoesNegadas,
} from './services/permissionNotifications';
import { decidirMatch, listarMatches } from './services/iaMatches';

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
  const [matches, setMatches] = useState([]);
  const [matchesNaoLidas, setMatchesNaoLidas] = useState(0);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);
  const [permissoesNaoLidas, setPermissoesNaoLidas] = useState(0);

  useEffect(() => {
    setNaoLidas(mensagensNaoLidas + permissoesNaoLidas + matchesNaoLidas);
  }, [mensagensNaoLidas, permissoesNaoLidas, matchesNaoLidas]);

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
        const permissoes = await listarPermissoesNegadas();
        const matchesDaIa = await listarMatches(token).catch(() => []);
        const naoLidasPermissao = permissoes.filter((item) => !item.lida_em).length;
        if (ativo) {
          const quantidadeMensagens = Number(dados.naoLidas) || 0;
          setMatchesNaoLidas(matchesDaIa.length);
          setMensagensNaoLidas(quantidadeMensagens);
          setPermissoesNaoLidas(naoLidasPermissao);
        }
      } catch (erro) {
        if (ativo) console.warn('Não foi possível atualizar as notificações:', erro.message);
      }
    };

    atualizar();
    const intervalo = setInterval(atualizar, 10000);
    const assinatura = observarPermissoesNegadas(atualizar);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      assinatura.remove();
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
      ?.then(async (resposta) => {
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível carregar as notificações.');
        const permissoes = await listarPermissoesNegadas();
        const matchesDaIa = await listarMatches(token).catch(() => []);
        if (ativo) {
          setMatches(matchesDaIa);
          setNotificacoes([...permissoes, ...(Array.isArray(dados) ? dados : [])]);
        }
      })
      ?.catch((falha) => {
        if (ativo) setErro(falha.message || 'Não foi possível carregar as notificações.');
      })
      ?.finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [centralVisivel, token]);

  const abrirNotificacao = (notificacao) => {
    setCentralVisivel(false);
    if (notificacao.tipo === 'permission') {
      marcarPermissaoComoLida(notificacao.permission);
      setPermissoesNaoLidas((quantidade) => Math.max(0, quantidade - 1));
      abrirConfiguracoesPermissao().catch((erro) => {
        console.warn('Não foi possível abrir as configurações:', erro.message);
      });
      return;
    }
    onOpenNotification?.(notificacao);
  };

  const decidir = async (match, decisao) => {
    try {
      const resultado = await decidirMatch(match.id, decisao, token);
      const atualizarDepoisDaDecisao = async () => {
        const matchesAtualizados = await listarMatches(token).catch(() => []);
        setMatches(matchesAtualizados);
        setMatchesNaoLidas(matchesAtualizados.length);
      };
      await atualizarDepoisDaDecisao();
      if (decisao === 'aceitar' && resultado.conversaId) {
        setCentralVisivel(false);
        onOpenNotification?.({
          conversa_id: resultado.conversaId,
          remetente_nome: 'Correspondência encontrada',
          animal_nome: match.perdido_nome || match.encontrado_nome,
        });
      }
    } catch (erro) {
      setErro(erro.message || 'Não foi possível registrar sua decisão.');
    }
  };

  const fotoMatch = (match, tipo) => {
    const fotos = tipo === 'perdido' ? match.perdido_fotos : match.encontrado_fotos;
    if (Array.isArray(fotos) && fotos[0]) return fotos[0];
    return tipo === 'perdido' ? match.perdido_foto : match.encontrado_foto;
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
                <Text style={styles.subtitle}>Mensagens, matches e permissões</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setCentralVisivel(false)} accessibilityLabel="Fechar">
                <MaterialCommunityIcons name="close" size={21} color="#557b9b" />
              </Pressable>
            </View>

            {carregando ? <ActivityIndicator style={styles.loading} color="#5791ca" /> : null}
            {erro ? <Text style={styles.error}>{erro}</Text> : null}
            {!carregando && !erro && notificacoes.length === 0 && matches.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="bell-outline" size={34} color="#8caac5" />
                <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                <Text style={styles.emptyText}>Mensagens novas aparecerão aqui.</Text>
              </View>
            ) : null}

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {matches.map((match) => {
                const fotoPerdido = fotoMatch(match, 'perdido');
                const fotoEncontrado = fotoMatch(match, 'encontrado');
                return (
                  <View key={`match-${match.id}`} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.matchTitle}>Potencial correspondência</Text>
                      <Text style={styles.matchScore}>{match.score_total}%</Text>
                    </View>
                    <View style={styles.matchAnimals}>
                      {[{ nome: match.perdido_nome, foto: fotoPerdido, tipo: 'Perdido' }, { nome: match.encontrado_nome, foto: fotoEncontrado, tipo: 'Encontrado' }].map((animal) => (
                        <View key={animal.tipo} style={styles.matchAnimal}>
                          <View style={styles.matchPhoto}>
                            {animal.foto ? <Image source={{ uri: animal.foto }} style={styles.matchPhotoImage} /> : <FontAwesome name="paw" size={18} color="#ffffff" />}
                          </View>
                          <Text style={styles.matchAnimalType}>{animal.tipo}</Text>
                          <Text style={styles.matchAnimalName} numberOfLines={1}>{animal.nome || 'Sem nome'}</Text>
                        </View>
                      ))}
                    </View>
                    <View style={styles.matchActions}>
                      <Pressable style={styles.matchDiscard} onPress={() => decidir(match, 'descartar')}>
                        <Text style={styles.matchDiscardText}>Não é ele</Text>
                      </Pressable>
                      <Pressable style={styles.matchAccept} onPress={() => decidir(match, 'aceitar')}>
                        <Text style={styles.matchAcceptText}>Parece ser ele</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
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
                      <Text style={styles.sender} numberOfLines={1}>
                        {notificacao.titulo || notificacao.remetente_nome || 'Usuário'}
                      </Text>
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
  matchCard: { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#dbe9f4', backgroundColor: '#f8fbfe' },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  matchTitle: { color: '#315f8b', fontSize: 13, fontWeight: '700' },
  matchScore: { color: '#ffffff', fontSize: 12, fontWeight: '700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden', backgroundColor: '#5791ca' },
  matchAnimals: { flexDirection: 'row', gap: 10, marginTop: 10 },
  matchAnimal: { flex: 1, alignItems: 'center' },
  matchPhoto: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#80add7' },
  matchPhotoImage: { width: '100%', height: '100%' },
  matchAnimalType: { marginTop: 5, color: '#8097aa', fontSize: 10 },
  matchAnimalName: { maxWidth: '100%', marginTop: 1, color: '#456985', fontSize: 12, fontWeight: '600' },
  matchActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  matchDiscard: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#b9cdda', backgroundColor: '#ffffff' },
  matchDiscardText: { color: '#6f8799', fontSize: 12, fontWeight: '700' },
  matchAccept: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#5791ca' },
  matchAcceptText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
});