import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { io } from 'socket.io-client';
import BottomNavigation from './BottomNavigation';
import Pressable from './ButtonPressable';
import FotoAmpliavel from './FotoAmpliavel';
import { API_BASE_URL } from './config/api';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

function urlAnexo(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) return url;
  return `${SOCKET_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function horario(data) {
  if (!data) return '';
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function iniciais(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || '?';
}

export default function Chat({ usuarioId, nomeUsuario, token, onLost, onFound, onAdoption, onVoltar, anuncioParaChat, notificacaoParaChat, mensagensNaoLidas, onMensagensLidas }) {
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [busca, setBusca] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [modalNovaConversa, setModalNovaConversa] = useState(false);
  const [filtro, setFiltro] = useState('Todas');
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [menuConversaVisivel, setMenuConversaVisivel] = useState(false);
  const [denunciaVisivel, setDenunciaVisivel] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState('');
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [anexo, setAnexo] = useState(null);
  const [mostrarDescer, setMostrarDescer] = useState(false);
  const socketRef = useRef(null);
  const scrollRef = useRef(null);
  const enviosPendentesRef = useRef(0);

  const requisicao = async (caminho, opcoes = {}) => fetch(`${API_BASE_URL}/chat${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opcoes.headers,
    },
  });

  const carregarConversas = async () => {
    try {
      const resposta = await requisicao('/conversas');
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível carregar as conversas.');
      setConversas(dados);
      setErro('');
    } catch (falha) {
      setErro(falha.message || 'Falha ao conectar com o servidor.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarConversas();
  }, [token]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('mensagem:nova', (mensagem) => {
      if (Number(mensagem.conversa_id) === Number(conversaAtiva?.id)) {
        requisicao(`/conversas/${conversaAtiva.id}/mensagens`)
          .then((resposta) => resposta.json().then((dados) => ({ resposta, dados })))
          .then(({ resposta, dados }) => {
            if (resposta.ok) {
              setMensagens(dados);
              socket.emit('conversa:ler', { conversaId: conversaAtiva.id });
            }
            onMensagensLidas?.();
          })
          .catch((falha) => setErro(falha.message));
      } else {
        onMensagensLidas?.();
      }
      carregarConversas();
    });
    socket.on('mensagens:lidas', ({ conversaId, mensagens: recibos = [] }) => {
      if (Number(conversaId) !== Number(conversaAtiva?.id)) return;
      const recibosPorId = new Map(recibos.map((recibo) => [String(recibo.id), recibo.lida_em]));
      setMensagens((atuais) => atuais.map((mensagem) => (
        recibosPorId.has(String(mensagem.id))
          ? { ...mensagem, lida_em: recibosPorId.get(String(mensagem.id)) }
          : mensagem
      )));
    });
    socket.on('connect_error', () => setErro('Conexão em tempo real indisponível. Tentando novamente...'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, conversaAtiva?.id]);

  useEffect(() => {
    if (!busca.trim() || !modalNovaConversa) {
      setUsuarios([]);
      return;
    }

    const atraso = setTimeout(async () => {
      try {
        const resposta = await requisicao(`/usuarios?q=${encodeURIComponent(busca.trim())}`);
        const dados = await resposta.json();
        if (resposta.ok) setUsuarios(dados);
      } catch (falha) {
        setErro(falha.message || 'Não foi possível buscar usuários.');
      }
    }, 250);

    return () => clearTimeout(atraso);
  }, [busca, modalNovaConversa]);

  useEffect(() => {
    if (!conversaAtiva) return;
    const socket = socketRef.current;
    socket?.emit('conversa:entrar', { conversaId: conversaAtiva.id });
    requisicao(`/conversas/${conversaAtiva.id}/mensagens`)
      .then((resposta) => resposta.json().then((dados) => ({ resposta, dados })))
      .then(({ resposta, dados }) => {
        if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível carregar as mensagens.');
        setMensagens(dados);
        socket?.emit('conversa:ler', { conversaId: conversaAtiva.id });
        onMensagensLidas?.();
      })
      .catch((falha) => setErro(falha.message));
  }, [conversaAtiva?.id]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd?.({ animated: false });
  }, [mensagens.length]);

  const abrirConversa = async (conversa) => {
    setConversaAtiva(conversa);
    setMensagens([]);
    setTexto('');
    setAnexo(null);
    setMostrarDescer(false);
    setConversas((atuais) => atuais.map((item) => (
      Number(item.id) === Number(conversa.id)
        ? { ...item, mensagens_nao_lidas: 0 }
        : item
    )));
    setModalNovaConversa(false);
    setBusca('');
  };

  useEffect(() => {
    if (!anuncioParaChat?.id || !anuncioParaChat?.id_usuario) return;

    let ativo = true;
    requisicao('/conversas', {
      method: 'POST',
      body: JSON.stringify({
        destinatarioId: anuncioParaChat.id_usuario,
        animalId: anuncioParaChat.id,
      }),
    })
      .then(async (resposta) => {
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível iniciar a conversa.');
        if (ativo) {
          setConversas((atuais) => [dados, ...atuais.filter((item) => item.id !== dados.id)]);
          abrirConversa(dados);
        }
      })
      .catch((falha) => {
        if (ativo) setErro(falha.message);
      });

    return () => {
      ativo = false;
    };
  }, [anuncioParaChat?.id, anuncioParaChat?.id_usuario]);

  useEffect(() => {
    if (!notificacaoParaChat?.id) return;

    let ativo = true;
    requisicao('/conversas')
      .then(async (resposta) => {
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível carregar a conversa.');
        const conversa = dados.find((item) => Number(item.id) === Number(notificacaoParaChat.id));
        if (!conversa) throw new Error('A conversa não foi encontrada.');
        if (ativo) {
          setConversas((atuais) => [conversa, ...atuais.filter((item) => Number(item.id) !== Number(conversa.id))]);
          abrirConversa(conversa);
        }
      })
      .catch((falha) => {
        if (ativo) setErro(falha.message || 'Não foi possível carregar a conversa.');
      });

    return () => {
      ativo = false;
    };
  }, [notificacaoParaChat]);

  const selecionarAnexo = async () => {
    if (enviando) return;
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setErro('Ative o acesso às fotos para anexar arquivos.');
      return;
    }
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: false,
        quality: 0.65,
        base64: true,
        videoMaxDuration: 60,
      });
      if (resultado.canceled || !resultado.assets?.length) return;
      const arquivo = resultado.assets[0];
      const tipo = arquivo.type === 'video' ? 'video' : 'image';
      if (!arquivo.base64 || !arquivo.mimeType) {
        setErro('Não foi possível preparar o anexo.');
        return;
      }
      if ((arquivo.fileSize || 0) > 15 * 1024 * 1024) {
        setErro('O anexo deve ter no máximo 15 MB.');
        return;
      }
      setAnexo({
        tipo,
        nome: arquivo.fileName || (tipo === 'video' ? 'Vídeo' : 'Foto'),
        dataUri: `data:${arquivo.mimeType};base64,${arquivo.base64}`,
      });
      setErro('');
    } catch (falha) {
      setErro(falha.message || 'Não foi possível selecionar o anexo.');
    }
  };

  const iniciarConversa = async (usuario) => {
    try {
      const resposta = await requisicao('/conversas', {
        method: 'POST',
        body: JSON.stringify({ destinatarioId: usuario.id }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível iniciar a conversa.');
      const conversa = {
        ...dados,
        id: dados.id,
        outro_usuario_id: usuario.id,
        nome: usuario.nome,
        foto: usuario.foto,
      };
      setConversas((atuais) => [conversa, ...atuais.filter((item) => item.id !== conversa.id)]);
      abrirConversa(conversa);
    } catch (falha) {
      setErro(falha.message);
    }
  };

  const enviarMensagem = () => {
    const conteudo = texto.trim();
    if ((!conteudo && !anexo) || !conversaAtiva) return;

    const anexoAtual = anexo;
    setEnviando(true);
    enviosPendentesRef.current += 1;
    setTexto('');
    setAnexo(null);
    setErro('');

    socketRef.current?.timeout(10000).emit(
      'mensagem:enviar',
      {
        conversaId: conversaAtiva.id,
        conteudo,
        animalId: conversaAtiva.animal_id || null,
        anexoData: anexoAtual?.dataUri || null,
        anexoTipo: anexoAtual?.tipo || null,
      },
      (falha, resposta) => {
        enviosPendentesRef.current = Math.max(0, enviosPendentesRef.current - 1);
        setEnviando(enviosPendentesRef.current > 0);
        if (falha || !resposta?.ok) {
          setErro(resposta?.mensagem || 'A mensagem não foi enviada. Tente novamente.');
          if (conteudo) {
            setTexto((textoAtual) => textoAtual ? `${textoAtual}\n${conteudo}` : conteudo);
          }
          if (anexoAtual) {
            setAnexo((anexoAtualNoEstado) => anexoAtualNoEstado || anexoAtual);
          }
          return;
        }
        setErro('');
      }
    );
  };

  const alternarSilenciamento = async () => {
    if (!conversaAtiva || processandoAcao) return;
    setProcessandoAcao(true);
    try {
      const resposta = await requisicao(`/conversas/${conversaAtiva.id}/silenciamento`, {
        method: 'PATCH',
        body: JSON.stringify({ silenciada: !conversaAtiva.silenciada }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível alterar o silenciamento.');

      setConversaAtiva((atual) => ({ ...atual, silenciada: dados.silenciada }));
      setConversas((atuais) => atuais.map((item) => (
        Number(item.id) === Number(conversaAtiva.id) ? { ...item, silenciada: dados.silenciada } : item
      )));
      setMenuConversaVisivel(false);
    } catch (falha) {
      Alert.alert('Não foi possível atualizar', falha.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const confirmarExclusaoConversa = () => {
    setMenuConversaVisivel(false);
    Alert.alert(
      'Excluir conversa',
      'Ela será removida somente da sua lista. O outro participante continuará vendo a conversa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const resposta = await requisicao(`/conversas/${conversaAtiva.id}`, { method: 'DELETE' });
              if (!resposta.ok) {
                const dados = await resposta.json();
                throw new Error(dados.mensagem || 'Não foi possível excluir a conversa.');
              }
              setConversas((atuais) => atuais.filter((item) => Number(item.id) !== Number(conversaAtiva.id)));
              setConversaAtiva(null);
            } catch (falha) {
              Alert.alert('Não foi possível excluir', falha.message);
            }
          },
        },
      ]
    );
  };

  const abrirFormularioDenuncia = () => {
    setMenuConversaVisivel(false);
    setMotivoDenuncia('');
    setDenunciaVisivel(true);
  };

  const enviarDenuncia = async () => {
    if (!conversaAtiva || motivoDenuncia.trim().length < 5 || processandoAcao) return;
    setProcessandoAcao(true);
    try {
      const resposta = await requisicao(`/conversas/${conversaAtiva.id}/denuncias`, {
        method: 'POST',
        body: JSON.stringify({ motivo: motivoDenuncia.trim() }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível enviar a denúncia.');
      setDenunciaVisivel(false);
      Alert.alert('Denúncia enviada', dados.mensagem || 'A equipe analisará esta conversa.');
    } catch (falha) {
      Alert.alert('Não foi possível denunciar', falha.message);
    } finally {
      setProcessandoAcao(false);
    }
  };

  const conversasFiltradas = conversas.filter((conversa) => {
    if (filtro === 'Perdidos') return conversa.tipo_registro === 'Perdido';
    if (filtro === 'Encontrados') return conversa.tipo_registro === 'Encontrado';
    if (filtro === 'Adoção') return conversa.tipo_registro === 'Adocao';
    return true;
  });

  if (conversaAtiva) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.chatHeader}>
            <Pressable style={styles.backButton} onPress={() => setConversaAtiva(null)} accessibilityLabel="Voltar para conversas">
              <MaterialCommunityIcons name="arrow-left" size={23} color="#4f83b7" />
            </Pressable>
            <View style={styles.avatarLarge}>
              {conversaAtiva.foto ? <Image source={{ uri: conversaAtiva.foto }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{iniciais(conversaAtiva.nome)}</Text>}
            </View>
            <View style={styles.chatHeaderInfo}>
              <Text style={styles.chatName} numberOfLines={1}>{conversaAtiva.nome || 'Usuário'}</Text>
              <Text style={styles.onlineLabel}>PetWanted</Text>
            </View>
            <Pressable
              style={styles.moreButton}
              onPress={() => setMenuConversaVisivel(true)}
              accessibilityLabel="Opções da conversa"
            >
              <MaterialCommunityIcons name="dots-horizontal" size={23} color="#4f83b7" />
            </Pressable>
          </View>

          {conversaAtiva.animal_nome ? (
            <View style={styles.animalContext}>
              {conversaAtiva.animal_foto ? (
                <Image
                  testID="animal-context-photo"
                  source={{ uri: urlAnexo(conversaAtiva.animal_foto) }}
                  style={styles.animalContextPhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.animalContextPhotoPlaceholder}>
                  <MaterialCommunityIcons name="paw" size={20} color="#ffffff" />
                </View>
              )}
              <View style={styles.animalContextInfo}>
                <Text style={styles.animalName}>{conversaAtiva.animal_nome}</Text>
                <Text style={styles.animalType}>{conversaAtiva.tipo_registro || 'Anúncio'}</Text>
              </View>
            </View>
          ) : null}

          <ScrollView
            ref={scrollRef}
            testID="lista-mensagens-chat"
            style={styles.messages}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            onScroll={(evento) => {
              const { layoutMeasurement, contentOffset, contentSize } = evento.nativeEvent;
              const distanciaFinal = contentSize.height - (layoutMeasurement.height + contentOffset.y);
              setMostrarDescer(distanciaFinal > 160);
            }}
            scrollEventThrottle={16}
          >
            {mensagens.map((mensagem) => {
              const propria = Number(mensagem.remetente_id) === Number(usuarioId);
              const anexourl = urlAnexo(mensagem.anexo_url);
              return (
                <View key={mensagem.id} style={[styles.messageGroup, propria && styles.messageGroupOwn]}>
                  <View style={[styles.bubble, propria ? styles.bubbleOwn : styles.bubbleOther]}>
                    {mensagem.animal_nome ? (
                      <Text style={[styles.messageAnimalContext, propria && styles.messageAnimalContextOwn]}>
                        {mensagem.tipo_registro || 'Anúncio'} · {mensagem.animal_nome}
                      </Text>
                    ) : null}
                    {anexourl && mensagem.anexo_tipo === 'image' ? (
                      <FotoAmpliavel
                        uri={anexourl}
                        style={styles.messageImage}
                        resizeMode="cover"
                        accessibilityLabel="Ampliar foto do chat"
                      />
                    ) : null}
                    {anexourl && mensagem.anexo_tipo === 'video' ? (
                      <Pressable
                        style={styles.videoAttachment}
                        onPress={() => Linking.openURL(anexourl)}
                        accessibilityLabel="Abrir vídeo"
                      >
                        <MaterialCommunityIcons name="play-circle-outline" size={34} color={propria ? '#ffffff' : '#5791ca'} />
                        <Text style={[styles.videoAttachmentText, propria && styles.messageTextOwn]}>Vídeo</Text>
                      </Pressable>
                    ) : null}
                    {!mensagem.anexo_url || !['Foto enviada', 'Vídeo enviado'].includes(mensagem.conteudo) ? (
                      <Text style={[styles.messageText, propria && styles.messageTextOwn]}>{mensagem.conteudo}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.messageMeta, propria && styles.messageTimeOwn]}>
                    <Text style={styles.messageTime}>{horario(mensagem.criado_em)}</Text>
                    {propria ? (
                      <>
                        <MaterialCommunityIcons
                          name={mensagem.lida_em ? 'check-all' : 'check'}
                          size={14}
                          color={mensagem.lida_em ? '#397fc0' : '#8298aa'}
                        />
                        {mensagem.lida_em ? <Text style={styles.readTime}>Lida às {horario(mensagem.lida_em)}</Text> : null}
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {mostrarDescer ? (
            <Pressable
              style={styles.scrollToBottomButton}
              onPress={() => scrollRef.current?.scrollToEnd?.({ animated: true })}
              accessibilityLabel="Descer para a mensagem mais recente"
            >
              <MaterialCommunityIcons name="chevron-down" size={24} color="#ffffff" />
            </Pressable>
          ) : null}

          {erro ? <Text style={styles.inlineError}>{erro}</Text> : null}
          <View style={styles.composer}>
            <Pressable
              style={styles.attachButton}
              onPress={selecionarAnexo}
              disabled={enviando}
              accessibilityLabel="Anexar foto ou vídeo"
            >
              <MaterialCommunityIcons name="paperclip" size={21} color="#5791ca" />
            </Pressable>
            {anexo ? (
              <View style={styles.attachmentPreview}>
                <MaterialCommunityIcons name={anexo.tipo === 'video' ? 'video-outline' : 'image-outline'} size={18} color="#5791ca" />
                <Text style={styles.attachmentPreviewText} numberOfLines={1}>{anexo.nome}</Text>
                <Pressable onPress={() => setAnexo(null)} accessibilityLabel="Remover anexo">
                  <MaterialCommunityIcons name="close-circle" size={18} color="#8ba0b2" />
                </Pressable>
              </View>
            ) : null}
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Digite uma mensagem"
              placeholderTextColor="#91a9bd"
              style={styles.messageInput}
              multiline
              maxLength={2000}
              onSubmitEditing={enviarMensagem}
            />
            <Pressable style={styles.sendButton} onPress={enviarMensagem} disabled={(!texto.trim() && !anexo)} accessibilityLabel="Enviar mensagem">
              {enviando ? <ActivityIndicator color="#ffffff" size="small" /> : <MaterialCommunityIcons name="send" size={20} color="#ffffff" />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
        <Modal
          visible={menuConversaVisivel}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuConversaVisivel(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setMenuConversaVisivel(false)}>
            <View style={styles.actionMenu}>
              <Pressable style={styles.actionItem} onPress={alternarSilenciamento} disabled={processandoAcao}>
                <MaterialCommunityIcons name={conversaAtiva.silenciada ? 'bell-outline' : 'bell-off-outline'} size={21} color="#557b9b" />
                <Text style={styles.actionText}>{conversaAtiva.silenciada ? 'Ativar notificações' : 'Silenciar conversa'}</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={confirmarExclusaoConversa}>
                <MaterialCommunityIcons name="delete-outline" size={21} color="#bf5c57" />
                <Text style={[styles.actionText, styles.destructiveText]}>Excluir conversa</Text>
              </Pressable>
              <Pressable style={styles.actionItem} onPress={abrirFormularioDenuncia}>
                <MaterialCommunityIcons name="flag-outline" size={21} color="#bf5c57" />
                <Text style={[styles.actionText, styles.destructiveText]}>Denunciar conversa</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
        <Modal
          visible={denunciaVisivel}
          transparent
          animationType="fade"
          onRequestClose={() => setDenunciaVisivel(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reportDialog}>
              <Text style={styles.reportTitle}>Denunciar conversa</Text>
              <Text style={styles.reportDescription}>Explique brevemente o motivo. A denúncia será enviada para análise.</Text>
              <TextInput
                style={styles.reportInput}
                value={motivoDenuncia}
                onChangeText={setMotivoDenuncia}
                placeholder="Descreva o motivo"
                placeholderTextColor="#91a9bd"
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.reportCount}>{motivoDenuncia.length}/500</Text>
              <View style={styles.reportActions}>
                <Pressable style={styles.reportCancel} onPress={() => setDenunciaVisivel(false)}>
                  <Text style={styles.reportCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[styles.reportSend, (motivoDenuncia.trim().length < 5 || processandoAcao) && styles.reportSendDisabled]}
                  onPress={enviarDenuncia}
                  disabled={motivoDenuncia.trim().length < 5 || processandoAcao}
                >
                  {processandoAcao ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.reportSendText}>Enviar</Text>}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.listHeader}>
        <Pressable style={styles.backButton} onPress={onVoltar} accessibilityLabel="Voltar para o mapa">
          <MaterialCommunityIcons name="arrow-left" size={23} color="#4f83b7" />
        </Pressable>
        <View>
          <Text style={styles.brand}>PetWanted</Text>
          <Text style={styles.subtitle}>Mensagens da comunidade</Text>
        </View>
        <Pressable style={styles.newButton} onPress={() => setModalNovaConversa(true)} accessibilityLabel="Nova conversa">
          <MaterialCommunityIcons name="plus" size={24} color="#ffffff" />
        </Pressable>
      </View>

      <View style={styles.listSheet}>
        <View style={styles.sheetHandle} />
        <View style={styles.sectionTitleRow}>
          <View>
            <Text style={styles.title}>Conversas</Text>
            <Text style={styles.description}>Fale sobre um pet</Text>
          </View>
          <Text style={styles.loggedUser} numberOfLines={1}>{nomeUsuario}</Text>
        </View>

        {modalNovaConversa ? (
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={21} color="#86a5c1" />
            <TextInput
              autoFocus
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar pessoas"
              placeholderTextColor="#91a9bd"
              style={styles.searchInput}
            />
            <Pressable onPress={() => { setModalNovaConversa(false); setBusca(''); }} accessibilityLabel="Fechar busca">
              <MaterialCommunityIcons name="close" size={20} color="#7391ab" />
            </Pressable>
          </View>
        ) : null}

        {!modalNovaConversa ? (
          <View style={styles.filters}>
            {['Todas', 'Perdidos', 'Encontrados', 'Adoção'].map((item) => (
              <Pressable key={item} onPress={() => setFiltro(item)} style={[styles.filter, filtro === item && styles.filterSelected]}>
                <Text style={[styles.filterText, filtro === item && styles.filterTextSelected]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ScrollView style={styles.conversationList} keyboardShouldPersistTaps="handled">
          {modalNovaConversa ? usuarios.map((usuario) => (
            <Pressable key={usuario.id} style={styles.conversationRow} onPress={() => iniciarConversa(usuario)}>
              <View style={styles.avatar}>
                {usuario.foto ? <Image source={{ uri: usuario.foto }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{iniciais(usuario.nome)}</Text>}
              </View>
              <View style={styles.conversationCopy}>
                <Text style={styles.personName}>{usuario.nome}</Text>
                <Text style={styles.preview}>Toque para iniciar uma conversa</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#8ca6bd" />
            </Pressable>
          )) : conversasFiltradas.map((conversa) => (
            <Pressable key={conversa.id} style={styles.conversationRow} onPress={() => abrirConversa(conversa)}>
              <View style={styles.avatar}>
                {conversa.foto ? <Image source={{ uri: conversa.foto }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{iniciais(conversa.nome)}</Text>}
              </View>
              <View style={styles.conversationCopy}>
                <View style={styles.personLine}>
                  <Text style={styles.personName} numberOfLines={1}>{conversa.nome || 'Usuário'}</Text>
                  {conversa.tipo_registro ? <Text style={styles.petTag}>{conversa.tipo_registro}</Text> : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>{conversa.ultima_mensagem || 'Conversa iniciada'}</Text>
              </View>
              <View style={styles.conversationMeta}>
                <Text style={styles.conversationTime}>{horario(conversa.ultima_mensagem_em)}</Text>
                {Number(conversa.mensagens_nao_lidas) > 0 ? (
                  <View style={styles.conversationUnreadBadge}>
                    <Text style={styles.conversationUnreadText}>
                      {conversa.mensagens_nao_lidas > 99 ? '99+' : conversa.mensagens_nao_lidas}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}

          {carregando ? <ActivityIndicator color="#5791ca" style={styles.loading} /> : null}
          {!carregando && !modalNovaConversa && conversasFiltradas.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-text-outline" size={34} color="#8caac5" />
              <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
              <Text style={styles.emptyCopy}>Toque em + para procurar uma pessoa.</Text>
            </View>
          ) : null}
          {modalNovaConversa && busca.trim().length >= 2 && usuarios.length === 0 ? (
            <Text style={styles.emptyCopy}>Nenhuma pessoa encontrada.</Text>
          ) : null}
          {erro ? <Text style={styles.inlineError}>{erro}</Text> : null}
        </ScrollView>
      </View>

      <BottomNavigation active="chat" onLost={onLost} onFound={onFound} onChat={() => {}} onAdoption={onAdoption} mensagensNaoLidas={mensagensNaoLidas} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf3fb' },
  listHeader: {
    minHeight: 116,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#d8eafa',
  },
  brand: { color: '#315f8b', fontSize: 20, fontWeight: '700' },
  subtitle: { marginTop: 4, color: '#6f8ca7', fontSize: 13 },
  newButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5791ca' },
  listSheet: {
    flex: 1,
    marginTop: -12,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  sheetHandle: { width: 34, height: 4, alignSelf: 'center', marginBottom: 16, borderRadius: 2, backgroundColor: '#d5e3ef' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  title: { color: '#315f8b', fontSize: 23, fontWeight: '700' },
  description: { marginTop: 2, color: '#8097aa', fontSize: 12 },
  loggedUser: { maxWidth: '42%', color: '#7b91a6', fontSize: 12 },
  searchBox: { minHeight: 46, marginBottom: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 15, backgroundColor: '#eff6fc' },
  searchInput: { flex: 1, minHeight: 44, color: '#365a78', fontSize: 14 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f0f6fb' },
  filterSelected: { backgroundColor: '#5791ca' },
  filterText: { color: '#718ba3', fontSize: 12 },
  filterTextSelected: { color: '#ffffff', fontWeight: '600' },
  conversationList: { flex: 1 },
  conversationRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#edf2f6' },
  avatar: { width: 46, height: 46, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: '#80add7', overflow: 'hidden' },
  avatarLarge: { width: 42, height: 42, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#80add7', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  conversationCopy: { flex: 1, minWidth: 0 },
  personLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  personName: { flexShrink: 1, color: '#294c6b', fontSize: 14, fontWeight: '600' },
  preview: { marginTop: 3, color: '#72889b', fontSize: 12 },
  petTag: { overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, color: '#b86451', backgroundColor: '#fce8e2', fontSize: 10, fontWeight: '600' },
  conversationMeta: { alignItems: 'flex-end', justifyContent: 'center', gap: 5 },
  conversationTime: { color: '#7792aa', fontSize: 10 },
  conversationUnreadBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#df524f' },
  conversationUnreadText: { color: '#ffffff', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  loading: { marginTop: 20 },
  emptyState: { flex: 1, minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { color: '#456985', fontSize: 15, fontWeight: '600' },
  emptyCopy: { paddingVertical: 12, color: '#8198aa', fontSize: 13, textAlign: 'center' },
  inlineError: { paddingHorizontal: 8, paddingVertical: 7, color: '#a44d43', fontSize: 12 },
  chatHeader: { minHeight: 74, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#d8eafa' },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#ffffff' },
  chatHeaderInfo: { flex: 1, minWidth: 0 },
  chatName: { color: '#315f8b', fontSize: 15, fontWeight: '700' },
  onlineLabel: { marginTop: 2, color: '#6488a8', fontSize: 11 },
  moreButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#ffffff' },
  modalOverlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(25, 45, 62, 0.35)' },
  actionMenu: { paddingVertical: 6, borderRadius: 14, backgroundColor: '#ffffff', elevation: 8, shadowColor: '#20384d', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12 },
  actionItem: { minHeight: 52, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 13 },
  actionText: { color: '#365a78', fontSize: 14, fontWeight: '500' },
  destructiveText: { color: '#a94f4a' },
  reportDialog: { padding: 20, borderRadius: 14, backgroundColor: '#ffffff' },
  reportTitle: { color: '#315f8b', fontSize: 18, fontWeight: '700' },
  reportDescription: { marginTop: 7, color: '#71889c', fontSize: 13, lineHeight: 18 },
  reportInput: { minHeight: 116, maxHeight: 180, marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: '#eff6fc', color: '#365a78', fontSize: 14 },
  reportCount: { marginTop: 5, color: '#8a9cac', fontSize: 11, textAlign: 'right' },
  reportActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 15 },
  reportCancel: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center' },
  reportCancelText: { color: '#668098', fontSize: 13, fontWeight: '600' },
  reportSend: { minWidth: 80, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#5791ca' },
  reportSendDisabled: { opacity: 0.5 },
  reportSendText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  animalContext: { minHeight: 56, marginHorizontal: 12, marginTop: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, backgroundColor: '#eff6fc' },
  animalContextPhoto: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#80add7' },
  animalContextPhotoPlaceholder: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#80add7' },
  animalContextInfo: { flex: 1 },
  animalName: { color: '#365a78', fontSize: 13, fontWeight: '700' },
  animalType: { marginTop: 2, color: '#7d91a4', fontSize: 11 },
  messages: { flex: 1, marginTop: 8, backgroundColor: '#ffffff' },
  messageList: { flexGrow: 1, paddingHorizontal: 14, paddingVertical: 16, gap: 11 },
  messageGroup: { maxWidth: '82%', alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageGroupOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 17 },
  bubbleOther: { borderBottomLeftRadius: 5, backgroundColor: '#edf4fa' },
  bubbleOwn: { borderBottomRightRadius: 5, backgroundColor: '#6fa6d8' },
  messageText: { color: '#38566f', fontSize: 14, lineHeight: 20 },
  messageTextOwn: { color: '#ffffff' },
  messageAnimalContext: { marginBottom: 6, color: '#6488a8', fontSize: 10, fontWeight: '700' },
  messageAnimalContextOwn: { color: '#dfeeff' },
  messageImage: { width: 220, height: 220, marginBottom: 4, borderRadius: 12, backgroundColor: '#d9e6f2' },
  videoAttachment: { minWidth: 150, minHeight: 70, marginBottom: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, backgroundColor: '#dcecf9' },
  videoAttachmentText: { color: '#5791ca', fontSize: 13, fontWeight: '700' },
  scrollToBottomButton: { position: 'absolute', right: 16, bottom: 78, width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#5791ca', elevation: 5, shadowColor: '#20384d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  messageMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  messageTime: { paddingHorizontal: 3, color: '#8ba0b2', fontSize: 10 },
  messageTimeOwn: { alignSelf: 'flex-end' },
  readTime: { color: '#6f8da7', fontSize: 9 },
  composer: { minHeight: 66, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5edf4' },
  attachButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#eff6fc' },
  attachmentPreview: { maxWidth: 125, height: 38, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 19, backgroundColor: '#eff6fc' },
  attachmentPreviewText: { flex: 1, color: '#668098', fontSize: 11 },
  messageInput: { flex: 1, maxHeight: 100, minHeight: 44, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 24, backgroundColor: '#eff6fc', color: '#365a78', fontSize: 14 },
  sendButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#5791ca' },
});