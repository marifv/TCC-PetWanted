import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Homepage from './Homepage';

export default function App() {
  const [telaSelecionada, setTelaSelecionada] = useState(null);
  const [telaAtual, setTelaAtual] = useState('login');
  const deslocamentoBotao = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(deslocamentoBotao, {
      toValue: telaSelecionada === 'criarConta' ? 292 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [deslocamentoBotao, telaSelecionada]);

  if (telaAtual === 'homepage') {
    return <Homepage />;
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/dog2.jpg')}
        style={styles.logo}
      />
      <Text style={styles.titulo}>PetWanted</Text>
      <Text style={styles.subtitulo}>Entre ou crie sua conta para continuar</Text>
      <View style={styles.acoes}>
        {telaSelecionada && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicadorSelecionado,
              { transform: [{ translateX: deslocamentoBotao }] },
            ]}
          />
        )}
        <Pressable
          style={styles.botao}
          onPress={() => setTelaSelecionada('entrar')}
        >
          <Text style={styles.textoBotao}>Entrar</Text>
        </Pressable>
        <Pressable
          style={styles.botao}
          onPress={() => setTelaSelecionada('criarConta')}
        >
          <Text style={styles.textoBotao}>Criar Conta</Text>
        </Pressable>
      </View>
      {telaSelecionada === 'entrar' && (
        <View style={styles.formulario}>
          <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor={"gray"} keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={"gray"} secureTextEntry />
          <Pressable style={styles.esqueciSenha}>Esqueceu sua senha?</Pressable>
          <Pressable
            style={styles.botaoFormulario}
            onPress={() => setTelaAtual('homepage')}
          >
            <Text style={styles.textoBotaoFormulario}>Acessar conta</Text>
          </Pressable>
        </View>
      )}
      {telaSelecionada === 'criarConta' && (
        <View style={styles.formulario}>
          <TextInput style={styles.input} placeholder="Nome Completo" placeholderTextColor={"gray"}/>
          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={"gray"}secureTextEntry />
           <TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor={"gray"} secureTextEntry />
          <Pressable style={styles.botaoFormulario}>
            <Text style={styles.textoBotaoFormulario}>Cadastrar</Text>
          </Pressable>
        </View>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8b385',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 60,
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0a0400',
    marginBottom: 12,
  },
  subtitulo: {
    fontSize: 16,
    color: '#060200',
    marginBottom: 24,
  },
  acoes: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#cccccc',
    borderRadius: 25,
    position: 'relative',
  },
  botao: {
    width: 280,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicadorSelecionado: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 272,
    height: 44,
    backgroundColor: '#ffffff',
    borderRadius: 25,
  },
  textoBotao: {
    color: '#060000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formulario: {
    width: 380,
    marginTop: 24,
    padding: 20,
    backgroundColor: '#fff4e8',
    borderRadius: 12,
  },
  tituloFormulario: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#060000',
    marginBottom: 16,
  },
  input: {
    height: 46,
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d5b39b',
    borderRadius: 6,
  },
  botaoFormulario: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7a4b2a',
    borderRadius: 6,
  },
  textoBotaoFormulario: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  esqueciSenha: {
    marginTop: 12,
    color: '#7a4b2a',
    marginTop: -8,
    marginBottom: 50,
    textAlign: 'left',
  },
});
