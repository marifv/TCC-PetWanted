import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Homepage from './Homepage';
import Perfil from './Perfil';

export default function App() {
  const [telaSelecionada, setTelaSelecionada] = useState(null);
  const [telaAtual, setTelaAtual] = useState('login');
  const [perfilAtivo, setPerfilAtivo] = useState(false);
  const [larguraContainer, setLarguraContainer] = useState(0);
  const deslocamentoBotao = useRef(new Animated.Value(0)).current;
  const perfilOffset = useRef(new Animated.Value(400)).current;

  const handleLayoutAcoes = (event) => {
    const { width } = event.nativeEvent.layout;
    setLarguraContainer(width);
  };

  const abrirPerfil = () => {
    setTelaAtual('perfil');
    setPerfilAtivo(true);
    perfilOffset.setValue(400);
    Animated.timing(perfilOffset, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const voltarParaHome = () => {
    Animated.timing(perfilOffset, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setPerfilAtivo(false);
      setTelaAtual('homepage');
    });
  };

  useEffect(() => {
    if (larguraContainer === 0) return;

    const deslocamento = telaSelecionada === 'criarConta'
      ? larguraContainer / 2 + 2
      : 0;

    Animated.timing(deslocamentoBotao, {
      toValue: deslocamento,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [deslocamentoBotao, telaSelecionada, larguraContainer]);

  if (telaAtual === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
        <View style={styles.content}>
          <Image source={require('./assets/dog2.jpg')} style={styles.logo} />
          <Text style={styles.title}>PetWanted</Text>
          <Text style={styles.subtitle}>Entre ou crie sua conta para continuar</Text>

          <View style={styles.actions} onLayout={handleLayoutAcoes}>
            {telaSelecionada && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.selected,
                  { transform: [{ translateX: deslocamentoBotao }] },
                ]}
              />
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
              <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor={"gray"} keyboardType="email-address" />
              <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={"gray"} secureTextEntry />
              <Pressable style={styles.forgotPassword}>
                <Text style={styles.textForgotPassword}>Esqueceu sua senha?</Text>
              </Pressable>
              <Pressable style={styles.formButton} onPress={() => setTelaAtual('homepage')}>
                <Text style={styles.textFormButton}>Acessar conta</Text>
              </Pressable>
            </View>
          )}

          {telaSelecionada === 'criarConta' && (
            <View style={styles.formulario}>
              <TextInput style={styles.input} placeholder="Nome Completo" placeholderTextColor={"gray"} />
              <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={"gray"} secureTextEntry />
              <TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor={"gray"} secureTextEntry />
              <Pressable style={styles.formButton}>
                <Text style={styles.textFormButton}>Cadastrar</Text>
              </Pressable>
            </View>
          )}
        </View>
        <StatusBar style="auto" />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Homepage setTelaAtual={abrirPerfil} telaAtual={telaAtual} />

      {perfilAtivo && (
        <Animated.View
          style={[
            styles.overlay,
            { transform: [{ translateX: perfilOffset }] },
          ]}
        >
          <Perfil onVoltar={voltarParaHome} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8b385',
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
  logo: {
    width: 100,
    height: 100,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 50,
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
});
