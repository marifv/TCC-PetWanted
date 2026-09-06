import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, Pressable, TextInput, Alert, ScrollView, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function EdicaoPerfil({ onVoltar, nome, tipoPerfil, fotoPerfil, onSalvar }) {
    const [novoNome, setNovoNome] = useState(nome || '');
    const [novoTipoPerfil, setNovoTipoPerfil] = useState(tipoPerfil || '');
    const [novaFotoPerfil, setNovaFotoPerfil] = useState(fotoPerfil || null);

    const escolherFoto = async () => {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
            Alert.alert(
                'Permissão necessária',
                'Precisamos de acesso à sua galeria para escolher uma foto.'
            );
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!resultado.canceled) {
            setNovaFotoPerfil(resultado.assets[0].uri);
        }
    };

    const salvarAlteracoes = () => {
        if (!novoNome.trim()) {
            Alert.alert('Atenção', 'Digite um nome para o perfil.');
            return;
        }

        if (!novoTipoPerfil) {
            Alert.alert('Atenção', 'Selecione o tipo de perfil.');
            return;
        }

        onSalvar(novoNome.trim(), novoTipoPerfil, novaFotoPerfil);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />

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
                <Pressable style={styles.avatar} onPress={escolherFoto}>
                    {novaFotoPerfil ? (
                        <Image
                            source={{ uri: novaFotoPerfil }}
                            style={styles.imagemPerfil}
                        />
                    ) : (
                        <Text style={styles.textoAvatar}>
                            {novoNome ? novoNome.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    )}
                </Pressable>

                <Text style={styles.textoTrocarFoto}>
                    Toque na foto para alterar
                </Text>

                <Text style={styles.nome}>
                    {novoNome || 'Seu Nome'}
                </Text>

                <Text style={styles.labelPrincipal}>Nome</Text>

                <View style={styles.info}>
                    <View style={styles.infoTexto}>
                        <TextInput
                            style={styles.valorInput}
                            placeholder="Digite seu nome"
                            placeholderTextColor="#999"
                            value={novoNome}
                            onChangeText={setNovoNome}
                        />
                    </View>
                </View>

                <Text style={styles.labelPrincipal}>Tipo de perfil</Text>

                <View style={styles.tipoPerfilContainer}>
                    <Pressable
                        style={[styles.tipoPerfilButton, novoTipoPerfil === 'Tutor' && styles.tipoPerfilSelecionado]}
                        onPress={() => setNovoTipoPerfil('Tutor')}
                    >
                        <Text style={[styles.tipoPerfilTexto, novoTipoPerfil === 'Tutor' && styles.tipoPerfilTextoSelecionado]}>
                            Tutor
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.tipoPerfilButton, novoTipoPerfil === 'ONG' && styles.tipoPerfilSelecionado]}
                        onPress={() => setNovoTipoPerfil('ONG')}
                    >
                        <Text style={[styles.tipoPerfilTexto, novoTipoPerfil === 'ONG' && styles.tipoPerfilTextoSelecionado]}>
                            ONG
                        </Text>
                    </Pressable>
                </View>

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
                    onPress={() => Alert.alert('Documento', 'O CPF/CNPJ não pode ser modificado.')}
                >
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>
                            {novoTipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}
                        </Text>

                        <Text style={styles.valor}>
                            {novoTipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}
                        </Text>
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

                <Pressable
                    style={styles.botaoSalvar}
                    onPress={salvarAlteracoes}
                >
                    <Text style={styles.textoBotaoSalvar}>Salvar alterações</Text>
                </Pressable>
            </ScrollView>
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
        marginBottom: 6,
        overflow: 'hidden',
    },

    imagemPerfil: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },

    textoAvatar: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },

    textoTrocarFoto: {
        fontSize: 12,
        color: '#888888',
        textAlign: 'center',
        marginBottom: 10,
    },

    nome: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: 25,
    },

    labelPrincipal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#292929',
        marginBottom: 8,
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
        padding: 6,
        margin: 0,
    },

    tipoPerfilContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },

    tipoPerfilButton: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d5b39b',
        borderRadius: 6,
    },

    tipoPerfilSelecionado: {
        backgroundColor: '#7a4b2a',
        borderColor: '#7a4b2a',
    },

    tipoPerfilTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7a4b2a',
    },

    tipoPerfilTextoSelecionado: {
        color: '#ffffff',
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