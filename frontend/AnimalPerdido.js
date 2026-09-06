import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatarData } from './utils/formatarData';

const ESPECIES = ['Cachorro', 'Gato', 'Outro'];
const PORTES = ['Pequeno', 'Médio', 'Grande'];
const SEXOS = ['Macho', 'Fêmea'];

const AREA_BUSCA_PADRAO = 5;

const STATUS_PERDIDO = 'Perdido';
const STATUS_ENCONTRADO = 'Encontrado';
const API_ANIMAIS = Platform.OS === 'android' ? 'http://10.0.2.2:3000/api/animais' : 'http://localhost:3000/api/animais';

const OPCOES_VISUALIZACAO = [
    { chave: 'todos', label: 'Todos', icone: 'globe' },
    { chave: 'meus', label: 'Meus animais', icone: 'user' },
];

function novoFormulario() {
    return { nome: '', especie: '', raca: '', cor: '', porte: '', sexo: '', local: '', data: '', descricao: '', foto: null };
}

export default function AnimalPerdido({ usuarioId, token, onVoltar, setTelaAtual, abrirAnimalEncontrado, abrirAdocao, abrirEdicaoAnimal }) {
    const [animais, setAnimais] = useState([]);
    const [busca, setBusca] = useState('');
    const [visualizacao, setVisualizacao] = useState('todos');
    const [areaExpandida, setAreaExpandida] = useState({});
    const [modalVisivel, setModalVisivel] = useState(false);
    const [formulario, setFormulario] = useState(novoFormulario());
    const [confirmacaoAlvo, setConfirmacaoAlvo] = useState(null);

    useEffect(() => {
        async function carregarAnimais() {
            const resposta = await fetch(`${API_ANIMAIS}/perdidos`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dados = await resposta.json();

            if (resposta.ok) {
                setAnimais(dados.map((animal) => ({
                    ...animal,
                    status: STATUS_PERDIDO,
                    meuAnimal: String(animal.id_usuario) === String(usuarioId),
                })));
            }
        }

        if (usuarioId && token) carregarAnimais();

        const intervalo = setInterval(() => {
            if (usuarioId && token) carregarAnimais();
        }, 3000);

        return () => clearInterval(intervalo);
    }, [usuarioId, token]);

    const animaisFiltrados = animais.filter((animal) => {
        if (visualizacao === 'meus' && !animal.meuAnimal) return false;

        const termo = busca.trim().toLowerCase();
        if (!termo) return true;
        return (animal.nome || '').toLowerCase().includes(termo) || (animal.raca || '').toLowerCase().includes(termo) || (animal.local || '').toLowerCase().includes(termo);
    });

    const alternarAreaBusca = (id) => {
        setAreaExpandida((atual) => ({ ...atual, [id]: !atual[id] }));
    };

    const excluirAnimal = async (id) => {
        try {
            const resposta = await fetch(`${API_ANIMAIS}/${usuarioId}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                Alert.alert('Erro', dados.mensagem || 'Não foi possível excluir o animal.');
                return;
            }

            setAnimais((atual) => atual.filter((animal) => animal.id !== id));
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    const solicitarAlteracaoStatus = (id, novoStatus) => {
        const animal = animais.find((item) => item.id === id);
        if (!animal || animal.status === novoStatus) return;
        setConfirmacaoAlvo({ id, novoStatus });
    };

    const cancelarAlteracaoStatus = () => {
        setConfirmacaoAlvo(null);
    };

    const confirmarAlteracaoStatus = async () => {
        if (!confirmacaoAlvo) return;

        const animal = animais.find((item) => item.id === confirmacaoAlvo.id);
        if (!animal) return;

        try {
            const resposta = await fetch(`${API_ANIMAIS}/${usuarioId}/${animal.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nome: animal.nome,
                    especie: animal.especie,
                    raca: animal.raca,
                    cor: animal.cor,
                    porte: animal.porte,
                    sexo: animal.sexo,
                    local_desaparecimento: '',
                    local_encontrado: animal.local,
                    data_evento: animal.data,
                    tipo_registro: 'Encontrado',
                    status: 'Dono encontrado',
                    descricao: animal.descricao,
                }),
            });

            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                Alert.alert('Erro', dados.mensagem || 'Não foi possível alterar o status do animal.');
                return;
            }

            setAnimais((atual) => atual.filter((item) => item.id !== animal.id));
            setConfirmacaoAlvo(null);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    const atualizarCampo = (campo, valor) => {
        setFormulario((atual) => ({ ...atual, [campo]: valor }));
    };

    const abrirFormulario = () => {
        setFormulario(novoFormulario());
        setModalVisivel(true);
    };

    const fecharFormulario = () => {
        setModalVisivel(false);
    };

    const escolherFoto = async () => {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
            Alert.alert('Permissão necessária', 'Permita o acesso às fotos para escolher uma imagem.');
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });

        if (!resultado.canceled) {
            atualizarCampo('foto', resultado.assets[0].uri);
        }
    };

    const salvarAnimal = async () => {
        if (!formulario.nome || !formulario.especie || !formulario.raca || !formulario.cor || !formulario.porte || !formulario.sexo || !formulario.local || !formulario.data) {
            Alert.alert('Atenção', 'Preencha nome, espécie, raça, cor, porte, sexo, local e data do desaparecimento.');
            return;
        }

        try {
            const resposta = await fetch(`${API_ANIMAIS}/${usuarioId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nome: formulario.nome,
                    especie: formulario.especie,
                    raca: formulario.raca,
                    cor: formulario.cor,
                    porte: formulario.porte,
                    sexo: formulario.sexo,
                    local_desaparecimento: formulario.local,
                    local_encontrado: '',
                    data_evento: formulario.data,
                    tipo_registro: 'Perdido',
                    descricao: formulario.descricao
                })
            });
            const dados = await resposta.json();

            if (!resposta.ok) {
                Alert.alert('Erro', dados.mensagem || 'Não foi possível salvar o animal.');
                return;
            }

            setAnimais((atual) => [{ ...dados, areaBusca: AREA_BUSCA_PADRAO, status: STATUS_PERDIDO, meuAnimal: true }, ...atual]);
            setModalVisivel(false);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />

            <View style={styles.cabecalho}>
                <Pressable onPress={onVoltar}>
                    <FontAwesome name="arrow-left" size={22} color="#292929" />
                </Pressable>

                <Text style={styles.titulo}>Animais Perdidos</Text>

                <View style={styles.acoesHeader}>
                    <FontAwesome name="bell" size={20} color="#555" />

                    <Pressable onPress={setTelaAtual}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>U</Text>
                        </View>
                    </Pressable>
                </View>
            </View>

            <View style={styles.segmentoContainer}>
                {OPCOES_VISUALIZACAO.map((opcao) => (
                    <Pressable key={opcao.chave} style={[styles.segmentoBotao, visualizacao === opcao.chave && styles.segmentoBotaoSelecionado]} onPress={() => setVisualizacao(opcao.chave)}>
                        <FontAwesome name={opcao.icone} size={13} color={visualizacao === opcao.chave ? '#ffffff' : '#8a8a8a'} />
                        <Text style={[styles.segmentoTexto, visualizacao === opcao.chave && styles.segmentoTextoSelecionado]}>{opcao.label}</Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.buscaLinha}>
                <View style={styles.buscaContainer}>
                    <FontAwesome name="search" size={16} color="#9b9b9b" style={styles.iconeBusca} />
                    <TextInput style={styles.inputBusca} placeholder="Buscar por nome, raça ou local..." placeholderTextColor="#9b9b9b" value={busca} onChangeText={setBusca} />
                </View>

                <Pressable style={styles.botaoAdicionar} onPress={abrirFormulario}>
                    <FontAwesome name="plus" size={18} color="#ffffff" />
                </Pressable>
            </View>

            <ScrollView style={styles.lista} contentContainerStyle={styles.listaConteudo}>
                {animaisFiltrados.length === 0 && (
                    <View style={styles.vazioContainer}>
                        <FontAwesome name="paw" size={28} color="#d8d8d8" />
                        <Text style={styles.vazioTexto}>
                            {visualizacao === 'meus'
                                ? 'Você ainda não cadastrou nenhum animal perdido. Toque no + para adicionar.'
                                : animais.length === 0
                                ? 'Nenhum animal cadastrado ainda. Toque no + para adicionar.'
                                : 'Nenhum animal encontrado.'}
                        </Text>
                    </View>
                )}

                {animaisFiltrados.map((animal) => (
                    <View key={animal.id} style={styles.card}>
                        <View style={styles.fotoContainer}>
                            {animal.foto ? (
                                <Image source={{ uri: animal.foto }} style={styles.foto} />
                            ) : (
                                <View style={[styles.foto, styles.fotoPlaceholder]}>
                                    <FontAwesome name="paw" size={32} color="#cfcfcf" />
                                </View>
                            )}

                            <View style={styles.fotoOverlay}>
                                <Text style={styles.nomeAnimal}>{animal.nome}</Text>
                                <Text style={styles.especieAnimal}>{animal.especie}{animal.raca ? ` • ${animal.raca}` : ''}</Text>
                            </View>

                            <View style={[styles.badgeStatus, animal.status === STATUS_ENCONTRADO && styles.badgeStatusEncontrado]}>
                                <Text style={styles.badgeStatusTexto}>{animal.status}</Text>
                            </View>
                        </View>

                        <View style={styles.infoContainer}>
                            <Text style={styles.infoLinha}>
                                <Text style={styles.infoLabel}>Cor: </Text>{animal.cor || '-'}{'   '}
                                <Text style={styles.infoLabel}>Porte: </Text>{animal.porte || '-'}{'   '}
                                <Text style={styles.infoLabel}>Sexo: </Text>{animal.sexo || '-'}
                            </Text>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome name="map-marker" size={14} color="#e08a3e" />
                                <Text style={styles.textoComIcone}>{animal.local}</Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome name="calendar" size={13} color="#e08a3e" />
                                <Text style={styles.textoComIcone}>Perdido em: {formatarData(animal.data)}</Text>
                            </View>

                            {!!animal.descricao && <Text style={styles.descricao}><Text style={styles.infoLabel}>Descrição: </Text>{animal.descricao}</Text>}

                            <Pressable style={styles.areaBuscaLinha} onPress={() => alternarAreaBusca(animal.id)}>
                                <FontAwesome name="map" size={13} color="#e08a3e" />
                                <Text style={styles.textoComIcone}>Área de busca ({animal.areaBusca} 5 km)</Text>
                                <FontAwesome name={areaExpandida[animal.id] ? 'chevron-up' : 'chevron-down'} size={12} color="#9b9b9b" style={styles.chevron} />
                            </Pressable>

                            {areaExpandida[animal.id] && (
                                <Text style={styles.areaBuscaDetalhe}>Buscas estão sendo feitas em um raio de {animal.areaBusca} km a partir do local do desaparecimento.</Text>
                            )}

                            {animal.meuAnimal && (
                                <View style={styles.botoesContainer}>
                                    <Pressable style={styles.botaoEditar} onPress={() => abrirEdicaoAnimal(animal, (atualizado) => setAnimais((atual) => atual.map((item) => item.id === atualizado.id ? { ...atualizado, status: item.status, areaBusca: item.areaBusca, meuAnimal: true } : item)))}>
                                        <FontAwesome name="pencil" size={14} color="#45a9d5" />
                                        <Text style={styles.botaoEditarTexto}>Editar</Text>
                                    </Pressable>

                                    <View style={styles.statusToggleContainer}>
                                        <Pressable
                                            style={[styles.statusToggleBotao, animal.status === STATUS_PERDIDO && styles.statusToggleBotaoPerdidoAtivo]}
                                            onPress={() => solicitarAlteracaoStatus(animal.id, STATUS_PERDIDO)}
                                        >
                                            <Text style={[styles.statusToggleTexto, animal.status === STATUS_PERDIDO && styles.statusToggleTextoAtivo]}>Perdido</Text>
                                        </Pressable>

                                        <Pressable
                                            style={[styles.statusToggleBotao, animal.status === STATUS_ENCONTRADO && styles.statusToggleBotaoEncontradoAtivo]}
                                            onPress={() => solicitarAlteracaoStatus(animal.id, STATUS_ENCONTRADO)}
                                        >
                                            <Text style={[styles.statusToggleTexto, animal.status === STATUS_ENCONTRADO && styles.statusToggleTextoAtivo]}>Encontrado</Text>
                                        </Pressable>
                                    </View>

                                    <Pressable style={styles.botaoExcluir} onPress={() => excluirAnimal(animal.id)}>
                                        <FontAwesome name="trash" size={16} color="#d9534f" />
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.rodape}>
                <View style={[styles.itemRodape, styles.itemSelecionado]}>
                    <FontAwesome name="search" size={20} color="#fff" />
                    <Text style={styles.textoRodape}>Perdido</Text>
                </View>

                <Pressable style={styles.itemRodape} onPress={abrirAnimalEncontrado}>
                    <FontAwesome name="paw" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Encontrado</Text>
                </Pressable>

                <Pressable style={styles.itemRodape}>
                    <FontAwesome name="comment-o" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Chat</Text>
                </Pressable>

                <Pressable style={styles.itemRodapeAdocao} onPress={abrirAdocao}>
                    <FontAwesome name="heart" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Adoção</Text>
                </Pressable>
            </View>

            <Modal visible={modalVisivel} animationType="slide" transparent onRequestClose={fecharFormulario}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalCabecalho}>
                            <Text style={styles.modalTitulo}>Novo Animal Perdido</Text>
                            <Pressable onPress={fecharFormulario}>
                                <FontAwesome name="times" size={20} color="#292929" />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                            <Pressable style={styles.uploadFoto} onPress={escolherFoto}>
                                {formulario.foto ? (
                                    <Image source={{ uri: formulario.foto }} style={styles.uploadFotoPreview} />
                                ) : (
                                    <View style={styles.uploadFotoVazio}>
                                        <FontAwesome name="camera" size={22} color="#9b9b9b" />
                                        <Text style={styles.uploadFotoTexto}>Adicionar foto</Text>
                                    </View>
                                )}
                            </Pressable>

                            <Text style={styles.campoLabel}>Nome *</Text>
                            <TextInput style={styles.campoInput} placeholder="Nome do animal" placeholderTextColor="gray" value={formulario.nome} onChangeText={(valor) => atualizarCampo('nome', valor)} />

                            <Text style={styles.campoLabel}>Espécie *</Text>
                            <View style={styles.opcoesContainer}>
                                {ESPECIES.map((opcao) => (
                                    <Pressable key={opcao} style={[styles.opcaoBotao, formulario.especie === opcao && styles.opcaoBotaoSelecionada]} onPress={() => atualizarCampo('especie', opcao)}>
                                        <Text style={[styles.opcaoTexto, formulario.especie === opcao && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.campoLabel}>Raça *</Text>
                            <TextInput style={styles.campoInput} placeholder="Raça do animal" placeholderTextColor="gray" value={formulario.raca} onChangeText={(valor) => atualizarCampo('raca', valor)} />

                            <Text style={styles.campoLabel}>Cor *</Text>
                            <TextInput style={styles.campoInput} placeholder="Cor predominante" placeholderTextColor="gray" value={formulario.cor} onChangeText={(valor) => atualizarCampo('cor', valor)} />

                            <Text style={styles.campoLabel}>Porte *</Text>
                            <View style={styles.opcoesContainer}>
                                {PORTES.map((opcao) => (
                                    <Pressable key={opcao} style={[styles.opcaoBotao, formulario.porte === opcao && styles.opcaoBotaoSelecionada]} onPress={() => atualizarCampo('porte', opcao)}>
                                        <Text style={[styles.opcaoTexto, formulario.porte === opcao && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.campoLabel}>Sexo *</Text>
                            <View style={styles.opcoesContainer}>
                                {SEXOS.map((opcao) => (
                                    <Pressable key={opcao} style={[styles.opcaoBotao, formulario.sexo === opcao && styles.opcaoBotaoSelecionada]} onPress={() => atualizarCampo('sexo', opcao)}>
                                        <Text style={[styles.opcaoTexto, formulario.sexo === opcao && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.campoLabel}>Local do desaparecimento *</Text>
                            <TextInput style={styles.campoInput} placeholder="Ex: Parque Ibirapuera, São Paulo - SP" placeholderTextColor="gray" value={formulario.local} onChangeText={(valor) => atualizarCampo('local', valor)} />

                            <Text style={styles.campoLabel}>Data do desaparecimento *</Text>
                            <TextInput style={styles.campoInput} placeholder="DD/MM/AAAA" placeholderTextColor="gray" value={formulario.data} onChangeText={(valor) => atualizarCampo('data', valor)} keyboardType="numeric" />

                            <Text style={styles.campoLabel}>Descrição adicional</Text>
                            <TextInput style={[styles.campoInput, styles.campoInputMultilinha]} placeholder="Características, comportamento, coleira, etc." placeholderTextColor="gray" value={formulario.descricao} onChangeText={(valor) => atualizarCampo('descricao', valor)} multiline numberOfLines={4} />

                            <Pressable style={styles.botaoSalvar} onPress={salvarAnimal}>
                                <Text style={styles.botaoSalvarTexto}>Salvar</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!confirmacaoAlvo} transparent animationType="fade" onRequestClose={cancelarAlteracaoStatus}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome
                            name={confirmacaoAlvo?.novoStatus === STATUS_ENCONTRADO ? 'check-circle' : 'search'}
                            size={30}
                            color={confirmacaoAlvo?.novoStatus === STATUS_ENCONTRADO ? '#3fae6a' : '#e08a3e'}
                        />

                        <Text style={styles.confirmTitulo}>Confirmar alteração</Text>

                        <Text style={styles.confirmMensagem}>
                            {confirmacaoAlvo?.novoStatus === STATUS_ENCONTRADO
                                ? 'Tem certeza que esse animal foi encontrado?'
                                : 'Tem certeza que quer voltar o status para "Perdido"?'}
                        </Text>

                        <View style={styles.confirmBotoesContainer}>
                            <Pressable style={styles.confirmBotaoCancelar} onPress={cancelarAlteracaoStatus}>
                                <Text style={styles.confirmBotaoCancelarTexto}>Cancelar</Text>
                            </Pressable>

                            <Pressable style={styles.confirmBotaoConfirmar} onPress={confirmarAlteracaoStatus}>
                                <Text style={styles.confirmBotaoConfirmarTexto}>Confirmar</Text>
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

    segmentoContainer: {
        flexDirection: 'row',
        marginTop: 14,
        marginHorizontal: 14,
        padding: 4,
        backgroundColor: '#f0f0f0',
        borderRadius: 22,
    },

    segmentoBotao: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 36,
        borderRadius: 18,
    },

    segmentoBotaoSelecionado: {
        backgroundColor: '#e08a3e',
    },

    segmentoTexto: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#8a8a8a',
    },

    segmentoTextoSelecionado: {
        color: '#ffffff',
    },

    botaoAdicionar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e08a3e',
    },

    buscaLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 14,
    },

    buscaContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 44,
        backgroundColor: '#f0f0f0',
        borderRadius: 22,
    },

    iconeBusca: {
        marginRight: 8,
    },

    inputBusca: {
        flex: 1,
        fontSize: 14,
        color: '#292929',
    },

    lista: {
        flex: 1,
    },

    listaConteudo: {
        paddingHorizontal: 14,
        paddingBottom: 14,
    },

    vazioContainer: {
        alignItems: 'center',
        marginTop: 60,
        paddingHorizontal: 30,
        gap: 10,
    },

    vazioTexto: {
        fontSize: 14,
        color: '#9b9b9b',
        textAlign: 'center',
    },

    card: {
        backgroundColor: '#fffdf7',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f0e6d2',
        overflow: 'hidden',
    },

    fotoContainer: {
        position: 'relative',
    },

    foto: {
        width: '100%',
        height: 170,
    },

    fotoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f2f2f2',
    },

    fotoOverlay: {
        position: 'absolute',
        left: 12,
        bottom: 10,
    },

    nomeAnimal: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    especieAnimal: {
        fontSize: 13,
        color: '#f2f2f2',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    badgeStatus: {
        position: 'absolute',
        top: 10,
        right: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#d9534f',
    },

    badgeStatusEncontrado: {
        backgroundColor: '#4caf7d',
    },

    badgeStatusTexto: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    infoContainer: {
        padding: 14,
    },

    infoLinha: {
        fontSize: 13,
        color: '#4a4a4a',
        marginBottom: 8,
    },

    infoLabel: {
        fontWeight: 'bold',
        color: '#292929',
    },

    linhaComIcone: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },

    textoComIcone: {
        fontSize: 13,
        color: '#4a4a4a',
    },

    descricao: {
        fontSize: 13,
        color: '#4a4a4a',
        marginTop: 4,
        marginBottom: 10,
        lineHeight: 18,
    },

    areaBuscaLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
    },

    chevron: {
        marginLeft: 'auto',
    },

    areaBuscaDetalhe: {
        fontSize: 12,
        color: '#8a8a8a',
        marginBottom: 6,
        lineHeight: 17,
    },

    botoesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },

    botaoEditar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#45a9d5',
    },

    botaoEditarTexto: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#45a9d5',
    },

    statusToggleContainer: {
        flex: 1.8,
        flexDirection: 'row',
        gap: 4,
        padding: 3,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f2ede4',
    },

    statusToggleBotao: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
        borderRadius: 6,
    },

    statusToggleBotaoPerdidoAtivo: {
        backgroundColor: '#d9534f',
    },

    statusToggleBotaoEncontradoAtivo: {
        backgroundColor: '#3fae6a',
    },

    statusToggleTexto: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#6b6b6b',
        textAlign: 'center',
    },

    statusToggleTextoAtivo: {
        color: '#ffffff',
    },

    botaoExcluir: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d9534f',
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

    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(17, 12, 9, 0.45)',
    },

    modalCard: {
        maxHeight: '88%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 18,
    },

    modalCabecalho: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },

    modalTitulo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#292929',
    },

    modalScroll: {
        marginBottom: 4,
    },

    uploadFoto: {
        alignSelf: 'center',
        marginBottom: 18,
    },

    uploadFotoPreview: {
        width: 130,
        height: 130,
        borderRadius: 12,
    },

    uploadFotoVazio: {
        width: 130,
        height: 130,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d8d8d8',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        gap: 6,
    },

    uploadFotoTexto: {
        fontSize: 12,
        color: '#9b9b9b',
    },

    campoLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#292929',
        marginBottom: 6,
        marginTop: 4,
    },

    campoInput: {
        height: 44,
        marginBottom: 12,
        paddingHorizontal: 12,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d8d8d8',
        borderRadius: 8,
        fontSize: 14,
    },

    campoInputMultilinha: {
        height: 90,
        paddingTop: 10,
        textAlignVertical: 'top',
    },

    opcoesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },

    opcaoBotao: {
        paddingHorizontal: 14,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#d8d8d8',
        backgroundColor: '#ffffff',
    },

    opcaoBotaoSelecionada: {
        backgroundColor: '#e08a3e',
        borderColor: '#e08a3e',
    },

    opcaoTexto: {
        fontSize: 13,
        color: '#4a4a4a',
    },

    opcaoTextoSelecionado: {
        color: '#ffffff',
        fontWeight: 'bold',
    },

    botaoSalvar: {
        height: 46,
        marginTop: 6,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e08a3e',
        borderRadius: 10,
    },

    botaoSalvarTexto: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    confirmOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(17, 12, 9, 0.45)',
        paddingHorizontal: 30,
    },

    confirmCard: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 24,
        gap: 10,
    },

    confirmTitulo: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#292929',
    },

    confirmMensagem: {
        fontSize: 14,
        color: '#4a4a4a',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 6,
    },

    confirmBotoesContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
    },

    confirmBotaoCancelar: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d8d8d8',
    },

    confirmBotaoCancelarTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4a4a4a',
    },

    confirmBotaoConfirmar: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#e08a3e',
    },

    confirmBotaoConfirmarTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});