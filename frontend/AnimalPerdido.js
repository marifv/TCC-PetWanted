import { StatusBar } from 'expo-status-bar';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function AnimalPerdido({ onVoltar, setTelaAtual, abrirAnimalEncontrado, abrirChat, abrirAdocao }) {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />

            <View style={styles.cabecalho}>
                <Pressable onPress={onVoltar}>
                    <FontAwesome name="arrow-left" size={24} color="#292929" />
                </Pressable>

                <Text style={styles.titulo}>Animal Perdido</Text>

                <View style={styles.acoesHeader}>
                    <FontAwesome name="bell" size={20} color="#555" />

                    <Pressable onPress={setTelaAtual}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>U</Text>
                        </View>
                    </Pressable>
                </View>
            </View>

            <View style={styles.conteudo}>
                <Text style={styles.texto}>
                    Tela de Animal Perdido
                </Text>
            </View>

            <View style={styles.rodape}>
                <View style={[styles.itemRodape, styles.itemSelecionado]}>
                    <FontAwesome name="search" size={20} color="#fff" />
                    <Text style={styles.textoRodape}>Perdido</Text>
                </View>

                <Pressable
                    style={styles.itemRodape}
                    onPress={abrirAnimalEncontrado}
                >
                    <FontAwesome name="paw" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Encontrado</Text>
                </Pressable>

                <View style={styles.itemRodape}>
                    <FontAwesome name="comment-o" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Chat</Text>
                </View>

                <View style={styles.itemRodapeAdocao}>
                    <FontAwesome name="heart" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Adoção</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
    },

    cabecalho: {
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

    titulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
    },

    acoesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
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

    conteudo: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    texto: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#292929',
    },

    rodape: {
        height: 76,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#ffffff',
    },

    itemRodape: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
    },

    itemRodapeAdocao: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
    },

    itemSelecionado: {
        backgroundColor: '#5ecfff',
    },

    textoRodape: {
        marginTop: 4,
        fontSize: 10,
        color: '#6b6b6b',
    },
});