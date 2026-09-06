import { StatusBar } from 'expo-status-bar';
import { Image, Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useState } from 'react';

export default function Homepage({ setTelaAtual, abrirAnimalPerdido, abrirAnimalEncontrado, abrirChat, abrirAdocao }) {
	const [opcaoSelecionada, setOpcaoSelecionada] = useState('');

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />
			<View style={styles.header}>
				<View style={styles.petWanted}>
					<Image source={require('./assets/dog2.jpg')} style={styles.logo} />
					<Text style={styles.appName}>PetWanted</Text>
				</View>
				<View style={styles.headerActions}>
					<FontAwesome name="bell" size={20} color="#555" />
					<Pressable onPress={setTelaAtual}>
						<View style={styles.avatar}>
							<Text style={styles.avatarText}>U</Text>
						</View>
					</Pressable>
				</View>
			</View>

			<View style={styles.content}>
				<Text style={styles.title}>Encontre seu pet</Text>
				<Text style={styles.subtitle}>Veja pedidos de ajuda perto de voce.</Text>
			</View>

			<View style={styles.footer}>
				<Pressable
					style={[styles.footerItem, opcaoSelecionada === 'Perdido' && styles.selectedItem]}
					onPress={() => {
						setOpcaoSelecionada('Perdido');
						abrirAnimalPerdido?.();
					}}
				>
					<FontAwesome name="search" size={20} color={opcaoSelecionada === 'Perdido' ? '#6b6b6b' : '#6b6b6b'} />
					<Text style={styles.footerText}>Perdido</Text>
				</Pressable>

				<Pressable
					style={[styles.footerItem, opcaoSelecionada === 'Encontrado' && styles.selectedItem]}
					onPress={() => {
						setOpcaoSelecionada('Encontrado');
						abrirAnimalEncontrado?.();
					}}
				>
					<FontAwesome name="paw" size={20} color={opcaoSelecionada === 'Encontrado' ? '#6b6b6b' : '#6b6b6b'} />
					<Text style={styles.footerText}>Encontrado</Text>
				</Pressable>

				<Pressable
					style={[styles.footerItem, opcaoSelecionada === 'Chat' && styles.selectedItem]}
					onPress={() => setOpcaoSelecionada('Chat')}
				>
					<FontAwesome name="comment-o" size={20} color={opcaoSelecionada === 'Chat' ? '#6b6b6b' : '#6b6b6b'} />
					<Text style={styles.footerText}>Chat</Text>
				</Pressable>

				<Pressable
					style={[styles.adoptionFooterItem, opcaoSelecionada === 'Adoção' && styles.selectedItem]}
					onPress={() => {
						setOpcaoSelecionada('Adoção');
						abrirAdocao?.();
					}}
				>
					<FontAwesome name="heart" size={20} color={opcaoSelecionada === 'Adoção' ? '#6b6b6b' : '#6b6b6b'} />
					<Text style={styles.footerText}>Adoção</Text>
				</Pressable>
			</View>
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
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#e1e1e1',
	},

	petWanted: { 
		flexDirection: 'row', 
		alignItems: 'center' 
	},
	logo: { 
		width: 34, 
		height: 34, 
		marginRight: 8, 
		borderRadius: 17 
	},

	appName: { fontSize: 15, 
		fontWeight: 'bold', 
		color: '#292929' 
	},

	headerActions: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		gap: 14 
	},

	avatar: {
		width: 30,
		height: 30,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#45a9d5',
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
		backgroundColor: '#f2f2f2'
	},
	title: { 
		fontSize: 24, 
		fontWeight: 'bold', 
		color: '#292929', 
		marginBottom: 8 },
	subtitle: { 
		fontSize: 16, 
		color: '#666666' },
	footer: {
		height: 76,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#ffffff',
	},
	footerItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderLeftWidth: 1,
	},
	adoptionFooterItem: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		borderLeftWidth: 1,
		borderRightWidth: 1,
	},

	selectedItem: {
		backgroundColor: '#5ecfff',
	},

	footerText: { 
		marginTop: 4, 
		fontSize: 10, 
		color: '#6b6b6b' 
	},
});