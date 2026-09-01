import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function Homepage({ setTelaAtual, telaAtual }) {
	return (
		<View style={styles.container}>
			<StatusBar style="dark" />
			<View style={styles.header}>
				<View style={styles.petWanted}>
					<Image source={require('./assets/dog2.jpg')} style={styles.logo} />
					<Text style={styles.appName}>PetWanted</Text>
				</View>
				<View style={styles.acoesHeader}>
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

			<View style={styles.rodape}>
				<View style={styles.itemRodape}>
					<FontAwesome name="search" size={20} color="#6b6b6b" />
							<Text style={styles.textoRodape}>Perdido</Text>
				</View>
				<View style={styles.itemRodape}>
					<FontAwesome name="paw" size={20} color="#6b6b6b" />
					<Text style={styles.textoRodape}>Encontrado</Text>
				</View>
				<View style={styles.itemRodape}>
					<FontAwesome name="comment-o" size={20} color="#6b6b6b" />
					<Text style={styles.textoRodape}>Chat</Text>
				</View>
				<View style={styles.itemRodape}>
					<FontAwesome name="heart" size={20} color="#6b6b6b" />
					<Text style={styles.textoRodape}>Adoção</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#ffffff',
	},
	header: {
		height: 58,
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
		alignItems: 'center',
	},
	logo: {
		width: 34,
		height: 34,
		marginRight: 8,
		borderRadius: 17,
	},
	appName: {
		fontSize: 15,
		fontWeight: 'bold',
		color: '#292929',
	},
	acoesHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
	},
	bell: {
		fontSize: 12,
		color: '#555555',
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
		color: '#ffffff',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f2f2f2',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		color: '#292929',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: '#666666',
	},
	rodape: {
		height: 64,
		paddingHorizontal: 10,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-around',
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#dddddd',
	},
	itemRodape: {
		width: 70,
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconeRodape: {
		fontSize: 20,
		lineHeight: 24,
		color: '#6b6b6b',
	},
	textoRodape: {
		fontSize: 10,
		color: '#6b6b6b',
	},
	botao: {
		width: 280,
		height: 52,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#7a4b2a',
		borderRadius: 8,
	},
	textoBotao: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: 'bold',
	},
});
