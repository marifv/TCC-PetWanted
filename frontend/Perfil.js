import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function Perfil({ onVoltar }) {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <View style={styles.cabecalho}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={onVoltar}>
                        <FontAwesome name="arrow-left" size={24} color="#292929" />
                    </Pressable>
                </View>

                <Text style={styles.titulo}>Meu Perfil</Text>

                <View style={styles.headerRight}>
                    <Pressable>
                        <FontAwesome name="pencil" size={22} color="#292929" />
                    </Pressable>
                </View>
            </View>
            <View style={styles.conteudo}>
                <View style={styles.avatar}>
                    <Text style={styles.textoAvatar}>U</Text>
                </View>
                <Text style={styles.nome}>Seu Nome</Text>
                <Text style={styles.email}>seu.email@exemplo.com</Text>
                <Text style={styles.telefone}>Telefone</Text>
                <Text style={styles.localizacao}>Sua Localização</Text>
                <Text style={styles.cpf}>CPF</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },
    cabecalho: {
        height: 58,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e1e1e1',
    },
    headerLeft: {
        width: 40,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerRight: {
        width: 40,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    titulo: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
        textAlign: 'center',
    },
    conteudo: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f8b385',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    textoAvatar: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },
    nome: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 8,
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
	localizacao: {
        fontSize: 14,
        color: '#666',
    },
	cpf: {
        fontSize: 14,
        color: '#666',
    },
	telefone: {
        fontSize: 14,
        color: '#666',
    },
});