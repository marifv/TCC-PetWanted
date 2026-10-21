import { FontAwesome } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Pressable from './ButtonPressable';

const ITEMS = [
  { id: 'perdidos', icon: 'search', label: 'Animais perdidos', action: 'onLost' },
  { id: 'encontrados', icon: 'paw', label: 'Animais encontrados', action: 'onFound' },
  { id: 'chat', icon: 'comment-o', label: 'Chat', action: 'onChat' },
  { id: 'adocao', icon: 'heart-o', label: 'Adoção', action: 'onAdoption' },
];

export default function BottomNavigation({
  active,
  onMap,
  onLost,
  onFound,
  onChat,
  onAdoption,
  containerStyle,
}) {
  const handlers = { onMap, onLost, onFound, onChat, onAdoption };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const selected = active === item.id;
          const onPress = handlers[item.action];

          return (
            <Pressable
              key={item.id}
              style={styles.item}
              onPress={onPress}
              disabled={!onPress}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
            >
              <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
                <FontAwesome
                  name={item.icon}
                  size={20}
                  color={selected ? '#4e8bc6' : '#91a8bc'}
                />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 82,
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: 'center',
  },
  bar: {
    height: 64,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    shadowColor: '#476f91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 7,
  },
  item: {
    flex: 1,
    height: 64,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconContainerSelected: {
    backgroundColor: '#eaf3fa',
  },
});
