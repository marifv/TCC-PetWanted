import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Pressable from './ButtonPressable';
import { GoogleSignin, isCancelledResponse } from './utils/googleSignIn';
import Homepage from './Homepage';
import Perfil from './Perfil';
import EdicaoPerfil from './EdicaoPerfil';
import AnimalPerdido from './AnimalPerdido';
import AnimalEncontrado from './AnimalEncontrado';
import AnimalAdocao from './AnimalAdocao';
import EdicaoAnimal from './EdicaoAnimal';
import { API_ANIMAIS, API_USUARIOS } from './config/api';

const API_URL = API_USUARIOS;

export default function App() {
  const [telaSelecionada, setTelaSelecionada] = useState('entrar');
  const [telaAtual, setTelaAtual] = useState('login');
  const [telaAnterior, setTelaAnterior] = useState('homepage');
  const [usuarioId, setUsuarioId] = useState(null);
  const [token, setToken] = useState(null);
  const [perfilAtivo, setPerfilAtivo] = useState(false);
  const [animalPerdidoAtivo, setAnimalPerdidoAtivo] = useState(false);
  const [animalEncontradoAtivo, setAnimalEncontradoAtivo] = useState(false);
  const [animalAdocaoAtivo, setAnimalAdocaoAtivo] = useState(false);
  const [animalEditando, setAnimalEditando] = useState(null);
  const [origemEdicaoAnimal, setOrigemEdicaoAnimal] = useState(null);
  const [larguraContainer, setLarguraContainer] = useState(0);
  const [tipoPerfil, setTipoPerfil] = useState('Tutor');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState('');
  const [googleLinkSenha, setGoogleLinkSenha] = useState('');
  const [googleCadastroToken, setGoogleCadastroToken] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [senha, setSenha] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [telaRecuperacao, setTelaRecuperacao] = useState(null);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [codigoRecuperacao, setCodigoRecuperacao] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha] = useState(false);
  const [tokenRedefinicao, setTokenRedefinicao] = useState('');
  const [recuperacaoLoading, setRecuperacaoLoading] = useState(false);
  const [alertaVisivel, setAlertaVisivel] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState('');
  const [alertaMensagem, setAlertaMensagem] = useState('');
  const [alertaTipo, setAlertaTipo] = useState('info');
  const [coordenadasUsuario, setCoordenadasUsuario] = useState(null);

  const deslocamentoBotao = useRef(new Animated.Value(0)).current;
  const perfilOffset = useRef(new Animated.Value(400)).current;

  const mostrarAlerta = (titulo, mensagem, tipo = 'info') => {
    Alert.alert(titulo, mensagem, [{ text: 'OK' }]);
  };

  const handleLayoutAcoes = (event) => {
    const { width } = event.nativeEvent.layout;
    setLarguraContainer(width);
  };

  const abrirRecuperacaoSenha = () => {
    setEmailRecuperacao(loginEmail.trim());
    setCodigoRecuperacao('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setTokenRedefinicao('');
    setTelaRecuperacao('email');
  };

  const voltarEtapaRecuperacao = () => {
    if (telaRecuperacao === 'email') {
      setTelaRecuperacao(null);
    } else if (telaRecuperacao === 'codigo') {
      setTelaRecuperacao('email');
    } else if (telaRecuperacao === 'senha') {
      setTelaRecuperacao('codigo');
    }
  };

  const avancarParaCodigo = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecuperacao.trim())) {
      mostrarAlerta('E-mail inválido', 'Informe um endereço de e-mail válido.');
      return;
    }
    setRecuperacaoLoading(true);
    try {
      const resposta = await fetch(`${API_URL}/recuperar-senha/enviar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecuperacao.trim().toLowerCase() }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        mostrarAlerta('Não foi possível enviar o código', dados.mensagem || 'Tente novamente mais tarde.');
        return;
      }
      setCodigoRecuperacao('');
      setTokenRedefinicao('');
      setTelaRecuperacao('codigo');
    } catch (erro) {
      console.error('Erro ao solicitar código de recuperação:', erro);
      mostrarAlerta('Erro de conexão', 'Não foi possível conectar ao servidor para enviar o código.');
    } finally {
      setRecuperacaoLoading(false);
    }
  };

  const mascararEmail = (valor) => {
    const [usuario, dominio] = valor.split('@');
    const usuarioVisivel = usuario.length > 2 ? usuario.slice(0, 2) : usuario.slice(0, 1);
    return `${usuarioVisivel}***@${dominio}`;
  };

  const avancarParaNovaSenha = async () => {
    if (!/^\d{6}$/.test(codigoRecuperacao)) {
      mostrarAlerta('Código incompleto', 'Informe os 6 dígitos do código.');
      return;
    }
    setRecuperacaoLoading(true);
    try {
      const resposta = await fetch(`${API_URL}/recuperar-senha/verificar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperacao.trim().toLowerCase(),
          codigo: codigoRecuperacao,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        mostrarAlerta('Código não confirmado', dados.mensagem || 'Confira o código ou solicite outro.');
        return;
      }
      setTokenRedefinicao(dados.tokenRedefinicao);
      setTelaRecuperacao('senha');
    } catch (erro) {
      console.error('Erro ao verificar código de recuperação:', erro);
      mostrarAlerta('Erro de conexão', 'Não foi possível verificar o código agora.');
    } finally {
      setRecuperacaoLoading(false);
    }
  };

  const salvarNovaSenha = async () => {
    const criteriosSenha = [
      novaSenha.length >= 8,
      /[A-Z]/.test(novaSenha),
      /[a-z]/.test(novaSenha),
      /\d/.test(novaSenha),
      /[^A-Za-z0-9]/.test(novaSenha),
    ];

    if (!criteriosSenha.every(Boolean)) {
      mostrarAlerta('Senha fraca', 'A nova senha precisa atender a todos os critérios exibidos.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      mostrarAlerta('Senhas diferentes', 'A confirmação precisa ser igual à nova senha.');
      return;
    }

    setRecuperacaoLoading(true);
    try {
      const resposta = await fetch(`${API_URL}/recuperar-senha/redefinir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRecuperacao.trim().toLowerCase(),
          tokenRedefinicao,
          novaSenha,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        mostrarAlerta('Não foi possível alterar a senha', dados.mensagem || 'Solicite um novo código e tente outra vez.');
        return;
      }

      setLoginEmail(emailRecuperacao.trim());
      setLoginSenha('');
      setCodigoRecuperacao('');
      setTokenRedefinicao('');
      setNovaSenha('');
      setConfirmarNovaSenha('');
      setTelaRecuperacao(null);
      mostrarAlerta('Senha alterada', dados.mensagem || 'Agora você já pode entrar com a nova senha.', 'success');
    } catch (erro) {
      console.error('Erro ao redefinir senha:', erro);
      mostrarAlerta('Erro de conexão', 'Não foi possível alterar a senha agora.');
    } finally {
      setRecuperacaoLoading(false);
    }
  };

  const abrirPerfil = () => {
    const telaOrigem = animalPerdidoAtivo
      ? 'animalPerdido'
      : animalEncontradoAtivo
        ? 'animalEncontrado'
        : animalAdocaoAtivo
          ? 'animalAdocao'
        : 'homepage';

    setTelaAnterior(telaOrigem);
    setTelaAtual('perfil');
    setPerfilAtivo(true);
    setAnimalPerdidoAtivo(false);
    setAnimalEncontradoAtivo(false);
    setAnimalAdocaoAtivo(false);
    perfilOffset.setValue(400);

    Animated.timing(perfilOffset, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const abrirAnimalPerdido = () => {
    setAnimalPerdidoAtivo(true);
    setAnimalEncontradoAtivo(false);
    setAnimalAdocaoAtivo(false);
  };

  const voltarParaHomeAnimalPerdido = () => {
    setAnimalPerdidoAtivo(false);
  };

  const abrirAnimalEncontrado = () => {
    setAnimalEncontradoAtivo(true);
    setAnimalPerdidoAtivo(false);
    setAnimalAdocaoAtivo(false);
  };

  const voltarParaHomeAnimalEncontrado = () => {
    setAnimalEncontradoAtivo(false);
  };

  const abrirAnimalAdocao = () => {
    setAnimalAdocaoAtivo(true);
    setAnimalPerdidoAtivo(false);
    setAnimalEncontradoAtivo(false);
  };

  const voltarParaHomeAnimalAdocao = () => {
    setAnimalAdocaoAtivo(false);
  };

  const deslogar = () => {
    setUsuarioId(null);
    setToken(null);
    setNome('');
    setDocumento('');
    setEmail('');
    setTelefone('');
    setLocalizacao('');
    setTipoPerfil('');
    setFotoPerfil(null);
    setLoginEmail('');
    setLoginSenha('');
    setTelaSelecionada(null);
    setPerfilAtivo(false);
    setAnimalPerdidoAtivo(false);
    setAnimalEncontradoAtivo(false);
    setAnimalAdocaoAtivo(false);
    setTelaAtual('login');
  };

  const abrirEdicaoPerfil = () => {
    setTelaAtual('edicaoPerfil');
  };

  const voltarParaPerfil = () => {
    setTelaAtual('perfil');
  };

  const abrirEdicaoAnimal = (animal, origem, atualizarLista) => {
    setAnimalEditando({ animal, atualizarLista });
    setOrigemEdicaoAnimal(origem);
  };

  const fecharEdicaoAnimal = () => {
    setAnimalEditando(null);
    setOrigemEdicaoAnimal(null);
  };

  const salvarAnimal = async (dados) => {
    if (!animalEditando || !usuarioId) return false;

    const animal = animalEditando.animal;
    const resposta = await fetch(`${API_ANIMAIS}/${usuarioId}/${animal.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...dados,
        local_desaparecimento: animal.tipo_registro === 'Perdido' ? dados.local : '',
        local_encontrado: animal.tipo_registro === 'Perdido' ? '' : dados.local,
        data_evento: dados.data,
        tipo_registro: animal.tipo_registro,
        status: animal.status,
      }),
    });

    if (!resposta.ok) return false;

    const atualizado = await resposta.json();

    if (!atualizado?.foto && animal?.foto) {
      atualizado.foto = animal.foto;
    }

    if (typeof animalEditando.atualizarLista === 'function') {
      animalEditando.atualizarLista(atualizado);
    }

    fecharEdicaoAnimal();
    return atualizado;
  };

  const salvarLocalizacaoUsuario = async (coordenadas) => {
    if (!usuarioId || !token) return;

    try {
      const payload = {
        nome: nome || '',
        telefone: telefone || '',
        localizacao: localizacao || 'Localização atual',
        latitude: coordenadas.latitude,
        longitude: coordenadas.longitude,
      };

      const resposta = await fetch(`${API_URL}/${usuarioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        console.warn(dados.mensagem || 'Não foi possível salvar a localização.');
        return;
      }

      setCoordenadasUsuario({
        latitude: Number(coordenadas.latitude),
        longitude: Number(coordenadas.longitude),
      });
      setLocalizacao(dados.localizacao || 'Localização atual');
    } catch (erro) {
      console.error('Erro ao salvar localização:', erro);
    }
  };

  const salvarPerfil = async (novoNome, novoTipoPerfil, novoTelefone, novaLocalizacao, novaFotoPerfil) => {
    try {
      const resposta = await fetch(`${API_URL}/${usuarioId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: novoNome,
          telefone: novoTelefone,
          localizacao: novaLocalizacao,
          foto: novaFotoPerfil?.startsWith('data:image/') ? novaFotoPerfil : null,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta('Erro', dados.mensagem || 'Não foi possível atualizar o perfil.', 'error');
        return;
      }

      setNome(dados.nome);
      setTipoPerfil(dados.tipo_perfil);
      setTelefone(dados.telefone || '');
      setLocalizacao(dados.localizacao || '');
      setFotoPerfil(dados.foto || novaFotoPerfil || null);
      setTelaAtual('perfil');
    } catch (erro) {
      console.error('Erro ao atualizar perfil:', erro);
      mostrarAlerta('Erro', 'Não foi possível conectar ao servidor.', 'error');
    }
  };

  const excluirPerfil = async () => {
    if (!usuarioId) {
      mostrarAlerta('Erro', 'Não foi possível identificar o usuário logado.', 'error');
      return;
    }

    try {
      const resposta = await fetch(`${API_URL}/${usuarioId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta('Erro', dados.mensagem || 'Não foi possível excluir o perfil.', 'error');
        return;
      }

      setUsuarioId(null);
      setNome('');
      setDocumento('');
      setEmail('');
      setTelefone('');
      setLocalizacao('');
      setTipoPerfil('');
      setFotoPerfil(null);
      setLoginEmail('');
      setLoginSenha('');
      setPerfilAtivo(false);
      setAnimalPerdidoAtivo(false);
      setAnimalEncontradoAtivo(false);
      setAnimalAdocaoAtivo(false);
      setTelaSelecionada(null);
      setTelaAtual('login');
      mostrarAlerta('Perfil excluído', 'Seu perfil foi excluído com sucesso.', 'success');
    } catch (erro) {
      console.error('Erro ao excluir perfil:', erro);
      mostrarAlerta('Erro', 'Não foi possível conectar ao servidor.', 'error');
    }
  };

  const voltarParaTelaAnterior = () => {
    Animated.timing(perfilOffset, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setPerfilAtivo(false);
      setAnimalPerdidoAtivo(telaAnterior === 'animalPerdido');
      setAnimalEncontradoAtivo(telaAnterior === 'animalEncontrado');
      setAnimalAdocaoAtivo(telaAnterior === 'animalAdocao');
      setTelaAtual('homepage');
    });
  };

  const cadastrarUsuario = async () => {
    if (!nome || !documento || !email || !senha || !confirmarSenha) {
      mostrarAlerta('Atenção', 'Preencha todos os campos.', 'warning');
      return;
    }

    if (senha !== confirmarSenha) {
      mostrarAlerta('Atenção', 'As senhas não são iguais.', 'warning');
      return;
    }

    const documentoLimpo = documento.replace(/\D/g, '');
    const tamanhoDocumento = tipoPerfil === 'Tutor' ? 11 : 14;

    if (documentoLimpo.length !== tamanhoDocumento) {
      mostrarAlerta('Atenção', tipoPerfil === 'Tutor' ? 'O CPF deve possuir 11 dígitos.' : 'O CNPJ deve possuir 14 dígitos.', 'warning');
      return;
    }

    try {
      const resposta = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome,
          email: email,
          documento: documentoLimpo,
          senha: senha,
          tipo_perfil: tipoPerfil,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta('Erro', dados.mensagem || 'Não foi possível realizar o cadastro.', 'error');
        return;
      }

      mostrarAlerta('Sucesso', 'Conta criada com sucesso!', 'success');

      console.log('Usuário cadastrado:', dados);

      setNome('');
      setDocumento('');
      setEmail('');
      setSenha('');
      setConfirmarSenha('');
      setTelaSelecionada('entrar');
    } catch (erro) {
      console.error('Erro ao cadastrar:', erro);
      mostrarAlerta('Erro', 'Não foi possível conectar ao servidor.', 'error');
    }
  };

  const entrarNoAplicativo = async () => {
    if (!loginEmail.trim() || !loginSenha) {
      mostrarAlerta('Atenção', 'Informe seu e-mail e sua senha.', 'warning');
      return;
    }

    try {
      const resposta = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail.trim(),
          senha: loginSenha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta('Não foi possível entrar', dados.mensagem || 'Verifique suas credenciais.', 'error');
        return;
      }

      setNome(dados.nome || '');
      setUsuarioId(dados.id);
      setToken(dados.token);
      setEmail(dados.email || loginEmail.trim());
      setDocumento(dados.documento || '');
      setTipoPerfil(dados.tipo_perfil || '');
      setTelefone(dados.telefone || '');
      setLocalizacao(dados.localizacao || '');
      setFotoPerfil(dados.foto || null);
      setTelaAtual('homepage');
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      mostrarAlerta(
        'Erro de conexão',
        `Endpoint: ${API_URL}/login\n${erro.message || 'Falha de rede.'}`,
        'error'
      );
    }
  };

  const iniciarSessao = (dados) => {
    setNome(dados.nome || '');
    setUsuarioId(dados.id);
    setToken(dados.token);
    setEmail(dados.email || '');
    setDocumento(dados.documento || '');
    setTipoPerfil(dados.tipo_perfil || '');
    setTelefone(dados.telefone || '');
    setLocalizacao(dados.localizacao || '');
    setFotoPerfil(dados.foto || null);
    setGoogleIdToken('');
    setGoogleLinkSenha('');
    setGoogleCadastroToken('');
    setTelaAtual('homepage');
  };

  const entrarComGoogle = async () => {
    if (Platform.OS !== 'android') {
      mostrarAlerta('Login Google', 'O login com Google está configurado para Android neste momento.');
      return;
    }

    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const resultado = await GoogleSignin.signIn();

      if (isCancelledResponse(resultado)) return;

      const idToken = resultado.data.idToken;
      if (!idToken) {
        throw new Error('O Google não retornou um ID token. Confira o ID do cliente Web.');
      }

      const resposta = await fetch(`${API_URL}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta('Não foi possível entrar com Google', dados.mensagem || 'Tente novamente.');
        return;
      }

      if (dados.acao === 'login') {
        iniciarSessao(dados);
      } else if (dados.acao === 'vincular_conta') {
        setGoogleIdToken(idToken);
        setGoogleCadastroToken('');
        setTelaSelecionada('entrar');
      } else if (dados.acao === 'completar_cadastro') {
        setGoogleCadastroToken(dados.tokenCadastro);
        setGoogleIdToken('');
        setNome(dados.nome || '');
        setEmail(dados.email || '');
        setTipoPerfil('Tutor');
        setDocumento('');
        setTelaSelecionada(null);
      } else {
        throw new Error('O servidor retornou uma resposta de autenticação inesperada.');
      }
    } catch (erro) {
      console.error('Erro ao entrar com Google:', erro);
      mostrarAlerta('Erro de conexão', erro.message || 'Não foi possível autenticar com Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const vincularContaGoogle = async () => {
    if (!googleLinkSenha) {
      mostrarAlerta('Atenção', 'Informe sua senha atual do PetWanted.');
      return;
    }

    setGoogleLoading(true);
    try {
      const resposta = await fetch(`${API_URL}/google/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: googleIdToken, senha: googleLinkSenha }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        mostrarAlerta('Não foi possível vincular', dados.mensagem || 'Verifique sua senha e tente novamente.');
        return;
      }

      iniciarSessao(dados);
    } catch (erro) {
      console.error('Erro ao vincular conta Google:', erro);
      mostrarAlerta('Erro de conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const cadastrarComGoogle = async () => {
    const documentoLimpo = documento.replace(/\D/g, '');
    const tamanhoDocumento = tipoPerfil === 'Tutor' ? 11 : 14;

    if (!nome.trim() || documentoLimpo.length !== tamanhoDocumento) {
      mostrarAlerta(
        'Atenção',
        tipoPerfil === 'Tutor'
          ? 'Informe seu nome e um CPF com 11 dígitos.'
          : 'Informe o nome da ONG e um CNPJ com 14 dígitos.'
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const resposta = await fetch(`${API_URL}/google/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenCadastro: googleCadastroToken,
          nome,
          documento: documentoLimpo,
          tipo_perfil: tipoPerfil,
        }),
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        if (resposta.status === 401) setGoogleCadastroToken('');
        mostrarAlerta('Não foi possível criar a conta', dados.mensagem || 'Confira seus dados e tente novamente.');
        return;
      }

      iniciarSessao(dados);
    } catch (erro) {
      console.error('Erro ao cadastrar com Google:', erro);
      mostrarAlerta('Erro de conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    if (larguraContainer === 0) return;

    const deslocamento = telaSelecionada === 'criarConta' ? (larguraContainer - 8) / 2 : 0;

    Animated.timing(deslocamentoBotao, {
      toValue: deslocamento,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [deslocamentoBotao, telaSelecionada, larguraContainer]);

  if (telaAtual === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.loginContainer}>
        <Modal
          transparent
          animationType="fade"
          visible={alertaVisivel}
          onRequestClose={() => setAlertaVisivel(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, alertaTipo === 'success' && styles.modalCardSuccess, alertaTipo === 'error' && styles.modalCardError, alertaTipo === 'warning' && styles.modalCardWarning]}>
              <Text style={styles.modalTitle}>{alertaTitulo}</Text>
              <Text style={styles.modalMessage}>{alertaMensagem}</Text>
              <Pressable style={styles.modalButton} onPress={() => setAlertaVisivel(false)}>
                <Text style={styles.modalButtonText}>OK</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <View style={styles.loginCard}>
          <View style={styles.loginHeader}>
            {telaRecuperacao && (
              <Pressable
                style={styles.recoveryBackButton}
                onPress={voltarEtapaRecuperacao}
                accessibilityLabel="Voltar"
              >
                <FontAwesome name="chevron-left" size={16} color="#4e8bc6" />
              </Pressable>
            )}
            <FontAwesome name="paw" size={34} color="#4e8bc6" style={styles.logoIcon} />
            <FontAwesome name="paw" size={23} color="rgba(255,255,255,0.55)" style={styles.decorativePawLeft} />
            <FontAwesome name="paw" size={20} color="rgba(255,255,255,0.48)" style={styles.decorativePawRight} />
            <Text style={styles.title}>PetWanted</Text>
            <Text style={styles.subtitle}>
              {telaRecuperacao ? 'Mantenha sua conta segura' : 'Entre ou crie sua conta para continuar'}
            </Text>
          </View>

          <View style={styles.loginPanel}>
            {telaRecuperacao ? (
              <View style={styles.recoveryContent}>
                <View style={styles.recoveryProgress}>
                  {['E-mail', 'Código', 'Nova senha'].map((etapa, index) => {
                    const etapaAtual = telaRecuperacao === 'email' ? 0 : telaRecuperacao === 'codigo' ? 1 : 2;
                    return (
                      <View style={styles.recoveryProgressItem} key={etapa}>
                        <View style={[styles.recoveryProgressBar, index <= etapaAtual && styles.recoveryProgressBarActive]} />
                        <Text style={[styles.recoveryProgressText, index === etapaAtual && styles.recoveryProgressTextActive]}>
                          {etapa}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {telaRecuperacao === 'email' && (
                  <>
                    <Text style={styles.recoveryTitle}>Esqueceu a senha?</Text>
                    <Text style={styles.recoveryDescription}>
                      Informe seu e-mail e enviaremos um código de verificação para você.
                    </Text>
                    <View style={[styles.inputRow, styles.recoveryInput]}>
                      <FontAwesome name="envelope-o" size={17} color="#5791ca" />
                      <TextInput
                        style={styles.inputField}
                        placeholder="E-mail cadastrado"
                        placeholderTextColor="#8ca8c0"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        value={emailRecuperacao}
                        onChangeText={setEmailRecuperacao}
                      />
                    </View>
                    <Pressable style={[styles.formButton, recuperacaoLoading && styles.disabledButton]} onPress={avancarParaCodigo} disabled={recuperacaoLoading}>
                      <Text style={styles.textFormButton}>{recuperacaoLoading ? 'ENVIANDO...' : 'ENVIAR CÓDIGO'}</Text>
                    </Pressable>
                    <View style={styles.recoveryInfo}>
                      <FontAwesome name="info-circle" size={17} color="#5791ca" />
                      <Text style={styles.recoveryInfoText}>
                        Se o e-mail estiver cadastrado, enviaremos um código válido por 10 minutos.
                      </Text>
                    </View>
                    <Pressable style={styles.recoveryLinkButton} onPress={() => setTelaRecuperacao(null)}>
                      <Text style={styles.footerLink}>Voltar ao login</Text>
                    </Pressable>
                  </>
                )}

                {telaRecuperacao === 'codigo' && (
                  <>
                    <Text style={styles.recoveryTitle}>Verifique seu e-mail</Text>
                    <Text style={styles.recoveryDescription}>
                      Enviamos um código de 6 dígitos para{' '}
                      <Text style={styles.recoveryEmail}>{mascararEmail(emailRecuperacao)}</Text>
                    </Text>
                    <View style={styles.codeInputContainer}>
                      <TextInput
                        style={styles.codeInputOverlay}
                        value={codigoRecuperacao}
                        onChangeText={(valor) => setCodigoRecuperacao(valor.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                        accessibilityLabel="Código de verificação de seis dígitos"
                      />
                      <View style={styles.codeDigits} pointerEvents="none">
                        {Array.from({ length: 6 }, (_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.codeDigit,
                              index === codigoRecuperacao.length && styles.codeDigitActive,
                            ]}
                          >
                            <Text style={styles.codeDigitText}>{codigoRecuperacao[index] || ''}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Pressable style={[styles.formButton, recuperacaoLoading && styles.disabledButton]} onPress={avancarParaNovaSenha} disabled={recuperacaoLoading}>
                      <Text style={styles.textFormButton}>{recuperacaoLoading ? 'VERIFICANDO...' : 'CONFIRMAR CÓDIGO'}</Text>
                    </Pressable>
                    <View style={styles.recoveryInfo}>
                      <FontAwesome name="info-circle" size={17} color="#5791ca" />
                      <Text style={styles.recoveryInfoText}>Confira também a caixa de spam.</Text>
                    </View>
                    <Pressable style={styles.recoveryLinkButton} onPress={() => setTelaRecuperacao('email')}>
                      <Text style={styles.footerLink}>Alterar e-mail</Text>
                    </Pressable>
                  </>
                )}

                {telaRecuperacao === 'senha' && (
                  <>
                    <Text style={styles.recoveryTitle}>Trocar senha</Text>
                    <Text style={styles.recoveryDescription}>
                      Crie uma senha forte para proteger sua conta.
                    </Text>
                    <View style={styles.inputRow}>
                      <FontAwesome name="lock" size={18} color="#80a9ce" />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Nova senha"
                        placeholderTextColor="#8ca8c0"
                        secureTextEntry={!mostrarNovaSenha}
                        value={novaSenha}
                        onChangeText={setNovaSenha}
                        autoCapitalize="none"
                      />
                      <Pressable style={styles.passwordToggleButton} onPress={() => setMostrarNovaSenha(!mostrarNovaSenha)} accessibilityLabel={mostrarNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}>
                        <FontAwesome name={mostrarNovaSenha ? 'eye-slash' : 'eye'} size={17} color="#80a9ce" />
                      </Pressable>
                    </View>
                    <View style={styles.inputRow}>
                      <FontAwesome name="lock" size={18} color="#80a9ce" />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Confirmar nova senha"
                        placeholderTextColor="#8ca8c0"
                        secureTextEntry={!mostrarConfirmarNovaSenha}
                        value={confirmarNovaSenha}
                        onChangeText={setConfirmarNovaSenha}
                        autoCapitalize="none"
                      />
                      <Pressable style={styles.passwordToggleButton} onPress={() => setMostrarConfirmarNovaSenha(!mostrarConfirmarNovaSenha)} accessibilityLabel={mostrarConfirmarNovaSenha ? 'Ocultar confirmação' : 'Mostrar confirmação'}>
                        <FontAwesome name={mostrarConfirmarNovaSenha ? 'eye-slash' : 'eye'} size={17} color="#80a9ce" />
                      </Pressable>
                    </View>
                    <Text style={styles.passwordCriteriaTitle}>Critérios da senha</Text>
                    {[
                      [novaSenha.length >= 8, 'Mínimo de 8 caracteres'],
                      [/[A-Z]/.test(novaSenha), 'Uma letra maiúscula'],
                      [/[a-z]/.test(novaSenha), 'Uma letra minúscula'],
                      [/\d/.test(novaSenha), 'Um número'],
                      [/[^A-Za-z0-9]/.test(novaSenha), 'Um caractere especial (ex.: ! @ # $)'],
                    ].map(([atendido, texto]) => (
                      <View style={styles.passwordCriterion} key={texto}>
                        <FontAwesome
                          name={atendido ? 'check-circle' : 'circle-o'}
                          size={16}
                          color={atendido ? '#5791ca' : '#a9c3db'}
                        />
                        <Text style={styles.passwordCriterionText}>{texto}</Text>
                      </View>
                    ))}
                    <Pressable style={[styles.formButton, styles.savePasswordButton, recuperacaoLoading && styles.disabledButton]} onPress={salvarNovaSenha} disabled={recuperacaoLoading}>
                      <Text style={styles.textFormButton}>{recuperacaoLoading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}</Text>
                    </Pressable>
                    <Pressable style={styles.recoveryLinkButton} onPress={() => setTelaRecuperacao(null)}>
                      <Text style={styles.footerLink}>Cancelar</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <>
            {!googleCadastroToken && !googleIdToken && (
              <>
                <Pressable
                  style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
                  onPress={entrarComGoogle}
                  disabled={googleLoading}
                >
                  <FontAwesome name="google" size={18} color="#4285F4" />
                  <Text style={styles.googleButtonText}>
                    {googleLoading ? 'Conectando...' : 'Continuar com Google'}
                  </Text>
                </Pressable>

                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.googleSeparator}>ou</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.actions} onLayout={handleLayoutAcoes}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.selected,
                      { width: Math.max((larguraContainer - 8) / 2, 0), transform: [{ translateX: deslocamentoBotao }] },
                    ]}
                  />
                  <Pressable style={styles.button} onPress={() => setTelaSelecionada('entrar')}>
                    <Text style={[styles.textButton, telaSelecionada === 'entrar' && styles.textButtonSelected]}>Entrar</Text>
                  </Pressable>
                  <Pressable style={styles.button} onPress={() => setTelaSelecionada('criarConta')}>
                    <Text style={[styles.textButton, telaSelecionada === 'criarConta' && styles.textButtonSelected]}>Criar conta</Text>
                  </Pressable>
                </View>
              </>
            )}

            {googleIdToken && telaSelecionada === 'entrar' && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Vincular conta existente</Text>
                <Text style={styles.googleHint}>
                  Confirme a senha atual do PetWanted para vincular esta conta Google.
                </Text>
                <View style={styles.inputRow}>
                  <FontAwesome name="lock" size={18} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Senha atual do PetWanted"
                    placeholderTextColor="#8ca8c0"
                    secureTextEntry
                    value={googleLinkSenha}
                    onChangeText={setGoogleLinkSenha}
                  />
                </View>
                <Pressable
                  style={styles.formButton}
                  onPress={vincularContaGoogle}
                  disabled={googleLoading}
                >
                  <Text style={styles.textFormButton}>Vincular e entrar</Text>
                </Pressable>
                <Pressable
                  style={styles.googleCancelButton}
                  onPress={() => {
                    setGoogleIdToken('');
                    setGoogleLinkSenha('');
                  }}
                >
                  <Text style={styles.textForgotPassword}>Cancelar vínculo</Text>
                </Pressable>
              </View>
            )}

            {googleCadastroToken && (
              <View style={styles.form}>
                <Text style={styles.formTitle}>Complete seu cadastro</Text>
                <Text style={styles.googleHint}>Conta Google: {email}</Text>
                <Text style={styles.label}>Tipo de perfil</Text>
                <View style={styles.tipoPerfilContainer}>
                  <Pressable
                    style={[styles.tipoPerfilButton, tipoPerfil === 'Tutor' && styles.tipoPerfilSelecionado]}
                    onPress={() => { setTipoPerfil('Tutor'); setDocumento(''); }}
                  >
                    <Text style={[styles.tipoPerfilTexto, tipoPerfil === 'Tutor' && styles.tipoPerfilTextoSelecionado]}>Tutor</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.tipoPerfilButton, tipoPerfil === 'ONG' && styles.tipoPerfilSelecionado]}
                    onPress={() => { setTipoPerfil('ONG'); setDocumento(''); }}
                  >
                    <Text style={[styles.tipoPerfilTexto, tipoPerfil === 'ONG' && styles.tipoPerfilTextoSelecionado]}>ONG</Text>
                  </Pressable>
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="user-o" size={17} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder={tipoPerfil === 'Tutor' ? 'Nome completo' : 'Nome da ONG'}
                    placeholderTextColor="#8ca8c0"
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="address-card-o" size={17} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder={tipoPerfil === 'Tutor' ? 'CPF' : 'CNPJ'}
                    placeholderTextColor="#8ca8c0"
                    keyboardType="numeric"
                    value={documento}
                    onChangeText={setDocumento}
                  />
                </View>
                <Pressable
                  style={styles.formButton}
                  onPress={cadastrarComGoogle}
                  disabled={googleLoading}
                >
                  <Text style={styles.textFormButton}>
                    {googleLoading ? 'Criando conta...' : 'Criar conta com Google'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.googleCancelButton}
                  onPress={() => {
                    setGoogleCadastroToken('');
                    setNome('');
                    setEmail('');
                    setDocumento('');
                  }}
                >
                  <Text style={styles.textForgotPassword}>Cancelar cadastro</Text>
                </Pressable>
              </View>
            )}

            {telaSelecionada === 'entrar' && !googleIdToken && !googleCadastroToken && (
              <View style={styles.form}>
                <View style={styles.inputRow}>
                  <FontAwesome name="envelope-o" size={17} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder="E-mail ou telefone"
                    placeholderTextColor="#8ca8c0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                  />
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="lock" size={18} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Senha"
                    placeholderTextColor="#8ca8c0"
                    secureTextEntry={!mostrarSenha}
                    value={loginSenha}
                    onChangeText={setLoginSenha}
                  />
                  <Pressable style={styles.passwordToggleButton} onPress={() => setMostrarSenha(!mostrarSenha)} accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                    <FontAwesome name={mostrarSenha ? 'eye-slash' : 'eye'} size={17} color="#80a9ce" />
                  </Pressable>
                </View>
                <Pressable style={styles.forgotPassword} onPress={abrirRecuperacaoSenha}>
                  <Text style={styles.textForgotPassword}>Esqueceu a senha?</Text>
                </Pressable>
                <Pressable style={styles.formButton} onPress={entrarNoAplicativo}>
                  <Text style={styles.textFormButton}>ENTRAR</Text>
                </Pressable>
              </View>
            )}

            {telaSelecionada === 'criarConta' && !googleCadastroToken && !googleIdToken && (
              <View style={styles.form}>
                <View style={styles.tipoPerfilContainer}>
                  <Pressable style={[styles.tipoPerfilButton, tipoPerfil === 'Tutor' && styles.tipoPerfilSelecionado]} onPress={() => { setTipoPerfil('Tutor'); setDocumento(''); }}>
                    <Text style={[styles.tipoPerfilTexto, tipoPerfil === 'Tutor' && styles.tipoPerfilTextoSelecionado]}>Tutor</Text>
                  </Pressable>
                  <Pressable style={[styles.tipoPerfilButton, tipoPerfil === 'ONG' && styles.tipoPerfilSelecionado]} onPress={() => { setTipoPerfil('ONG'); setDocumento(''); }}>
                    <Text style={[styles.tipoPerfilTexto, tipoPerfil === 'ONG' && styles.tipoPerfilTextoSelecionado]}>ONG</Text>
                  </Pressable>
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="user-o" size={17} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder={tipoPerfil === 'ONG' ? 'Nome da ONG' : 'Nome completo'}
                    placeholderTextColor="#8ca8c0"
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="address-card-o" size={17} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder={tipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}
                    placeholderTextColor="#8ca8c0"
                    keyboardType="numeric"
                    value={documento}
                    onChangeText={setDocumento}
                  />
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="envelope-o" size={17} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder="E-mail ou telefone"
                    placeholderTextColor="#8ca8c0"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="lock" size={18} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Senha"
                    placeholderTextColor="#8ca8c0"
                    secureTextEntry={!mostrarSenha}
                    value={senha}
                    onChangeText={setSenha}
                  />
                  <Pressable onPress={() => setMostrarSenha(!mostrarSenha)} accessibilityLabel={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                    <FontAwesome name={mostrarSenha ? 'eye-slash' : 'eye'} size={17} color="#80a9ce" />
                  </Pressable>
                </View>
                <View style={styles.inputRow}>
                  <FontAwesome name="lock" size={18} color="#80a9ce" />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Confirmar senha"
                    placeholderTextColor="#8ca8c0"
                    secureTextEntry={!mostrarConfirmarSenha}
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                  />
                  <Pressable style={styles.passwordToggleButton} onPress={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)} accessibilityLabel={mostrarConfirmarSenha ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}>
                    <FontAwesome name={mostrarConfirmarSenha ? 'eye-slash' : 'eye'} size={17} color="#80a9ce" />
                  </Pressable>
                </View>
                <Pressable style={styles.formButton} onPress={cadastrarUsuario}>
                  <Text style={styles.textFormButton}>CRIAR CONTA</Text>
                </Pressable>
              </View>
            )}

            {!googleCadastroToken && !googleIdToken && (
              <View style={styles.footerTextContainer}>
                <Text style={styles.footerText}>
                  {telaSelecionada === 'entrar' ? 'Não tem uma conta? ' : 'Já tem uma conta? '}
                </Text>
                <Pressable style={styles.footerLinkButton} onPress={() => setTelaSelecionada(telaSelecionada === 'entrar' ? 'criarConta' : 'entrar')}>
                  <Text style={styles.footerLink}>{telaSelecionada === 'entrar' ? 'Cadastre-se' : 'Entrar'}</Text>
                </Pressable>
              </View>
            )}
              </>
            )}
          </View>
        </View>

        <StatusBar hidden />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {!perfilAtivo && !animalPerdidoAtivo && !animalEncontradoAtivo && !animalAdocaoAtivo && (
        <Homepage
          setTelaAtual={abrirPerfil}
          telaAtual={telaAtual}
          nome={nome}
          fotoPerfil={fotoPerfil}
          abrirAnimalPerdido={abrirAnimalPerdido}
          abrirAnimalEncontrado={abrirAnimalEncontrado}
          abrirAdocao={abrirAnimalAdocao}
          usuarioId={usuarioId}
          token={token}
          onSalvarLocalizacao={salvarLocalizacaoUsuario}
        />
      )}

      {perfilAtivo && (
        <Animated.View style={[styles.overlay, { transform: [{ translateX: perfilOffset }] }]}>
          {telaAtual === 'perfil' && (
            <Perfil 
              onVoltar={voltarParaTelaAnterior}
              setTelaEdicao={abrirEdicaoPerfil}
              onExcluir={excluirPerfil}
              onDeslogar={deslogar}
              nome={nome}
              tipoPerfil={tipoPerfil}
              email={email}
              documento={documento}
              telefone={telefone}
              localizacao={localizacao}
              fotoPerfil={fotoPerfil}
            />
          )}

          {telaAtual === 'edicaoPerfil' && (
            <EdicaoPerfil
              onVoltar={voltarParaPerfil}
              nome={nome}
              tipoPerfil={tipoPerfil}
              telefone={telefone}
              localizacao={localizacao}
              fotoPerfil={fotoPerfil}
              email={email}
              documento={documento}
              onSalvar={salvarPerfil}
            />
          )}
        </Animated.View>
      )}

      {animalPerdidoAtivo && (
        <View style={styles.overlay}>
          <AnimalPerdido
            usuarioId={usuarioId}
            token={token}
            nome={nome}
            fotoPerfil={fotoPerfil}
            onVoltar={voltarParaHomeAnimalPerdido}
            setTelaAtual={abrirPerfil}
            abrirAnimalEncontrado={abrirAnimalEncontrado}
            abrirAdocao={abrirAnimalAdocao}
            abrirEdicaoAnimal={(animal, atualizarLista) => abrirEdicaoAnimal(animal, 'perdido', atualizarLista)}
          />
        </View>
      )}

      {animalEncontradoAtivo && (
        <View style={styles.overlay}>
          <AnimalEncontrado
            usuarioId={usuarioId}
            token={token}
            nome={nome}
            fotoPerfil={fotoPerfil}
            onVoltar={voltarParaHomeAnimalEncontrado}
            setTelaAtual={abrirPerfil}
            abrirAnimalPerdido={abrirAnimalPerdido}
            abrirAdocao={abrirAnimalAdocao}
            abrirEdicaoAnimal={(animal, atualizarLista) => abrirEdicaoAnimal(animal, 'encontrado', atualizarLista)}
          />
        </View>
      )}

      {animalAdocaoAtivo && (
        <View style={styles.overlay}>
          <AnimalAdocao
            usuarioId={usuarioId}
            token={token}
            nome={nome}
            fotoPerfil={fotoPerfil}
            onVoltar={voltarParaHomeAnimalAdocao}
            setTelaAtual={abrirPerfil}
            abrirAnimalPerdido={abrirAnimalPerdido}
            abrirAnimalEncontrado={abrirAnimalEncontrado}
            abrirEdicaoAnimal={(animal, atualizarLista) => abrirEdicaoAnimal(animal, 'adocao', atualizarLista)}
          />
        </View>
      )}

      {animalEditando && (
        <View style={styles.overlay}>
          <EdicaoAnimal
            animal={animalEditando.animal}
            onVoltar={fecharEdicaoAnimal}
            onSalvar={salvarAnimal}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  loginContainer: {
    flex: 1,
    backgroundColor: '#e7f1fb',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#315f8b',
    marginBottom: 4,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 12,
    color: '#66819b',
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  loginCard: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#477499',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 10,
  },

  loginHeader: {
    height: 194,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    backgroundColor: '#cfe5fa',
    overflow: 'hidden',
  },

  recoveryBackButton: {
    position: 'absolute',
    top: 20,
    left: 18,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    zIndex: 2,
    elevation: 3,
  },

  logoIcon: {
    width: 62,
    height: 62,
    lineHeight: 62,
    textAlign: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 31,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#4c78a0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
  },

  decorativePawLeft: {
    position: 'absolute',
    top: 28,
    left: 30,
    transform: [{ rotate: '-18deg' }],
  },

  decorativePawRight: {
    position: 'absolute',
    top: 62,
    right: 34,
    transform: [{ rotate: '18deg' }],
  },

  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },

  loginPanel: {
    marginTop: -20,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 26,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  recoveryContent: {
    width: '100%',
    minHeight: 420,
  },

  recoveryProgress: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },

  recoveryProgressItem: {
    flex: 1,
  },

  recoveryProgressBar: {
    height: 5,
    marginBottom: 6,
    backgroundColor: '#dfeaf3',
    borderRadius: 4,
  },

  recoveryProgressBarActive: {
    backgroundColor: '#5791ca',
  },

  recoveryProgressText: {
    color: '#91a8bc',
    fontSize: 11,
  },

  recoveryProgressTextActive: {
    color: '#315f8b',
    fontWeight: 'bold',
  },

  recoveryTitle: {
    marginBottom: 6,
    color: '#304f6b',
    fontSize: 20,
    fontWeight: 'bold',
  },

  recoveryDescription: {
    marginBottom: 16,
    color: '#66819b',
    fontSize: 12,
    lineHeight: 19,
  },

  recoveryEmail: {
    color: '#315f8b',
    fontWeight: 'bold',
  },

  recoveryInput: {
    marginBottom: 26,
    borderColor: '#5791ca',
    shadowColor: '#4c83b7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },

  recoveryInfo: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eef5fb',
    borderRadius: 12,
  },

  recoveryInfoText: {
    flex: 1,
    color: '#66819b',
    fontSize: 12,
    lineHeight: 17,
  },

  recoveryPrototypeNote: {
    marginTop: 12,
    color: '#718ba2',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },

  recoveryLinkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 16,
    paddingHorizontal: 10,
  },

  codeInputContainer: {
    position: 'relative',
    marginBottom: 22,
  },

  codeInputOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    opacity: 0,
  },

  codeDigits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },

  codeDigit: {
    flex: 1,
    maxWidth: 48,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef5fb',
    borderWidth: 1,
    borderColor: '#eef5fb',
    borderRadius: 8,
  },

  codeDigitActive: {
    backgroundColor: '#f5f9fd',
    borderColor: '#5791ca',
    shadowColor: '#4c83b7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },

  codeDigitText: {
    color: '#304f6b',
    fontSize: 20,
    fontWeight: 'bold',
  },

  passwordCriteriaTitle: {
    marginTop: 2,
    marginBottom: 8,
    color: '#66819b',
    fontSize: 12,
    fontWeight: '600',
  },

  passwordCriterion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },

  passwordCriterionText: {
    color: '#66819b',
    fontSize: 12,
  },

  savePasswordButton: {
    marginTop: 24,
  },

  actions: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#eaf3fa',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    height: 52,
    padding: 4,
    marginBottom: 2,
  },

  button: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  selected: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 44,
    backgroundColor: '#5791ca',
    borderRadius: 8,
    shadowColor: '#4c83b7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },

  textButton: {
    color: '#819bb4',
    fontSize: 14,
    fontWeight: '600',
  },

  textButtonSelected: {
    color: '#ffffff',
  },

  form: {
    width: '100%',
    marginTop: 18,
  },

  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#315f8b',
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#527493',
    marginBottom: 8,
  },

  tipoPerfilContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },

  tipoPerfilButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef5fb',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },

  tipoPerfilSelecionado: {
    backgroundColor: '#5791ca',
    borderColor: '#5791ca',
  },

  tipoPerfilTexto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6f8eaa',
  },

  tipoPerfilTextoSelecionado: {
    color: '#ffffff',
  },

  inputRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    backgroundColor: '#eef5fb',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
  },

  inputField: {
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    color: '#355b7d',
    fontSize: 14,
  },

  passwordToggleButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formButton: {
    minHeight: 48,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5791ca',
    borderRadius: 8,
    shadowColor: '#4c83b7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 9,
    elevation: 5,
  },

  textFormButton: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  googleSeparator: {
    marginHorizontal: 10,
    color: '#8ba4ba',
    fontSize: 12,
  },

  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#dbe7f0',
  },

  googleButton: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    shadowColor: '#587b9b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },

  googleButtonDisabled: {
    opacity: 0.6,
  },

  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.75,
  },

  googleButtonText: {
    color: '#3d5e7c',
    fontSize: 14,
    fontWeight: '500',
  },

  googleHint: {
    marginBottom: 14,
    color: '#66819b',
    fontSize: 13,
  },

  googleCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 8,
  },

  forgotPassword: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 12,
  },

  textForgotPassword: {
    color: '#315f8b',
    fontSize: 12,
  },

  footerTextContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 22,
  },

  footerText: {
    color: '#718ba2',
    fontSize: 12,
  },

  footerLink: {
    color: '#315f8b',
    fontSize: 12,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  footerLinkButton: {
    minHeight: 44,
    justifyContent: 'center',
  },

  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#ffffff',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 12, 9, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  modalCardSuccess: {
    borderColor: '#16A34A',
  },

  modalCardError: {
    borderColor: '#DC2626',
  },

  modalCardWarning: {
    borderColor: '#D97706',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
  },

  modalMessage: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },

  modalButton: {
    backgroundColor: '#5791ca',
    borderRadius: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});