import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Modal, Platform, SafeAreaView, StatusBar as NativeStatusBar, StyleSheet, Text, View, Image, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Pressable from './ButtonPressable';

export default function Perfil({ onVoltar, setTelaEdicao, onExcluir, onDeslogar, nome, tipoPerfil, email, documento, telefone, localizacao, fotoPerfil }) {
    const [confirmacaoExclusaoVisivel, setConfirmacaoExclusaoVisivel] = useState(false);
    const [confirmacaoEdicaoVisivel, setConfirmacaoEdicaoVisivel] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#dcecf9" />

            <View style={styles.header}>
                <Pressable style={styles.headerIconButton} onPress={onVoltar} accessibilityLabel="Voltar">
                    <FontAwesome name="arrow-left" size={16} color="#4e718f" />
                </Pressable>

                <Text style={styles.headerTitle}>Meu perfil</Text>
                <View style={styles.headerRight}>
                    <Pressable style={styles.headerIconButton} accessibilityLabel="Notificações">
                        <FontAwesome name="bell-o" size={16} color="#6887a4" />
                    </Pressable>
                    <Pressable
                        style={styles.headerIconButton}
                        onPress={() => setConfirmacaoEdicaoVisivel(true)}
                        accessibilityLabel="Editar perfil"
                    >
                        <FontAwesome name="pencil" size={16} color="#4e718f" />
                    </Pressable>
                </View>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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

                <View style={styles.infoCard}>
                    <View style={styles.cardInfo}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="user-o" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Nome</Text>
                            <Text style={styles.valor}>{nome || 'Seu Nome'}</Text>
                        </View>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="users" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Tipo de perfil</Text>
                            <Text style={styles.valor}>{tipoPerfil || 'Tipo de perfil não definido'}</Text>
                        </View>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="envelope-o" size={15} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>E-mail</Text>
                            <Text style={styles.valor}>{email || 'seu.email@exemplo.com'}</Text>
                        </View>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="phone" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Telefone</Text>
                            <Text style={styles.valor}>{telefone || 'Seu telefone'}</Text>
                        </View>
                    </View>

                    <View style={styles.cardInfo}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="map-marker" size={16} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>Localização</Text>
                            <Text style={styles.valor}>{localizacao || 'Sua localização'}</Text>
                        </View>
                    </View>

                    <View style={[styles.cardInfo, styles.cardInfoLast]}>
                        <View style={styles.infoIcon}>
                            <FontAwesome name="id-card-o" size={15} color="#6b9bc5" />
                        </View>
                        <View style={styles.infoTexto}>
                            <Text style={styles.label}>{tipoPerfil === 'ONG' ? 'CNPJ' : 'CPF'}</Text>
                            <Text style={styles.valor}>{documento || (tipoPerfil === 'ONG' ? 'CNPJ' : 'CPF')}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Pressable
                    style={styles.logoutButton}
                    onPress={onDeslogar}
                >
                    <FontAwesome name="sign-out" size={16} color="#4e718f" />
                    <Text style={styles.logoutButtonText}>Sair da conta</Text>
                </Pressable>

                <Pressable
                    style={styles.deleteButton}
                    onPress={() => setConfirmacaoExclusaoVisivel(true)}
                >
                    <FontAwesome name="trash" size={15} color="#bf6965" />
                    <Text style={styles.deleteButtonText}>Excluir perfil</Text>
                </Pressable>
            </View>

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
                                style={[styles.confirmButton, styles.destructiveConfirmButton]}
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

    headerIconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 10,
        elevation: 2,
    },

    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    headerTitle: {
        flex: 1,
        marginLeft: 12,
        color: '#315f8b',
        fontSize: 15,
        fontWeight: 'bold',
    },

    scroll: {
        flex: 1,
    },

    content: {
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 14,
    },

    avatar: {
        width: 90,
        height: 90,
        marginTop: 2,
        marginBottom: 14,
        borderRadius: 45,
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
        width: 84,
        height: 84,
        borderRadius: 42,
    },

    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
    },

    infoCard: {
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

    cardInfo: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        gap: 11,
    },

    cardInfoLast: {
        marginBottom: 0,
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

    footer: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'android' ? 14 : 18,
        backgroundColor: '#eaf4fc',
        gap: 8,
    },

    logoutButton: {
        width: '100%',
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
    },

    logoutButtonText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: 'bold',
    },

    deleteButton: {
        width: '100%',
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#DC2626',
        borderRadius: 10,
    },

    deleteButtonText: {
        color: '#ffffff',
        fontSize: 13,
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
        borderRadius: 16,
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
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#ffffff',
    },

    cancelButtonText: {
        color: '#64748B',
        fontWeight: 'bold',
    },

    confirmButton: {
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },

    confirmButtonText: {
        color: '#64748B',
        fontWeight: 'bold',
    },

    destructiveConfirmButton: {
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
    },
});