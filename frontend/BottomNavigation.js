import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Pressable from './ButtonPressable';

const ITEMS = [
  { id: 'perdidos', icon: 'magnify', label: 'Perdidos', action: 'onLost' },
  { id: 'encontrados', icon: 'map-marker', label: 'Encontrados', action: 'onFound' },
  { id: 'chat', icon: 'chat-outline', label: 'Chat', action: 'onChat' },
  { id: 'adocao', icon: 'home-heart', label: 'Adoção', action: 'onAdoption' },
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
              <View style={styles.itemContent}>
                <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={item.id === 'encontrados' ? 34 : 30}
                    color={selected ? '#1677ed' : '#82a3c0'}
                  />
                  {item.id === 'encontrados' && (
                    <MaterialCommunityIcons
                      name="paw"
                      size={9}
                      color="#ffffff"
                      style={styles.pawOverlay}
                    />
                  )}
                </View>
                <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                  {item.label}
                </Text>
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
    marginBottom: 14,
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
  itemContent: {
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
  pawOverlay: {
    position: 'absolute',
    top: 12,
  },
  label: {
    maxWidth: '100%',
    color: '#82a3c0',
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  labelSelected: {
    color: '#1677ed',
    fontWeight: '600',
  },
});
