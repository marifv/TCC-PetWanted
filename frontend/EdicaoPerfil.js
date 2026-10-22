import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Platform, StatusBar as NativeStatusBar, StyleSheet, Text, View, TextInput, Modal, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Pressable from './ButtonPressable';
import GooglePlacesInput from './GooglePlacesInput';

export default function EdicaoPerfil({ onVoltar, nome, tipoPerfil, email, documento, telefone, localizacao, fotoPerfil, token, onSalvar }) {
    const [novoNome, setNovoNome] = useState(nome || '');
    const [novoTipoPerfil, setNovoTipoPerfil] = useState(tipoPerfil || '');
    const [novoTelefone, setNovoTelefone] = useState(telefone || '');
    const [novaLocalizacao, setNovaLocalizacao] = useState(localizacao || '');
    const [coordenadasLocalizacao, setCoordenadasLocalizacao] = useState(null);
    const [novaFotoPerfil, setNovaFotoPerfil] = useState(fotoPerfil || null);
    const [modalVisivel, setModalVisivel] = useState(false);
    const [modalTitulo, setModalTitulo] = useState('');
    const [modalMensagem, setModalMensagem] = useState('');
    const [confirmacaoSalvarVisivel, setConfirmacaoSalvarVisivel] = useState(false);

    const mostrarModal = (titulo, mensagem) => {
        Alert.alert(titulo, mensagem, [{ text: 'OK' }]);
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
            quality: 0.8,
            base64: true,
        });

        if (!resultado.canceled) {
            const arquivo = resultado.assets[0];
            const extensao = arquivo.mimeType?.split('/')?.[1] || 'jpeg';
            setNovaFotoPerfil(`data:image/${extensao};base64,${arquivo.base64}`);
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
        onSalvar(
            novoNome.trim(),
            novoTipoPerfil,
            novoTelefone.trim(),
            novaLocalizacao.trim(),
            novaFotoPerfil,
            coordenadasLocalizacao
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#dcecf9" />

            <View style={styles.header}>
                <Pressable style={styles.headerBackButton} onPress={onVoltar} accessibilityLabel="Voltar">
                    <FontAwesome name="arrow-left" size={16} color="#4e718f" />
                </Pressable>
                <Text style={styles.title}>Editar perfil</Text>
                <View style={styles.headerPlaceholder} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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

                <View style={styles.formCard}>
                    <View style={styles.info}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="user-o" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Nome</Text>
                            <TextInput
                                style={styles.valorInput}
                                placeholder="Digite seu nome"
                                placeholderTextColor="#8ca8c0"
                                value={novoNome}
                                onChangeText={setNovoNome}
                            />
                        </View>
                    </View>

                    <Pressable
                        style={styles.info}
                        onPress={() => mostrarModal('E-mail', 'O e-mail não pode ser modificado.')}
                    >
                        <View style={styles.infoIcon}>
                            <FontAwesome name="envelope-o" size={15} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>E-mail</Text>
                            <Text style={styles.valor}>{email || 'E-mail não informado'}</Text>
                        </View>
                        <FontAwesome name="lock" size={15} color="#9ab2c7" />
                    </Pressable>
                    <Pressable
                        style={styles.info}
                        onPress={() => mostrarModal('Documento', 'O CPF/CNPJ não pode ser modificado.')}
                    >
                        <View style={styles.infoIcon}>
                            <FontAwesome name="id-card-o" size={15} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>{novoTipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}</Text>
                            <Text style={styles.valor}>{documento || 'Documento não informado'}</Text>
                        </View>
                        <FontAwesome name="lock" size={15} color="#9ab2c7" />
                    </Pressable>
                    <View style={styles.info}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="phone" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Telefone</Text>
                            <TextInput
                                style={styles.valorInput}
                                placeholder="Digite seu telefone"
                                placeholderTextColor="#8ca8c0"
                                keyboardType="phone-pad"
                                value={novoTelefone}
                                onChangeText={setNovoTelefone}
                            />
                        </View>
                    </View>
                    <View style={[styles.info, styles.infoLast]}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="map-marker" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Localização</Text>
                            <GooglePlacesInput
                                style={styles.valorInput}
                                placeholder="Busque seu endereço"
                                value={novaLocalizacao}
                                onChangeText={(valor) => {
                                    setNovaLocalizacao(valor);
                                    setCoordenadasLocalizacao(null);
                                }}
                                onLocationSelected={setCoordenadasLocalizacao}
                                token={token}
                            />
                        </View>
                    </View>
                </View>

                <Pressable style={styles.saveButton} onPress={salvarAlteracoes}>
                    <Text style={styles.saveButtonText}>Salvar alterações</Text>
                </Pressable>
            </ScrollView>

            <Modal
                visible={confirmacaoSalvarVisivel}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmacaoSalvarVisivel(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitulo}>Salvar alterações</Text>
                        <Text style={styles.modalMensagem}>
                            Deseja salvar as alterações do seu perfil?
                        </Text>

                        <View style={styles.confirmacaoAcoes}>
                            <Pressable
                                style={styles.modalCancelar}
                                onPress={() => setConfirmacaoSalvarVisivel(false)}
                            >
                                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                style={styles.modalButton}
                                onPress={confirmarSalvar}
                            >
                                <Text style={styles.modalButtonText}>Confirmar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

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
        backgroundColor: '#eaf4fc',
    },

    header: {
        height: Platform.OS === 'android' ? 58 + (NativeStatusBar.currentHeight || 0) : 58,
        paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#dcecf9',
    },

    headerBackButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerPlaceholder: {
        width: 44,
        height: 44,
    },

    title: {
        flex: 1,
        fontSize: 17,
        fontWeight: 'bold',
        color: '#365d7d',
        textAlign: 'center',
    },

    scroll: {
        flex: 1,
    },

    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
    },

    avatar: {
        width: 92,
        height: 92,
        borderRadius: 46,
        borderWidth: 3,
        borderColor: '#ffffff',
        backgroundColor: '#5791ca',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#477499',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },

    profileImage: {
        width: 86,
        height: 86,
        borderRadius: 43,
    },

    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },

    changePhotoText: {
        fontSize: 12,
        color: '#6c879e',
        textAlign: 'center',
        marginTop: 9,
        marginBottom: 5,
    },

    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#365d7d',
        textAlign: 'center',
        marginBottom: 17,
    },

    formCard: {
        width: '100%',
        paddingHorizontal: 14,
        paddingVertical: 4,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        shadowColor: '#477499',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },

    info: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 58,
        gap: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#edf3f8',
    },

    infoLast: {
        borderBottomWidth: 0,
    },

    infoIcon: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eaf3fa',
        borderRadius: 16,
    },

    infoTexto: {
        flex: 1,
        minWidth: 0,
    },

    label: {
        fontSize: 10,
        color: '#8299ad',
        marginBottom: 1,
    },

    valor: {
        fontSize: 12,
        color: '#304f6b',
        fontWeight: 'bold',
        flexShrink: 1,
    },

    valorInput: {
        minHeight: 40,
        fontSize: 13,
        fontWeight: 'bold',
        color: '#304f6b',
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginTop: 3,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
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
        borderRadius: 16,
    },

    modalTitulo: {
        marginBottom: 8,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#365d7d',
    },

    modalMensagem: {
        marginBottom: 20,
        fontSize: 15,
        lineHeight: 21,
        color: '#607b92',
    },

    modalButton: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        backgroundColor: '#5791ca',
        borderRadius: 8,
    },

    modalButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    confirmacaoAcoes: {
        flexDirection: 'row',
        gap: 10,
    },

    modalCancelar: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        backgroundColor: '#ffffff',
    },

    modalCancelarTexto: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#64748B',
    },

    saveButton: {
        width: '100%',
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5791ca',
        borderRadius: 8,
        marginTop: 18,
        elevation: 3,
        shadowColor: '#477499',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },

    saveButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});