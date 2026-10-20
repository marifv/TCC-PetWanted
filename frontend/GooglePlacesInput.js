import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Pressable from './ButtonPressable';
import { API_BASE_URL } from './config/api';

export default function GooglePlacesInput({ value, onChangeText, onLocationSelected, token, style, placeholder }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [resolvendoLocal, setResolvendoLocal] = useState(false);
  const ignorarProximaBusca = useRef(false);

  useEffect(() => {
    const entrada = value.trim();
    if (ignorarProximaBusca.current) {
      ignorarProximaBusca.current = false;
      return undefined;
    }

    if (entrada.length < 3 || !token) {
      setSugestoes([]);
      setBuscando(false);
      return undefined;
    }

    let ativo = true;
    setBuscando(true);
    const timeout = setTimeout(async () => {
      try {
        const resposta = await fetch(
          `${API_BASE_URL}/locais/autocomplete?input=${encodeURIComponent(entrada)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const dados = await resposta.json();
        if (ativo) setSugestoes(resposta.ok ? dados.sugestoes || [] : []);
      } catch (error) {
        if (ativo) setSugestoes([]);
      } finally {
        if (ativo) setBuscando(false);
      }
    }, 350);

    return () => {
      ativo = false;
      clearTimeout(timeout);
    };
  }, [value, token]);

  const selecionarSugestao = async (sugestao) => {
    ignorarProximaBusca.current = true;
    setSugestoes([]);
    onChangeText(sugestao.endereco);

    if (!sugestao.id || !token || !onLocationSelected) return;

    setResolvendoLocal(true);
    try {
      const resposta = await fetch(
        `${API_BASE_URL}/locais/details/${encodeURIComponent(sugestao.id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const coordenadas = await resposta.json();
      if (resposta.ok) onLocationSelected(coordenadas);
    } catch (error) {
      setSugestoes([]);
    } finally {
      setResolvendoLocal(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={style}
        placeholder={placeholder}
        placeholderTextColor="gray"
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
      />
      {(buscando || resolvendoLocal || sugestoes.length > 0) && (
        <View style={styles.sugestoes}>
          {(buscando || resolvendoLocal) && sugestoes.length === 0 ? (
            <Text style={styles.status}>{resolvendoLocal ? 'Obtendo localização...' : 'Buscando endereços...'}</Text>
          ) : sugestoes.map((sugestao, indice) => (
            <Pressable
              key={sugestao.id || `${sugestao.endereco}-${indice}`}
              style={styles.item}
              onPress={() => selecionarSugestao(sugestao)}
            >
              <Text style={styles.endereco}>{sugestao.endereco}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
    width: '100%',
  },
  sugestoes: {
    marginTop: -1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 4,
  },
  item: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  endereco: {
    color: '#333',
    fontSize: 14,
  },
  status: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#666',
    fontSize: 13,
  },
});