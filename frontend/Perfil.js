import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function Perfil({ onVoltar, setTelaEdicao }) {
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

                <View style={styles.acoesHeader}>
                    <FontAwesome name="bell" size={20} color="#555" />
                </View>

                <View style={styles.headerRight}>
                    <Pressable onPress={setTelaEdicao}>
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

                <View style={styles.cardInfo}>
                    <FontAwesome name="phone" size={20} color="#45a9d5" />

                    <View>
                        <Text style={styles.label}>Telefone</Text>
                        <Text style={styles.valor}>Seu telefone</Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="map-marker" size={20} color="#45a9d5" />

                    <View>
                        <Text style={styles.label}>Localização</Text>
                        <Text style={styles.valor}>Sua localização</Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="id-card" size={20} color="#45a9d5" />

                    <View>
                        <Text style={styles.label}>CPF</Text>
                        <Text style={styles.valor}>CPF</Text>
                    </View>
                </View>
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
    acoesHeader: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    conteudo: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#f8b385',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    textoAvatar: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#fff',
    },
    nome: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#292929',
        marginBottom: 5,
    },
    email: {
        fontSize: 14,
        color: '#888888',
        marginBottom: 28,
    },
    cardInfo: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eeeeee',
        gap: 14,
    },
    label: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 3,
    },
    valor: {
        fontSize: 15,
        color: '#292929',
        fontWeight: '500',
    },
});
