import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function EdicaoPerfil({ onVoltar }) {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.cabecalho}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={onVoltar}>
                        <FontAwesome name="arrow-left" size={24} color="#292929" />
                    </Pressable>
                </View>

                <Text style={styles.titulo}>Editar Perfil</Text>

                <View style={styles.headerRight}>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.conteudo}>
                <View style={styles.avatar}>
                    <Text style={styles.textoAvatar}>U</Text>
                </View>

                <Text style={styles.nome}>Seu Nome</Text>

                <Pressable
                    style={styles.info}
                    onPress={() => Alert.alert('E-mail', 'O e-mail não pode ser modificado.')}
                >
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>E-mail</Text>
                        <Text style={styles.valor}>seu.email@exemplo.com</Text>
                    </View>

                    <FontAwesome name="lock" size={16} color="#999999" />
                </Pressable>

                <Pressable
                    style={styles.info}
                    onPress={() => Alert.alert('CPF', 'O CPF não pode ser modificado.')}
                >
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>CPF</Text>
                        <Text style={styles.valor}>CPF</Text>
                    </View>

                    <FontAwesome name="lock" size={16} color="#999999" />
                </Pressable>

                <View style={styles.info}>
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>Telefone</Text>
                        <TextInput
                            style={styles.valorInput}
                            placeholder="Digite seu telefone"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.info}>
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>Localização</Text>
                        <TextInput
                            style={styles.valorInput}
                            placeholder="Digite sua localização"
                            placeholderTextColor="#999"
                        />
                    </View>
                </View>

                <Pressable style={styles.botaoSalvar}>
                    <Text style={styles.textoBotaoSalvar}>Salvar alterações</Text>
                </Pressable>
            </ScrollView>
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
        paddingHorizontal: 30,
        paddingTop: 30,
        paddingBottom: 30,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f8b385',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 10,
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
        textAlign: 'center',
        marginBottom: 25,
    },
    info: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 6,
        marginBottom: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#eeeeee',
    },
    infoTexto: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#999999',
        marginBottom: 3,
    },
    valor: {
        fontSize: 15,
        color: '#292929',
    },
    valorInput: {
        fontSize: 15,
        color: '#292929',
        padding: 0,
        margin: 0,
    },
    botaoSalvar: {
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7a4b2a',
        borderRadius: 6,
        marginTop: 10,
    },
    textoBotaoSalvar: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});