import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  const [telaSelecionada, setTelaSelecionada] = useState(null);
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
  const [tipoPerfil, setTipoPerfil] = useState('');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState(null);
  const [senha, setSenha] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [alertaVisivel, setAlertaVisivel] = useState(false);
  const [alertaTitulo, setAlertaTitulo] = useState('');
  const [alertaMensagem, setAlertaMensagem] = useState('');
  const [alertaTipo, setAlertaTipo] = useState('info');

  const deslocamentoBotao = useRef(new Animated.Value(0)).current;
  const perfilOffset = useRef(new Animated.Value(400)).current;

  const mostrarAlerta = (titulo, mensagem, tipo = 'info') => {
    setAlertaTitulo(titulo);
    setAlertaMensagem(mensagem);
    setAlertaTipo(tipo);
    setAlertaVisivel(true);
  };

  const handleLayoutAcoes = (event) => {
    const { width } = event.nativeEvent.layout;
    setLarguraContainer(width);
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
      }),
    });

    if (!resposta.ok) return false;

    const atualizado = await resposta.json();

    if (typeof animalEditando.atualizarLista === 'function') {
      animalEditando.atualizarLista(atualizado);
    }

    fecharEdicaoAnimal();
    return atualizado;
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
      setFotoPerfil(novaFotoPerfil);
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
      setTelaAtual('homepage');
    } catch (erro) {
      console.error('Erro ao realizar login:', erro);
      mostrarAlerta('Erro', 'Não foi possível conectar ao servidor.', 'error');
    }
  };

  useEffect(() => {
    if (larguraContainer === 0) return;

    const deslocamento = telaSelecionada === 'criarConta' ? larguraContainer / 2 + 2 : 0;

    Animated.timing(deslocamentoBotao, {
      toValue: deslocamento,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [deslocamentoBotao, telaSelecionada, larguraContainer]);

  if (telaAtual === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
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

        <View style={styles.content}>
          <Image source={require('./assets/dog2.jpg')} style={styles.logo} />

          <Text style={styles.title}>PetWanted</Text>

          <Text style={styles.subtitle}>Entre ou crie sua conta para continuar</Text>

          <View style={styles.actions} onLayout={handleLayoutAcoes}>
            {telaSelecionada && (
              <Animated.View pointerEvents="none" style={[styles.selected, { transform: [{ translateX: deslocamentoBotao }] }]} />
            )}

            <Pressable style={styles.button} onPress={() => setTelaSelecionada('entrar')}>
              <Text style={styles.textButton}>Entrar</Text>
            </Pressable>

            <Pressable style={styles.button} onPress={() => setTelaSelecionada('criarConta')}>
              <Text style={styles.textButton}>Criar Conta</Text>
            </Pressable>
          </View>

          {telaSelecionada === 'entrar' && (
            <View style={styles.form}>
              <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor="gray" keyboardType="email-address" autoCapitalize="none" value={loginEmail} onChangeText={setLoginEmail} />

              <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="gray" secureTextEntry value={loginSenha} onChangeText={setLoginSenha} />

              <Pressable style={styles.forgotPassword}>
                <Text style={styles.textForgotPassword}>Esqueceu sua senha?</Text>
              </Pressable>

              <Pressable style={styles.formButton} onPress={entrarNoAplicativo}>
                <Text style={styles.textFormButton}>Acessar conta</Text>
              </Pressable>
            </View>
          )}

          {telaSelecionada === 'criarConta' && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>Criar Conta</Text>

              <Text style={styles.label}>Tipo de perfil</Text>

              <View style={styles.tipoPerfilContainer}>
                <Pressable style={[styles.tipoPerfilButton, tipoPerfil === 'Tutor' && styles.tipoPerfilSelecionado]} onPress={() => { setTipoPerfil('Tutor'); setDocumento(''); }}>
                  <Text style={[styles.tipoPerfilTexto, tipoPerfil === 'Tutor' && styles.tipoPerfilTextoSelecionado]}>Tutor</Text>
                </Pressable>

                <Pressable style={[styles.tipoPerfilButton, tipoPerfil === 'ONG' && styles.tipoPerfilSelecionado]} onPress={() => { setTipoPerfil('ONG'); setDocumento(''); }}>
                  <Text style={[styles.tipoPerfilTexto, tipoPerfil === 'ONG' && styles.tipoPerfilTextoSelecionado]}>ONG</Text>
                </Pressable>
              </View>

              <TextInput style={styles.input} placeholder={tipoPerfil === 'Tutor' ? 'Nome Completo' : 'Nome da ONG'} placeholderTextColor="gray" value={nome} onChangeText={setNome} />

              <TextInput style={styles.input} placeholder={tipoPerfil === 'Tutor' ? 'CPF' : 'CNPJ'} placeholderTextColor="gray" keyboardType="numeric" value={documento} onChangeText={setDocumento} />

              <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor="gray" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

              <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="gray" secureTextEntry value={senha} onChangeText={setSenha} />

              <TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor="gray" secureTextEntry value={confirmarSenha} onChangeText={setConfirmarSenha} />

              <Pressable style={styles.formButton} onPress={cadastrarUsuario}>
                <Text style={styles.textFormButton}>Cadastrar</Text>
              </Pressable>
            </View>
          )}
        </View>

        <StatusBar hidden />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Homepage 
        setTelaAtual={abrirPerfil} 
        telaAtual={telaAtual}
        abrirAnimalPerdido={abrirAnimalPerdido}
        abrirAnimalEncontrado={abrirAnimalEncontrado}
        abrirAdocao={abrirAnimalAdocao}
      />

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
    backgroundColor: '#f8b385',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0a0400',
    marginBottom: 8,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#060200',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 12,
  },

  logo: {
    width: 100,
    height: 100,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 50,
  },

  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },

  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  actions: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#cccccc',
    borderRadius: 25,
    position: 'relative',
    overflow: 'hidden',
    height: 52,
  },

  button: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  selected: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: '50%',
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 25,
  },

  textButton: {
    color: '#060000',
    fontSize: 16,
    fontWeight: 'bold',
  },

  form: {
    width: '100%',
    maxWidth: 350,
    marginTop: 24,
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#fff4e8',
    borderRadius: 12,
  },

  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#060000',
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#060000',
    marginBottom: 8,
  },

  tipoPerfilContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },

  tipoPerfilButton: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5b39b',
    borderRadius: 6,
  },

  tipoPerfilSelecionado: {
    backgroundColor: '#7a4b2a',
    borderColor: '#7a4b2a',
  },

  tipoPerfilTexto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7a4b2a',
  },

  tipoPerfilTextoSelecionado: {
    color: '#ffffff',
  },

  input: {
    height: 44,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5b39b',
    borderRadius: 6,
    fontSize: 14,
  },

  formButton: {
    height: 44,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7a4b2a',
    borderRadius: 6,
  },

  textFormButton: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  forgotPassword: {
    marginTop: 8,
    marginBottom: 16,
  },

  textForgotPassword: {
    color: '#7a4b2a',
    fontSize: 12,
    textAlign: 'left',
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
    backgroundColor: '#fffaf5',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#f0d6c2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  modalCardSuccess: {
    borderColor: '#7abf87',
  },

  modalCardError: {
    borderColor: '#d97b65',
  },

  modalCardWarning: {
    borderColor: '#e3a85a',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2b1a13',
    marginBottom: 8,
    textAlign: 'center',
  },

  modalMessage: {
    fontSize: 15,
    color: '#4a3428',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },

  modalButton: {
    backgroundColor: '#7a4b2a',
    borderRadius: 10,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});