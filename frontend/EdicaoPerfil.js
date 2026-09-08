import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, Pressable, TextInput, Modal, ScrollView, Image } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function EdicaoPerfil({ onVoltar, nome, tipoPerfil, email, documento, telefone, localizacao, fotoPerfil, onSalvar }) {
    const [novoNome, setNovoNome] = useState(nome || '');
    const [novoTipoPerfil, setNovoTipoPerfil] = useState(tipoPerfil || '');
    const [novoTelefone, setNovoTelefone] = useState(telefone || '');
    const [novaLocalizacao, setNovaLocalizacao] = useState(localizacao || '');
    const [novaFotoPerfil, setNovaFotoPerfil] = useState(fotoPerfil || null);
    const [modalVisivel, setModalVisivel] = useState(false);
    const [modalTitulo, setModalTitulo] = useState('');
    const [modalMensagem, setModalMensagem] = useState('');
    const [confirmacaoSalvarVisivel, setConfirmacaoSalvarVisivel] = useState(false);

    const mostrarModal = (titulo, mensagem) => {
        setModalTitulo(titulo);
        setModalMensagem(mensagem);
        setModalVisivel(true);
    };

    const escolherFoto = async () => {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
            mostrarModal(
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
            mostrarModal('Atenção', 'Digite um nome para o perfil.');
            return;
        }

        if (!novoTipoPerfil) {
            mostrarModal('Atenção', 'Selecione o tipo de perfil.');
            return;
        }

        if (!novoTelefone.trim()) {
            mostrarModal('Atenção', 'Digite um telefone para o perfil.');
            return;
        }

        if (!novaLocalizacao.trim()) {
            mostrarModal('Atenção', 'Digite uma localização para o perfil.');
            return;
        }

        setConfirmacaoSalvarVisivel(true);
    };

    const confirmarSalvar = () => {
        setConfirmacaoSalvarVisivel(false);
        onSalvar(novoNome.trim(), novoTipoPerfil, novoTelefone.trim(), novaLocalizacao.trim(), novaFotoPerfil);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={onVoltar}>
                        <FontAwesome name="arrow-left" size={24} color="#292929" />
                    </Pressable>
                </View>

                <Text style={styles.title}>Editar Perfil</Text>

                <View style={styles.headerRight}>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Pressable style={styles.avatar} onPress={escolherFoto}>
                    {novaFotoPerfil ? (
                        <Image
                            source={{ uri: novaFotoPerfil }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <Text style={styles.avatarText}>
                            {novoNome ? novoNome.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    )}
                </Pressable>

                <Text style={styles.changePhotoText}>
                    Toque na foto para alterar
                </Text>

                <Text style={styles.name}>
                    {novoNome || 'Seu Nome'}
                </Text>

                <Text style={styles.primaryLabel}>Nome</Text>

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

                <Pressable
                    style={styles.info}
                    onPress={() => mostrarModal('E-mail', 'O e-mail não pode ser modificado.')}
                >
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>E-mail</Text>
                        <Text style={styles.valor}>{email || 'E-mail não informado'}</Text>
                    </View>

                    <FontAwesome name="lock" size={16} color="#999999" />
                </Pressable>

                <Pressable
                    style={styles.info}
                    onPress={() => mostrarModal('Documento', 'O CPF/CNPJ não pode ser modificado.')}
                >
                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>
                            {novoTipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}
                        </Text>

                        <Text style={styles.valor}>
                            {documento || 'Documento não informado'}
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
                            value={novoTelefone}
                            onChangeText={setNovoTelefone}
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
                            value={novaLocalizacao}
                            onChangeText={setNovaLocalizacao}
                        />
                    </View>
                </View>

                <Pressable
                    style={styles.saveButton}
                    onPress={salvarAlteracoes}
                >
                    <Text style={styles.saveButtonText}>Salvar alterações</Text>
                </Pressable>
            </ScrollView>

            <Modal
                visible={modalVisivel}
                transparent
                animationType="fade"
                onRequestClose={() => setModalVisivel(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitulo}>{modalTitulo}</Text>
                        <Text style={styles.modalMensagem}>{modalMensagem}</Text>

                        <Pressable
                            style={styles.modalButton}
                            onPress={() => setModalVisivel(false)}
                        >
                            <Text style={styles.modalButtonText}>OK</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fafafa',
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

    title: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
        textAlign: 'center',
    },

    content: {
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

    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },

    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },

    changePhotoText: {
        fontSize: 12,
        color: '#888888',
        textAlign: 'center',
        marginBottom: 10,
    },

    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
        marginBottom: 25,
    },

    primaryLabel: {
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

    profileTypeContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },

    profileTypeButton: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d5b39b',
        borderRadius: 6,
    },

    selectedProfileType: {
        backgroundColor: '#7a4b2a',
        borderColor: '#7a4b2a',
    },

    profileTypeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7a4b2a',
    },

    selectedProfileTypeText: {
        color: '#ffffff',
    },

    modalOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    modalContainer: {
        width: '100%',
        maxWidth: 360,
        padding: 22,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },

    modalTitulo: {
        marginBottom: 8,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
    },

    modalMensagem: {
        marginBottom: 20,
        fontSize: 15,
        lineHeight: 21,
        color: '#555555',
    },

    modalButton: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 42,
        backgroundColor: '#7a4b2a',
        borderRadius: 6,
    },

    modalButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    saveButton: {
        height: 46,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7a4b2a',
        borderRadius: 6,
        marginTop: 10,
    },

    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});