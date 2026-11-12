import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Directory, File, Paths } from 'expo-file-system';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { API_ANIMAIS } from './config/api';
import Pressable from './ButtonPressable';
import AnuncioAutor from './AnuncioAutor';
import FotoAmpliavel from './FotoAmpliavel';
import { registrarPermissaoNegada } from './services/permissionNotifications';
import { agruparMarcadores } from './utils/agruparMarcadores';

const downloadsFotosMarcadores = new Map();
const ZOOM_MINIMO_GRUPO = 0.001;

function urlImagemMarcador(url, tipoRegistro, status) {
  const corStatusEncontrado = status === 'Dono encontrado' ? '2d6a4f' : 'f2c14e';
  const corAro = tipoRegistro === 'Perdido'
    ? 'd1495b'
    : tipoRegistro === 'Adocao'
      ? '1877f2'
      : corStatusEncontrado;
  const partesCloudinary = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (!partesCloudinary) {
    return url;
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

function baixarImagemMarcador(url, tipoRegistro, status) {
  const urlTransformada = urlImagemMarcador(url, tipoRegistro, status);
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

export default function MapaPet({ usuarioId, token, onSalvarLocalizacao, onOpenAnnouncement, onIniciarChat }) {
  const [localizacaoUsuario, setLocalizacaoUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [animaisComLocalizacao, setAnimaisComLocalizacao] = useState([]);
  const [estadoFotosMarcadores, setEstadoFotosMarcadores] = useState({});
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [regiaoMapa, setRegiaoMapa] = useState({
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [dimensoesMapa, setDimensoesMapa] = useState({ width: 0, height: 0 });
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

      if (!permissao.granted) {
        await registrarPermissaoNegada('location');
        return;
      }

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
      if (
        estadoFoto?.url === animal.foto
        && estadoFoto.statusAnimal === animal.status
        && ['carregada', 'erro'].includes(estadoFoto.status)
      ) return;

      baixarImagemMarcador(animal.foto, animal.tipo_registro, animal.status).then((fotoLocal) => {
        if (!ativo) return;

        setEstadoFotosMarcadores((atual) => ({
          ...atual,
          [markerId]: { url: animal.foto, statusAnimal: animal.status, status: 'carregada', uri: fotoLocal },
        }));
      }).catch((erro) => {
        if (!ativo) return;

        console.warn(`Erro ao carregar a foto do animal ${animal.id} para o marcador:`, erro);
        setEstadoFotosMarcadores((atual) => ({
          ...atual,
          [markerId]: { url: animal.foto, statusAnimal: animal.status, status: 'erro' },
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
          String(animal.status || '').trim().toLowerCase() !== 'dono encontrado'
          &&
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

  const alternarFiltro = (tipo) => {
    setFiltrosAtivos((atual) => ({ ...atual, [tipo]: !atual[tipo] }));
  };

  const abrirGrupoMarcadores = (grupo) => {
    const primeiraLocalizacao = grupo.animais[0];
    const mesmaLocalizacao = grupo.animais.every((animal) => (
      Math.abs(Number(animal.local_latitude) - Number(primeiraLocalizacao.local_latitude)) < 0.00001
      && Math.abs(Number(animal.local_longitude) - Number(primeiraLocalizacao.local_longitude)) < 0.00001
    ));
    if (
      mesmaLocalizacao
      || regiaoMapa.latitudeDelta <= ZOOM_MINIMO_GRUPO
      || regiaoMapa.longitudeDelta <= ZOOM_MINIMO_GRUPO
    ) {
      setGrupoSelecionado(grupo.animais);
      return;
    }

    const latitudeDelta = Math.max(regiaoMapa.latitudeDelta / 2.5, ZOOM_MINIMO_GRUPO);
    const longitudeDelta = Math.max(regiaoMapa.longitudeDelta / 2.5, ZOOM_MINIMO_GRUPO);
    if (latitudeDelta === regiaoMapa.latitudeDelta && longitudeDelta === regiaoMapa.longitudeDelta) {
      setGrupoSelecionado(grupo.animais);
      return;
    }

    mapaRef.current?.animateToRegion({
      latitude: grupo.latitude,
      longitude: grupo.longitude,
      latitudeDelta,
      longitudeDelta,
    }, 350);
  };

  const selecionarAnimalDoGrupo = (animal) => {
    setGrupoSelecionado(null);
    setAnimalSelecionado(animal);
    mapaRef.current?.animateToRegion({
      latitude: Number(animal.local_latitude),
      longitude: Number(animal.local_longitude),
      latitudeDelta: Math.min(regiaoMapa.latitudeDelta, 0.008),
      longitudeDelta: Math.min(regiaoMapa.longitudeDelta, 0.008),
    }, 350);
  };

  const animaisVisiveis = animaisComLocalizacao
    .filter((animal) => filtrosAtivos[animal.tipo_registro]);
  const gruposMarcadores = agruparMarcadores(animaisVisiveis, regiaoMapa, dimensoesMapa);

  return (
    <View style={styles.container}>
      {!!erroLocalizacao && (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingTexto}>{erroLocalizacao}</Text>
        </View>
      )}

      <MapView
        ref={mapaRef}
        style={styles.map}
        onLayout={({ nativeEvent }) => {
          setDimensoesMapa({
            width: nativeEvent.layout.width,
            height: nativeEvent.layout.height,
          });
        }}
        onRegionChangeComplete={setRegiaoMapa}
        initialRegion={{
          latitude: -23.5505,
          longitude: -46.6333,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {gruposMarcadores.map((grupo) => {
          if (grupo.animais.length > 1) {
            return (
              <Marker
                key={grupo.id}
                identifier={grupo.id}
                coordinate={{ latitude: grupo.latitude, longitude: grupo.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
                zIndex={4}
                onPress={() => abrirGrupoMarcadores(grupo)}
              >
                <View style={styles.clusterMarker} accessibilityLabel={`${grupo.animais.length} animais próximos`}>
                  <Text style={styles.clusterMarkerText}>{grupo.animais.length}</Text>
                </View>
              </Marker>
            );
          }

          const animal = grupo.animais[0];
          const markerId = `${animal.tipo_registro}-${animal.id}`;
          const fotoUrl = animal.foto;
          const estadoFoto = estadoFotosMarcadores[markerId];
          const estadoAtual = estadoFoto?.url === fotoUrl && estadoFoto.statusAnimal === animal.status
            ? estadoFoto.status
            : null;
          const fotoDisponivel = fotoUrl && estadoAtual === 'carregada' && estadoFoto.uri;

          return (
            <Marker
              key={markerId}
              identifier={markerId}
              coordinate={{
                latitude: Number(animal.local_latitude),
                longitude: Number(animal.local_longitude),
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={2}
              image={fotoDisponivel ? { uri: estadoFoto.uri } : undefined}
              onPress={() => {
                setGrupoSelecionado(null);
                setAnimalSelecionado(animal);
                mapaRef.current?.animateToRegion({
                  latitude: Number(animal.local_latitude),
                  longitude: Number(animal.local_longitude),
                  latitudeDelta: 0.008,
                  longitudeDelta: 0.008,
                }, 400);
              }}
            >
              {!fotoDisponivel && (
                <View style={[
                  styles.animalMarker,
                  animal.tipo_registro === 'Perdido' ? styles.animalMarkerPerdido : styles.animalMarkerEncontrado,
                  animal.tipo_registro === 'Adocao' && styles.animalMarkerAdocao,
                  animal.tipo_registro === 'Encontrado' && animal.status !== 'Dono encontrado' && styles.animalMarkerProcurando,
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
      {!animalSelecionado && !grupoSelecionado && <View style={styles.mapFilters}>
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
      </View>}
      {grupoSelecionado && (
        <View style={styles.clusterCard}>
          <View style={styles.clusterCardHeader}>
            <Text style={styles.clusterCardTitle}>{grupoSelecionado.length} animais próximos</Text>
            <Pressable
              style={styles.closeAnimalCard}
              onPress={() => setGrupoSelecionado(null)}
              accessibilityRole="button"
              accessibilityLabel="Fechar lista de animais próximos"
            >
              <FontAwesome name="times" size={16} color="#49647a" />
            </Pressable>
          </View>
          <ScrollView style={styles.clusterList}>
            {grupoSelecionado.map((animal) => (
              <Pressable
                key={`${animal.tipo_registro}-${animal.id}`}
                style={styles.clusterAnimal}
                onPress={() => selecionarAnimalDoGrupo(animal)}
                accessibilityRole="button"
                accessibilityLabel={`Ver ${animal.nome || 'animal sem nome'}, ${animal.tipo_registro}`}
              >
                <View style={styles.clusterAnimalPhoto}>
                  {animal.foto
                    ? <Image source={{ uri: animal.foto }} style={styles.clusterAnimalPhotoImage} />
                    : <FontAwesome name="paw" size={16} color="#6e9fc8" />}
                </View>
                <View style={styles.clusterAnimalInfo}>
                  <Text style={styles.clusterAnimalName} numberOfLines={1}>
                    {animal.nome || 'Animal sem nome'}
                  </Text>
                  <Text style={styles.clusterAnimalType} numberOfLines={1}>
                    {[animal.tipo_registro, animal.especie, animal.raca].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <FontAwesome name="chevron-right" size={13} color="#8ca6bd" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {animalSelecionado && (
        <View style={styles.animalCard}>
          <View style={styles.animalCardHeader}>
            <View style={styles.animalCardAvatar}>
              {animalSelecionado.foto ? (
                <Image source={{ uri: animalSelecionado.foto }} style={styles.animalCardAvatarImage} />
              ) : (
                <FontAwesome name="paw" size={17} color="#6e9fc8" />
              )}
            </View>
            <View style={styles.animalCardHeaderText}>
              <Text style={styles.animalCardName} numberOfLines={1}>
                {animalSelecionado.nome || 'Animal sem nome'}
              </Text>
              <Text style={styles.animalCardSubtitle} numberOfLines={1}>
                {[animalSelecionado.especie, animalSelecionado.raca].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable
              style={styles.closeAnimalCard}
              onPress={() => setAnimalSelecionado(null)}
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes do animal"
            >
              <FontAwesome name="times" size={16} color="#49647a" />
            </Pressable>
          </View>
          {animalSelecionado.foto ? (
            <FotoAmpliavel
              uri={animalSelecionado.foto}
              uris={animalSelecionado.fotos}
              style={styles.animalCardPhoto}
              resizeMode="cover"
              accessibilityLabel={`Ampliar foto de ${animalSelecionado.nome || 'animal'}`}
            />
          ) : (
            <View style={[styles.animalCardPhoto, styles.animalCardPhotoPlaceholder]}>
              <FontAwesome name="paw" size={32} color="#cfcfcf" />
            </View>
          )}
          <View style={styles.animalCardDetails}>
            <AnuncioAutor
              animal={{ ...animalSelecionado, meuAnimal: String(animalSelecionado.id_usuario) === String(usuarioId) }}
              onIniciarChat={onIniciarChat}
            />
            <Text style={[
              styles.animalCardStatus,
              animalSelecionado.status !== 'Dono encontrado' && styles.animalCardStatusProcurando,
            ]}>
              {animalSelecionado.status || animalSelecionado.tipo_registro}
            </Text>
            <Text style={styles.animalCardLocation} numberOfLines={2}>
              <FontAwesome name="map-marker" size={13} color="#6e9fc8" />{' '}
              {animalSelecionado.local || 'Local não informado'}
            </Text>
            {!!animalSelecionado.descricao && (
              <Text style={styles.animalCardDescription} numberOfLines={2}>
                {animalSelecionado.descricao}
              </Text>
            )}
            <Pressable
              style={styles.openAnnouncementButton}
              onPress={() => onOpenAnnouncement?.(animalSelecionado)}
              accessibilityRole="button"
              accessibilityLabel={`Ver anúncio de ${animalSelecionado.nome || 'animal'}`}
            >
              <Text style={styles.openAnnouncementText}>Ver animal</Text>
              <FontAwesome name="arrow-right" size={13} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      )}
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
  animalMarkerProcurando: {
    borderColor: '#f2c14e',
  },
  animalMarkerAdocao: {
    borderColor: '#1877f2',
  },
  clusterMarker: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#5791ca',
    shadowColor: '#29465e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  clusterMarkerText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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
  animalCard: {
    position: 'absolute',
    right: 12,
    bottom: 92,
    left: 12,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dce9f2',
    elevation: 8,
    shadowColor: '#29465e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
  },
  clusterCard: {
    position: 'absolute',
    right: 12,
    bottom: 92,
    left: 12,
    maxHeight: '48%',
    overflow: 'hidden',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dce9f2',
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#29465e',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
  },
  clusterCardHeader: {
    minHeight: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dce9f2',
  },
  clusterCardTitle: {
    color: '#29465e',
    fontSize: 14,
    fontWeight: '700',
  },
  clusterList: {
    flexGrow: 0,
  },
  clusterAnimal: {
    minHeight: 62,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#edf2f6',
  },
  clusterAnimalPhoto: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: '#e4f0f8',
  },
  clusterAnimalPhotoImage: {
    width: '100%',
    height: '100%',
  },
  clusterAnimalInfo: {
    flex: 1,
  },
  clusterAnimalName: {
    color: '#29465e',
    fontSize: 13,
    fontWeight: '700',
  },
  clusterAnimalType: {
    marginTop: 2,
    color: '#718ba2',
    fontSize: 11,
  },
  animalCardHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  animalCardAvatar: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#e4f0f8',
    overflow: 'hidden',
  },
  animalCardAvatarImage: {
    width: 34,
    height: 34,
  },
  animalCardHeaderText: {
    flex: 1,
  },
  animalCardName: {
    color: '#29465e',
    fontSize: 14,
    fontWeight: 'bold',
  },
  animalCardSubtitle: {
    color: '#718ba2',
    fontSize: 11,
  },
  closeAnimalCard: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#eef6fb',
  },
  animalCardPhoto: {
    width: '100%',
    height: 160,
    backgroundColor: '#cfe3f2',
  },
  animalCardPhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animalCardDetails: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 5,
  },
  animalCardStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    color: '#2d6a4f',
    backgroundColor: '#d8efe2',
    fontSize: 11,
    fontWeight: 'bold',
  },
  animalCardStatusProcurando: {
    color: '#815f0b',
    backgroundColor: '#fff1c7',
  },
  animalCardLocation: {
    color: '#526d83',
    fontSize: 11,
  },
  animalCardDescription: {
    color: '#526d83',
    fontSize: 11,
  },
  openAnnouncementButton: {
    minHeight: 40,
    marginTop: 3,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 20,
    backgroundColor: '#5791ca',
  },
  openAnnouncementText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
