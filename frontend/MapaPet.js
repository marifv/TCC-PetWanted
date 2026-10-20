import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { API_ANIMAIS } from './config/api';
import Pressable from './ButtonPressable';

export default function MapaPet({ usuarioId, token, onSalvarLocalizacao }) {
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  const [podePerguntarNovamente, setPodePerguntarNovamente] = useState(true);
  const [animaisComLocalizacao, setAnimaisComLocalizacao] = useState([]);
  const [filtrosAtivos, setFiltrosAtivos] = useState({ Perdido: true, Encontrado: true });
  const mapaRef = useRef(null);
  const salvarLocalizacaoRef = useRef(onSalvarLocalizacao);

  useEffect(() => {
    salvarLocalizacaoRef.current = onSalvarLocalizacao;
  }, [onSalvarLocalizacao]);

  const carregarLocalizacao = useCallback(async () => {
    setCarregando(true);
    setErroLocalizacao('');

    try {
      let permissao = await Location.getForegroundPermissionsAsync();
      if (!permissao.granted && permissao.canAskAgain) {
        permissao = await Location.requestForegroundPermissionsAsync();
      }

      setPermissaoNegada(!permissao.granted);
      setPodePerguntarNovamente(permissao.canAskAgain);
      if (!permissao.granted) return;

      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coordenadas = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
      };
      const novaRegiao = {
        ...coordenadas,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setLocalizacaoUsuario(coordenadas);
      mapaRef.current?.animateToRegion(novaRegiao, 600);

      if (salvarLocalizacaoRef.current && usuarioId && token) {
        await salvarLocalizacaoRef.current(coordenadas);
      }
    } catch (error) {
      setErroLocalizacao('Não foi possível obter sua localização. Verifique se o GPS está ativado.');
    } finally {
      setCarregando(false);
    }
  }, [usuarioId, token]);

  useEffect(() => {
    carregarLocalizacao();
  }, [carregarLocalizacao]);

  useEffect(() => {
    if (!usuarioId || !token) return undefined;

    let ativo = true;
    const carregarAnimais = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [respostaPerdidos, respostaEncontrados] = await Promise.all([
          fetch(`${API_ANIMAIS}/perdidos`, { headers }),
          fetch(`${API_ANIMAIS}/encontrados`, { headers }),
        ]);
        if (!respostaPerdidos.ok || !respostaEncontrados.ok) return;

        const [perdidos, encontrados] = await Promise.all([
          respostaPerdidos.json(),
          respostaEncontrados.json(),
        ]);
        if (!ativo) return;

        setAnimaisComLocalizacao([...perdidos, ...encontrados].filter((animal) => (
          Number.isFinite(Number(animal.local_latitude))
          && Number.isFinite(Number(animal.local_longitude))
          && animal.local_latitude != null
          && animal.local_longitude != null
        )));
      } catch (error) {
        if (ativo) setAnimaisComLocalizacao([]);
      }
    };

    carregarAnimais();
    const intervalo = setInterval(carregarAnimais, 30000);

    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [usuarioId, token]);

  const abrirConfiguracoes = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      setErroLocalizacao('Não foi possível abrir as configurações do aplicativo.');
    }
  };

  const alternarFiltro = (tipo) => {
    setFiltrosAtivos((atual) => ({ ...atual, [tipo]: !atual[tipo] }));
  };

  return (
    <View style={styles.container}>
      {carregando && (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexto}>Buscando sua localização...</Text>
        </View>
      )}

      {permissaoNegada && !carregando && (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexto}>
            Permita o acesso à localização para mostrar sua posição atual.
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={podePerguntarNovamente ? carregarLocalizacao : abrirConfiguracoes}
          >
            <Text style={styles.permissionButtonText}>
              {podePerguntarNovamente ? 'Permitir localização' : 'Abrir configurações'}
            </Text>
          </Pressable>
        </View>
      )}

      {!!erroLocalizacao && (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexto}>{erroLocalizacao}</Text>
        </View>
      )}

      <MapView
        ref={mapaRef}
        style={styles.map}
        initialRegion={{
          latitude: -23.5505,
          longitude: -46.6333,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {localizacaoUsuario && (
          <Marker
            coordinate={localizacaoUsuario}
            title="Você está aqui"
            description="Local atual"
          />
        )}
        {animaisComLocalizacao
          .filter((animal) => filtrosAtivos[animal.tipo_registro])
          .map((animal) => (
          <Marker
            key={`${animal.tipo_registro}-${animal.id}`}
            coordinate={{
              latitude: Number(animal.local_latitude),
              longitude: Number(animal.local_longitude),
            }}
            title={animal.nome || `Animal ${animal.tipo_registro === 'Perdido' ? 'perdido' : 'encontrado'}`}
            description={animal.local || 'Local do registro'}
            pinColor={animal.tipo_registro === 'Perdido' ? '#d1495b' : '#2d6a4f'}
          />
          ))}
      </MapView>
      <View style={styles.mapFilters}>
        {['Perdido', 'Encontrado'].map((tipo) => {
          const ativo = filtrosAtivos[tipo];
          const perdido = tipo === 'Perdido';
          return (
            <Pressable
              key={tipo}
              style={[styles.mapFilter, ativo && styles.mapFilterActive]}
              onPress={() => alternarFiltro(tipo)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Filtrar animais ${perdido ? 'perdidos' : 'encontrados'}`}
            >
              <Text style={[styles.mapFilterText, ativo && styles.mapFilterTextActive]}>
                {perdido ? 'Perdidos' : 'Encontrados'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingBox: {
    position: 'absolute',
    top: 16,
    left: 24,
    right: 24,
    zIndex: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingTexto: {
    color: '#444',
    fontWeight: '600',
  },
  permissionButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#5791ca',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  mapFilters: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    gap: 8,
    zIndex: 4,
  },
  mapFilter: {
    minHeight: 44,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#476f91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  mapFilterActive: {
    backgroundColor: '#5791ca',
    borderWidth: 1,
    borderColor: '#5791ca',
  },
  mapFilterText: {
    color: '#718ba2',
    fontSize: 12,
    fontWeight: '600',
  },
  mapFilterTextActive: {
    color: '#ffffff',
  },
});
