import { StatusBar } from 'expo-status-bar';
import { Image, Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import MapaPet from './MapaPet';
import BottomNavigation from './BottomNavigation';
import Pressable from './ButtonPressable';

export default function Homepage({ setTelaAtual, abrirAnimalPerdido, abrirAnimalEncontrado, abrirChat, abrirAdocao, usuarioId, token, onSalvarLocalizacao, fotoPerfil, nome }) {
	const letraPerfil = nome ? nome.charAt(0).toUpperCase() : 'U';

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />
			<View style={styles.header}>
				<View style={styles.petWanted}>
					<View style={styles.logoBadge}>
						<FontAwesome name="paw" size={18} color="#4e8bc6" />
					</View>
					<Text style={styles.appName}>PetWanted</Text>
				</View>
				<View style={styles.headerActions}>
					<Pressable style={styles.headerIconButton} accessibilityLabel="Notificações">
						<FontAwesome name="bell-o" size={16} color="#6887a4" />
					</Pressable>
					<Pressable style={styles.profileButton} onPress={setTelaAtual} accessibilityLabel="Abrir perfil">
						<View style={styles.avatar}>
							{fotoPerfil ? (
								<Image source={{ uri: fotoPerfil }} style={styles.profileImage} />
							) : (
								<Text style={styles.avatarText}>{letraPerfil}</Text>
							)}
						</View>
					</Pressable>
				</View>
			</View>

			<View style={[styles.content, styles.contentMapa]}>
				<MapaPet
					usuarioId={usuarioId}
					token={token}
					onSalvarLocalizacao={onSalvarLocalizacao}
				/>
			</View>

			<BottomNavigation
				active="mapa"
				onLost={abrirAnimalPerdido}
				onFound={abrirAnimalEncontrado}
				onChat={abrirChat}
				onAdoption={abrirAdocao}
				containerStyle={styles.footer}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#ffffff'
	},

	header: {
		height: Platform.OS === 'android' ? 58 + (NativeStatusBar.currentHeight || 0) : 58,
		paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0,
		paddingHorizontal: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#dcecf9',
	},

	petWanted: { 
		flexDirection: 'row', 
		alignItems: 'center' 
	},
	logoBadge: {
		width: 32,
		height: 32,
		marginRight: 8,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 16,
		elevation: 2,
	},

	appName: { fontSize: 15,
		fontWeight: 'bold',
		color: '#315f8b'
	},

	headerActions: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		gap: 10,
	},

	headerIconButton: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#ffffff',
		borderRadius: 8,
	},

	profileButton: {
		width: 44,
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},

	avatar: {
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#5791ca',
		borderRadius: 15,
		overflow: 'hidden',
	},
	profileImage: {
		width: 30,
		height: 30,
		borderRadius: 15,
	},
	avatarText: { 
		fontSize: 15, 
		fontWeight: 'bold', 
		color: '#ffffff' },
	content: { 
		flex: 1, 
		alignItems: 'center', 
		justifyContent: 'center', 
		backgroundColor: '#f2f2f2',
		width: '100%',
	},
	contentMapa: {
		alignItems: 'stretch',
		justifyContent: 'flex-start',
	},
	footer: {
		position: 'absolute',
		right: 0,
		bottom: 4,
		left: 0,
		zIndex: 5,
	},
});