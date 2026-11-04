import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Pressable from './ButtonPressable';
import { registrarPermissaoNegada } from './services/permissionNotifications';

const MAX_FOTOS = 3;

export default function SeletorFotos({ fotos = [], onChange }) {
  const [carregando, setCarregando] = useState(false);

  const selecionarFotos = async () => {
    const disponiveis = MAX_FOTOS - fotos.length;
    if (disponiveis <= 0 || carregando) return;

    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      await registrarPermissaoNegada('photos');
      return;
    }

    setCarregando(true);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: disponiveis,
        quality: 0.65,
        base64: true,
      });
      if (resultado.canceled) return;

      const novasFotos = (resultado.assets || [])
        .filter((arquivo) => arquivo.base64)
        .map((arquivo) => `data:${arquivo.mimeType || 'image/jpeg'};base64,${arquivo.base64}`);

      if (novasFotos.length === 0) {
        Alert.alert('Erro', 'Não foi possível carregar as fotos selecionadas. Tente novamente.');
        return;
      }

      onChange([...fotos, ...novasFotos].slice(0, MAX_FOTOS));
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível abrir a galeria de fotos.');
    } finally {
      setCarregando(false);
    }
  };

  const removerFoto = (indiceRemover) => {
    onChange(fotos.filter((_, indice) => indice !== indiceRemover));
  };

  return (
    <View style={styles.container}>
      <View style={styles.galeria}>
        {fotos.map((uri, indice) => (
          <View key={`${indice}-${uri.slice(0, 40)}`} style={styles.fotoContainer}>
            <Image source={{ uri }} style={styles.foto} resizeMode="cover" />
            <Pressable
              style={styles.remover}
              onPress={() => removerFoto(indice)}
              accessibilityRole="button"
              accessibilityLabel={`Remover foto ${indice + 1}`}
            >
              <FontAwesome name="times" size={13} color="#ffffff" />
            </Pressable>
          </View>
        ))}
        {fotos.length < MAX_FOTOS && (
          <Pressable
            style={styles.adicionar}
            onPress={selecionarFotos}
            disabled={carregando}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar fotos. ${fotos.length} de ${MAX_FOTOS} selecionadas`}
          >
            {carregando ? (
              <ActivityIndicator color="#527f9f" />
            ) : (
              <>
                <FontAwesome name="plus" size={18} color="#527f9f" />
                <Text style={styles.adicionarTexto}>{fotos.length}/{MAX_FOTOS}</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    marginBottom: 18,
  },
  galeria: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fotoContainer: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eaf2f7',
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  remover: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  adicionar: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9eb6c5',
    borderRadius: 10,
    backgroundColor: '#f5f9fb',
  },
  adicionarTexto: {
    color: '#527f9f',
    fontSize: 12,
    fontWeight: '600',
  },
});
