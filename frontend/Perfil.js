import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Modal, Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, Pressable, Image, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function Perfil({ onVoltar, setTelaEdicao, onExcluir, onDeslogar, nome, tipoPerfil, email, documento, telefone, localizacao, fotoPerfil }) {
    const [confirmacaoExclusaoVisivel, setConfirmacaoExclusaoVisivel] = useState(false);
    const [confirmacaoEdicaoVisivel, setConfirmacaoEdicaoVisivel] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />

            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={onVoltar}>
                        <FontAwesome name="arrow-left" size={24} color="#292929" />
                    </Pressable>

                    <Text style={styles.appName}>PetWanted</Text>
                </View>

                <View style={styles.headerRight}>
                    <FontAwesome name="bell" size={20} color="#555" />

                    <Pressable onPress={() => setConfirmacaoEdicaoVisivel(true)}>
                        <FontAwesome name="pencil" size={22} color="#292929" />
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Meu Perfil</Text>

                <View style={styles.avatar}>
                    {fotoPerfil ? (
                        <Image
                            source={{ uri: fotoPerfil }}
                            style={styles.profileImage}
                        />
                    ) : (
                        <Text style={styles.avatarText}>
                            {nome ? nome.charAt(0).toUpperCase() : 'U'}
                        </Text>
                    )}
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="user" size={20} color="#45a9d5" />

                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>Nome</Text>
                        <Text style={styles.valor}>
                            {nome || 'Seu Nome'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="users" size={20} color="#45a9d5" />

                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>Tipo de perfil</Text>
                        <Text style={styles.valor}>
                            {tipoPerfil || 'Tipo de perfil não definido'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="envelope" size={20} color="#45a9d5" />

                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>E-mail</Text>
                        <Text style={styles.valor}>
                            {email || 'seu.email@exemplo.com'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="phone" size={20} color="#45a9d5" />

                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>Telefone</Text>
                        <Text style={styles.valor}>{telefone || 'Seu telefone'}</Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="map-marker" size={20} color="#45a9d5" />

                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>Localização</Text>
                        <Text style={styles.valor}>{localizacao || 'Sua localização'}</Text>
                    </View>
                </View>

                <View style={styles.cardInfo}>
                    <FontAwesome name="id-card" size={20} color="#45a9d5" />

                    <View style={styles.infoTexto}>
                        <Text style={styles.label}>
                            {tipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}
                        </Text>

                        <Text style={styles.valor}>
                            {documento || (tipoPerfil === 'ONG' ? 'CNPJ' : 'CPF')}
                        </Text>
                    </View>
                </View>

                <Pressable
                    style={styles.deleteButton}
                    onPress={() => setConfirmacaoExclusaoVisivel(true)}
                >
                    <FontAwesome name="trash" size={16} color="#d9534f" />
                    <Text style={styles.deleteButtonText}>Excluir perfil</Text>
                </Pressable>

                <Pressable style={styles.logoutButton} onPress={onDeslogar}>
                    <FontAwesome name="sign-out" size={16} color="#7a4b2a" />
                    <Text style={styles.logoutButtonText}>Sair da conta</Text>
                </Pressable>
            </ScrollView>

            <Modal
                transparent
                animationType="fade"
                visible={confirmacaoEdicaoVisivel}
                onRequestClose={() => setConfirmacaoEdicaoVisivel(false)}
            >
                <View style={styles.confirmationOverlay}>
                    <View style={styles.confirmationCard}>
                        <Text style={styles.confirmationTitle}>Editar perfil</Text>
                        <Text style={styles.confirmationMessage}>
                            Tem certeza que deseja editar o cadastro do seu perfil?
                        </Text>

                        <View style={styles.confirmationActions}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => setConfirmacaoEdicaoVisivel(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                style={styles.confirmButton}
                                onPress={() => {
                                    setConfirmacaoEdicaoVisivel(false);
                                    setTelaEdicao();
                                }}
                            >
                                <Text style={styles.confirmButtonText}>Editar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                animationType="fade"
                visible={confirmacaoExclusaoVisivel}
                onRequestClose={() => setConfirmacaoExclusaoVisivel(false)}
            >
                <View style={styles.confirmationOverlay}>
                    <View style={styles.confirmationCard}>
                        <Text style={styles.confirmationTitle}>Excluir perfil</Text>
                        <Text style={styles.confirmationMessage}>
                            Tem certeza de que deseja excluir seu perfil? Essa ação não pode ser desfeita.
                        </Text>

                        <View style={styles.confirmationActions}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => setConfirmacaoExclusaoVisivel(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                style={styles.confirmButton}
                                onPress={() => {
                                    setConfirmacaoExclusaoVisivel(false);
                                    onExcluir();
                                }}
                            >
                                <Text style={styles.confirmButtonText}>Excluir</Text>
                            </Pressable>
                        </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },

    title: {
        marginTop: 20,
        marginBottom: 20,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
        textAlign: 'center',
    },

    content: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 30,
    },

    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#f8b385',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        overflow: 'hidden',
    },

    profileImage: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },

    avatarText: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#fff',
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
        fontWeight: '500',
    },

    appName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#292929',
    },

    deleteButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#d9534f',
        borderRadius: 8,
    },

    deleteButtonText: {
        color: '#d9534f',
        fontSize: 14,
        fontWeight: 'bold',
    },

    logoutButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#7a4b2a',
        borderRadius: 8,
    },

    logoutButtonText: {
        color: '#7a4b2a',
        fontSize: 14,
        fontWeight: 'bold',
    },

    confirmationOverlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
    },

    confirmationCard: {
        width: '100%',
        maxWidth: 380,
        padding: 22,
        backgroundColor: '#ffffff',
        borderRadius: 12,
    },

    confirmationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
        marginBottom: 10,
    },

    confirmationMessage: {
        fontSize: 14,
        lineHeight: 20,
        color: '#666666',
        marginBottom: 20,
    },

    confirmationActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },

    cancelButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#cccccc',
    },

    cancelButtonText: {
        color: '#555555',
        fontWeight: 'bold',
    },

    confirmButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 6,
        backgroundColor: '#d9534f',
    },

    confirmButtonText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
});