import { useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import Pressable from './ButtonPressable';

export default function FotoAmpliavel({ uri, uris, style, resizeMode = 'cover', accessibilityLabel = 'Ampliar foto do anúncio' }) {
  const [visivel, setVisivel] = useState(false);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const fotos = Array.isArray(uris) && uris.length > 0 ? uris : uri ? [uri] : [];
  const fotoAtual = fotos[Math.min(indiceAtual, fotos.length - 1)];

  return (
    <>
      <View style={[style, styles.preview]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setVisivel(true)}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Image source={{ uri: fotoAtual }} style={StyleSheet.absoluteFill} resizeMode={resizeMode} />
          <View pointerEvents="none" style={styles.expandir}>
            <FontAwesome name="expand" size={15} color="#ffffff" />
          </View>
        </Pressable>
        {fotos.length > 1 && (
          <View style={styles.miniaturas}>
            {fotos.map((foto, indice) => (
              <Pressable
                key={`${indice}-${foto}`}
                style={[styles.miniatura, indice === indiceAtual && styles.miniaturaAtiva]}
                onPress={() => setIndiceAtual(indice)}
                accessibilityRole="button"
                accessibilityLabel={`Exibir foto ${indice + 1} de ${fotos.length}`}
              >
                <Image source={{ uri: foto }} style={styles.miniaturaImagem} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {visivel && (
        <Modal
          visible
          animationType="fade"
          onRequestClose={() => setVisivel(false)}
          statusBarTranslucent
        >
          <SafeAreaView style={styles.visualizador} edges={['top', 'bottom']}>
            <Image source={{ uri: fotoAtual }} style={styles.fotoTelaCheia} resizeMode="contain" />
            {fotos.length > 1 && (
              <View style={styles.miniaturasTelaCheia}>
                {fotos.map((foto, indice) => (
                  <Pressable
                    key={`${indice}-${foto}`}
                    style={[styles.miniatura, indice === indiceAtual && styles.miniaturaAtiva]}
                    onPress={() => setIndiceAtual(indice)}
                    accessibilityRole="button"
                    accessibilityLabel={`Exibir foto ${indice + 1} de ${fotos.length}`}
                  >
                    <Image source={{ uri: foto }} style={styles.miniaturaImagem} />
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              style={styles.fechar}
              onPress={() => setVisivel(false)}
              accessibilityRole="button"
              accessibilityLabel="Fechar foto ampliada"
            >
              <FontAwesome name="times" size={22} color="#ffffff" />
            </Pressable>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    position: 'relative',
    overflow: 'hidden',
  },
  expandir: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  miniaturas: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 6,
    padding: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  miniaturasTelaCheia: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 7,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
  },
  miniatura: {
    width: 38,
    height: 38,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  miniaturaAtiva: {
    borderColor: '#ffffff',
  },
  miniaturaImagem: {
    width: '100%',
    height: '100%',
  },
  visualizador: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  fotoTelaCheia: {
    width: '100%',
    height: '100%',
  },
  fechar: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
});
