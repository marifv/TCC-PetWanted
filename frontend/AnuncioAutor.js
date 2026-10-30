import { Image, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Pressable from './ButtonPressable';

function iniciais(nome = '') {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase() || '?';
}

export default function AnuncioAutor({ animal, nomeUsuario, fotoUsuario, onIniciarChat }) {
  const nome = animal.usuario_nome || (animal.meuAnimal ? nomeUsuario : null) || 'Usuário';
  const foto = animal.usuario_foto || (animal.meuAnimal ? fotoUsuario : null);
  const rotulo = animal.tipo_registro === 'Perdido'
    ? 'Perdido por'
    : animal.tipo_registro === 'Encontrado'
      ? 'Encontrado por'
      : 'Anunciado por';

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitials}>{iniciais(nome)}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.label}>{rotulo}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{nome}</Text>
          {animal.usuario_tipo_perfil === 'ONG' ? <Text style={styles.ong}>ONG</Text> : null}
        </View>
      </View>
      {!animal.meuAnimal && onIniciarChat ? (
        <Pressable
          style={styles.chatButton}
          onPress={() => onIniciarChat(animal)}
          accessibilityLabel={`Conversar com ${nome} sobre o anúncio`}
        >
          <FontAwesome name="commenting-o" size={15} color="#ffffff" />
          <Text style={styles.chatButtonText}>Conversar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 54, marginTop: 13, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5edf4' },
  avatar: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 18, backgroundColor: '#80add7' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  info: { flex: 1, minWidth: 0 },
  label: { color: '#8296a8', fontSize: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  name: { flexShrink: 1, color: '#365a78', fontSize: 12, fontWeight: '700' },
  ong: { paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden', borderRadius: 7, color: '#3d7c65', backgroundColor: '#e0f2e9', fontSize: 9, fontWeight: '700' },
  chatButton: { minHeight: 36, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 18, backgroundColor: '#5791ca' },
  chatButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
});