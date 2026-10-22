import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { API_ANIMAIS } from './config/api';
import Pressable from './ButtonPressable';

const downloadsFotosMarcadores = new Map();

function urlImagemMarcador(url, tipoRegistro) {
  const corAro = tipoRegistro === 'Perdido'
    ? 'd1495b'
    : tipoRegistro === 'Adocao'
      ? '1877f2'
      : '2d6a4f';
  const partesCloudinary = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (!partesCloudinary) {
    throw new Error('A foto do marcador não está hospedada no Cloudinary.');
  }

  return `${partesCloudinary[1]}c_fill,w_112,h_112,r_max/bo_8px_solid_rgb:${corAro},r_max/c_pad,w_160,h_160,b_transparent,r_max/f_png/${partesCloudinary[2]}`;
}

function hashImagem(valor) {
  let hash = 2166136261;
  for (let indice = 0; indice < valor.length; indice += 1) {
    hash = Math.imul(hash ^ valor.charCodeAt(indice), 16777619);
  }
  return (hash >>> 0).toString(16);
}

function baixarImagemMarcador(url, tipoRegistro) {
  const urlTransformada = urlImagemMarcador(url, tipoRegistro);
  const nomeArquivo = `marker-${hashImagem(urlTransformada)}.png`;
  const diretorio = new Directory(Paths.cache, 'petwanted-marker-icons');
  const arquivo = new File(diretorio, nomeArquivo);

  if (arquivo.exists) return Promise.resolve(arquivo.uri);
  if (downloadsFotosMarcadores.has(urlTransformada)) {
    return downloadsFotosMarcadores.get(urlTransformada);
  }

  const download = (async () => {
    try {
      diretorio.create({ idempotent: true, intermediates: true });
      const imagemBaixada = await File.downloadFileAsync(urlTransformada, arquivo, { idempotent: true });
      if (!imagemBaixada.exists) {
        throw new Error('O arquivo da imagem do marcador não foi criado.');
      }
      return imagemBaixada.uri;
    } catch (erro) {
      if (arquivo.exists) {
        try {
          arquivo.delete();
        } catch (erroLimpeza) {
          console.warn('Não foi possível remover o arquivo incompleto do marcador:', erroLimpeza);
        }
      }
      throw erro;
    } finally {
      downloadsFotosMarcadores.delete(urlTransformada);
    }
  })();

  downloadsFotosMarcadores.set(urlTransformada, download);
  return download;
}

export default function MapaPet({ usuarioId, token, onSalvarLocalizacao }) {
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [permissaoNegada, setPermissaoNegada] = useState(false);
  const [podePerguntarNovamente, setPodePerguntarNovamente] = useState(true);
  const [animaisComLocalizacao, setAnimaisComLocalizacao] = useState([]);
  const [estadoFotosMarcadores, setEstadoFotosMarcadores] = useState({});
  const [filtrosAtivos, setFiltrosAtivos] = useState({
    Perdido: true,
    Encontrado: true,
    Adocao: true,
  });
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
    let ativo = true;

    animaisComLocalizacao.forEach((animal) => {
      if (!animal.foto) return;

      const markerId = `${animal.tipo_registro}-${animal.id}`;
      const estadoFoto = estadoFotosMarcadores[markerId];
      if (estadoFoto?.url === animal.foto && ['carregada', 'erro'].includes(estadoFoto.status)) return;

      baixarImagemMarcador(animal.foto, animal.tipo_registro).then((fotoLocal) => {
        if (!ativo) return;

        setEstadoFotosMarcadores((atual) => ({
          ...atual,
          [markerId]: { url: animal.foto, status: 'carregada', uri: fotoLocal },
        }));
      }).catch((erro) => {
        if (!ativo) return;

        console.warn(`Erro ao carregar a foto do animal ${animal.id} para o marcador:`, erro);
        setEstadoFotosMarcadores((atual) => ({
          ...atual,
          [markerId]: { url: animal.foto, status: 'erro' },
        }));
      });
    });

    return () => {
      ativo = false;
    };
  }, [animaisComLocalizacao, estadoFotosMarcadores]);

  useEffect(() => {
    if (!usuarioId || !token) return undefined;

    let ativo = true;
    const carregarAnimais = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [respostaPerdidos, respostaEncontrados, respostaAdocao] = await Promise.all([
          fetch(`${API_ANIMAIS}/perdidos`, { headers }),
          fetch(`${API_ANIMAIS}/encontrados`, { headers }),
          fetch(`${API_ANIMAIS}/adocao`, { headers }),
        ]);
        if (!respostaPerdidos.ok || !respostaEncontrados.ok || !respostaAdocao.ok) return;

        const [perdidos, encontrados, adocao] = await Promise.all([
          respostaPerdidos.json(),
          respostaEncontrados.json(),
          respostaAdocao.json(),
        ]);
        if (!ativo) return;

        const animaisValidos = [...perdidos, ...encontrados, ...adocao].filter((animal) => (
          Number.isFinite(Number(animal.local_latitude))
          && Number.isFinite(Number(animal.local_longitude))
          && animal.local_latitude != null
          && animal.local_longitude != null
        ));
        const animaisUnicos = new Map();
        animaisValidos.forEach((animal) => {
          const markerId = `${animal.tipo_registro}-${animal.id}`;
          if (!animaisUnicos.has(markerId)) {
            animaisUnicos.set(markerId, animal);
          }
        });
        setAnimaisComLocalizacao([...animaisUnicos.values()]);
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
          .map((animal) => {
            const markerId = `${animal.tipo_registro}-${animal.id}`;
            const fotoUrl = animal.foto;
            const estadoFoto = estadoFotosMarcadores[markerId];
            const estadoAtual = estadoFoto?.url === fotoUrl ? estadoFoto.status : null;
            const fotoDisponivel = fotoUrl && estadoAtual === 'carregada' && estadoFoto.uri;

            return (
              <Marker
                key={markerId}
                identifier={markerId}
                coordinate={{
                  latitude: Number(animal.local_latitude),
                  longitude: Number(animal.local_longitude),
                }}
                title={animal.nome || `Animal ${animal.tipo_registro === 'Perdido' ? 'perdido' : animal.tipo_registro === 'Adocao' ? 'para adoção' : 'encontrado'}`}
                description={animal.local || 'Local do registro'}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={2}
                image={fotoDisponivel ? { uri: estadoFoto.uri } : undefined}
              >
                {!fotoDisponivel && (
                  <View style={[
                    styles.animalMarker,
                    animal.tipo_registro === 'Perdido' ? styles.animalMarkerPerdido : styles.animalMarkerEncontrado,
                    animal.tipo_registro === 'Adocao' && styles.animalMarkerAdocao,
                  ]}>
                    <FontAwesome
                      name="paw"
                      size={20}
                      color={animal.tipo_registro === 'Adocao' ? '#1877f2' : '#6e8ba3'}
                    />
                  </View>
                )}
              </Marker>
            );
          })}
      </MapView>
      <View style={styles.mapFilters}>
        {['Perdido', 'Encontrado', 'Adocao'].map((tipo) => {
          const ativo = filtrosAtivos[tipo];
          const rotulo = tipo === 'Perdido'
            ? 'Perdidos'
            : tipo === 'Adocao'
              ? 'Adoção'
              : 'Encontrados';
          return (
            <Pressable
              key={tipo}
              style={[styles.mapFilter, ativo && styles.mapFilterActive]}
              onPress={() => alternarFiltro(tipo)}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={`Filtrar animais ${rotulo.toLowerCase()}`}
            >
              <Text style={[styles.mapFilterText, ativo && styles.mapFilterTextActive]}>
                {rotulo}
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
  animalMarker: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#29465e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  animalMarkerPerdido: {
    borderColor: '#d1495b',
  },
  animalMarkerEncontrado: {
    borderColor: '#2d6a4f',
  },
  animalMarkerAdocao: {
    borderColor: '#1877f2',
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
