import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatarData, formatarEntradaData } from './utils/formatarData';
import { API_ANIMAIS } from './config/api';

const ESPECIES = ['Cachorro', 'Gato', 'Outro'];
const PORTES = ['Pequeno', 'Médio', 'Grande'];
const SEXOS = ['Macho', 'Fêmea'];

const STATUS_PROCURANDO = 'Procurando Dono';
const STATUS_DONO_ENCONTRADO = 'Dono encontrado';
const OPCOES_VISUALIZACAO = [
    { chave: 'todos', label: 'Todos', icone: 'globe' },
    { chave: 'meus', label: 'Meus animais', icone: 'user' },
];

function novoFormulario() {
    return { nome: '', especie: '', raca: '', cor: '', porte: '', sexo: '', local: '', data: '', descricao: '', foto: null };
}

export default function AnimalEncontrado({ usuarioId, token, nome, fotoPerfil, onVoltar, setTelaAtual, abrirAnimalPerdido, abrirAdocao, abrirEdicaoAnimal }) {
    const [animais, setAnimais] = useState([]);
    const letraPerfil = nome ? nome.charAt(0).toUpperCase() : 'U';
    const [busca, setBusca] = useState('');
    const [visualizacao, setVisualizacao] = useState('todos');
    const [modalVisivel, setModalVisivel] = useState(false);
    const [formulario, setFormulario] = useState(novoFormulario());
    const [confirmacaoEdicaoAlvo, setConfirmacaoEdicaoAlvo] = useState(null);
    const [confirmacaoExclusaoAlvo, setConfirmacaoExclusaoAlvo] = useState(null);
    const [mensagemModal, setMensagemModal] = useState({ visivel: false, titulo: '', mensagem: '' });

    useEffect(() => {
        async function carregarAnimais() {
            const resposta = await fetch(`${API_ANIMAIS}/encontrados`);
            const dados = await resposta.json();

            if (resposta.ok) {
                setAnimais(dados
                    .filter((animal) => animal.tipo_registro === 'Encontrado')
                    .map((animal) => ({
                        ...animal,
                        status: animal.status || STATUS_PROCURANDO,
                        meuAnimal: String(animal.id_usuario) === String(usuarioId),
                    })));
            }
        }

        if (usuarioId) carregarAnimais();

        const intervalo = setInterval(() => {
            if (usuarioId) carregarAnimais();
        }, 3000);

        return () => clearInterval(intervalo);
    }, [usuarioId]);

    const animaisFiltrados = animais.filter((animal) => {
        if (visualizacao === 'meus' && !animal.meuAnimal) return false;

        const termo = busca.trim().toLowerCase();
        if (!termo) return true;
        return (animal.nome || '').toLowerCase().includes(termo) || (animal.raca || '').toLowerCase().includes(termo) || (animal.local || '').toLowerCase().includes(termo);
    });

    const [confirmacaoAlvo, setConfirmacaoAlvo] = useState(null);

    const solicitarAlteracaoStatus = (id, novoStatus) => {
        const animal = animais.find((item) => item.id === id);
        if (!animal || animal.status === novoStatus) return;
        setConfirmacaoAlvo({ id, novoStatus });
    };

    const cancelarAlteracaoStatus = () => {
        setConfirmacaoAlvo(null);
    };

    const abrirMensagem = (titulo, mensagem) => {
        Alert.alert(titulo, mensagem, [{ text: 'OK' }]);
    };

    const fecharMensagem = () => {
        setMensagemModal({ visivel: false, titulo: '', mensagem: '' });
    };

    const confirmarAlteracaoStatus = async () => {
        if (!confirmacaoAlvo) return;

        const animal = animais.find((item) => item.id === confirmacaoAlvo.id);
        if (!animal || !animal.meuAnimal) return;

        const voltandoParaPerdido = confirmacaoAlvo.novoStatus === STATUS_PROCURANDO;

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
                    local_desaparecimento: voltandoParaPerdido ? animal.local : '',
                    local_encontrado: voltandoParaPerdido ? '' : animal.local,
                    data_evento: animal.data,
                    tipo_registro: voltandoParaPerdido ? 'Perdido' : 'Encontrado',
                    status: voltandoParaPerdido ? 'Perdido' : confirmacaoAlvo.novoStatus,
                    descricao: animal.descricao,
                }),
            });

            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                Alert.alert('Erro', dados.mensagem || 'Não foi possível alterar o status do animal.');
                return;
            }

            setAnimais((atual) => voltandoParaPerdido
                ? atual.filter((item) => item.id !== animal.id)
                : atual.map((item) => item.id === animal.id ? { ...item, status: confirmacaoAlvo.novoStatus } : item));
            setConfirmacaoAlvo(null);
        } catch (error) {
            Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    const excluirAnimal = async (id) => {
        try {
            const resposta = await fetch(`${API_ANIMAIS}/${usuarioId}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                abrirMensagem('Erro', dados.mensagem || 'Não foi possível excluir o animal.');
                return;
            }

            setAnimais((atual) => atual.filter((animal) => animal.id !== id));
            setConfirmacaoExclusaoAlvo(null);
            abrirMensagem('Animal excluído', 'O animal foi excluído com sucesso.');
        } catch (error) {
            abrirMensagem('Erro', 'Não foi possível conectar ao servidor.');
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

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        });

        if (!resultado.canceled) {
            const arquivo = resultado.assets[0];
            const dataUri = `data:image/${arquivo.mimeType?.split('/')?.[1] || 'jpeg'};base64,${arquivo.base64}`;
            atualizarCampo('foto', dataUri);
        }
    };

    const salvarAnimal = async () => {
        if (!formulario.especie || !formulario.raca || !formulario.cor || !formulario.porte || !formulario.sexo || !formulario.local || !formulario.data) {
            abrirMensagem('Atenção', 'Preencha espécie, raça, cor, porte, local e data em que o animal foi encontrado.');
            return;
        }

        try {
            const resposta = await fetch(`${API_ANIMAIS}/${usuarioId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: formulario.nome,
                    especie: formulario.especie,
                    raca: formulario.raca,
                    cor: formulario.cor,
                    porte: formulario.porte,
                    sexo: formulario.sexo,
                    local_desaparecimento: '',
                    local_encontrado: formulario.local,
                    data_evento: formulario.data,
                    tipo_registro: 'Encontrado',
                    descricao: formulario.descricao,
                    foto: formulario.foto || null,
                })
            });
            const dados = await resposta.json();

            if (!resposta.ok) {
                abrirMensagem('Erro', dados.mensagem || 'Não foi possível salvar o animal.');
                return;
            }

            setAnimais((atual) => [{ ...dados, status: STATUS_PROCURANDO, meuAnimal: true }, ...atual]);
            setModalVisivel(false);
        } catch (error) {
            abrirMensagem('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" hidden={false} backgroundColor="#ffffff" />

            <View style={styles.cabecalho}>
                <Pressable onPress={onVoltar}>
                    <FontAwesome name="arrow-left" size={22} color="#292929" />
                </Pressable>

                <Text style={styles.titulo}>Animais Encontrados</Text>

                <View style={styles.acoesHeader}>
                    <FontAwesome name="bell" size={20} color="#555" />

                    <Pressable onPress={setTelaAtual}>
                        <View style={styles.avatar}>
                            {fotoPerfil ? (
                                <Image source={{ uri: fotoPerfil }} style={styles.profileImage} />
                            ) : (
                                <Text style={styles.avatarText}>{letraPerfil}</Text>
                            )}
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
                                ? 'Você ainda não cadastrou nenhum animal encontrado. Toque no + para adicionar.'
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
                                <Image source={{ uri: animal.foto }} style={styles.foto} resizeMode="contain" />
                            ) : (
                                <View style={[styles.foto, styles.fotoPlaceholder]}>
                                    <FontAwesome name="paw" size={32} color="#cfcfcf" />
                                </View>
                            )}

                            <View style={styles.fotoOverlay}>
                                <Text style={styles.nomeAnimal}>{animal.nome || 'Animal sem nome'}</Text>
                                <Text style={styles.especieAnimal}>{animal.especie}{animal.raca ? ` • ${animal.raca}` : ''}</Text>
                            </View>

                            <View style={[styles.badgeStatus, animal.status === STATUS_DONO_ENCONTRADO && styles.badgeStatusEncontrado]}>
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
                                <FontAwesome name="map-marker" size={14} color="#45a9d5" />
                                <Text style={styles.textoComIcone}>{animal.local}</Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome name="calendar" size={13} color="#45a9d5" />
                                <Text style={styles.textoComIcone}>Encontrado em: {formatarData(animal.data)}</Text>
                            </View>

                            {!!animal.descricao && <Text style={styles.descricao}><Text style={styles.infoLabel}>Descrição: </Text>{animal.descricao}</Text>}

                            <View style={styles.botoesContainer}>
                                {animal.meuAnimal && (
                                    <Pressable style={styles.botaoEditar} onPress={() => setConfirmacaoEdicaoAlvo(animal)}>
                                        <FontAwesome name="pencil" size={14} color="#45a9d5" />
                                        <Text style={styles.botaoEditarTexto}>Editar</Text>
                                    </Pressable>
                                )}

                                {animal.meuAnimal && (
                                    <View style={styles.statusToggleContainer}>
                                        <Pressable
                                            style={[styles.statusToggleBotao, animal.status === STATUS_PROCURANDO && styles.statusToggleBotaoProcurandoAtivo]}
                                            onPress={() => solicitarAlteracaoStatus(animal.id, STATUS_PROCURANDO)}
                                        >
                                            <Text style={[styles.statusToggleTexto, animal.status === STATUS_PROCURANDO && styles.statusToggleTextoAtivo]}>Procurando Dono</Text>
                                        </Pressable>

                                        <Pressable
                                            style={[styles.statusToggleBotao, animal.status === STATUS_DONO_ENCONTRADO && styles.statusToggleBotaoEncontradoAtivo]}
                                            onPress={() => solicitarAlteracaoStatus(animal.id, STATUS_DONO_ENCONTRADO)}
                                        >
                                            <Text style={[styles.statusToggleTexto, animal.status === STATUS_DONO_ENCONTRADO && styles.statusToggleTextoAtivo]}>Dono encontrado</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {animal.meuAnimal && (
                                    <Pressable style={styles.botaoExcluir} onPress={() => setConfirmacaoExclusaoAlvo(animal.id)}>
                                        <FontAwesome name="trash" size={16} color="#d9534f" />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.rodape}>
                <Pressable style={styles.itemRodape} onPress={abrirAnimalPerdido}>
                    <FontAwesome name="search" size={20} color="#6b6b6b" />
                    <Text style={styles.textoRodape}>Perdido</Text>
                </Pressable>

                <View style={[styles.itemRodape, styles.itemSelecionado]}>
                    <FontAwesome name="paw" size={20} color="#fff" />
                    <Text style={styles.textoRodape}>Encontrado</Text>
                </View>

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
                            <Text style={styles.modalTitulo}>Novo Animal Encontrado</Text>
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

                            <Text style={styles.campoLabel}>Nome (se souber)</Text>
                            <TextInput style={styles.campoInput} placeholder="Nome do animal, se ele tiver uma coleira/plaquinha" placeholderTextColor="gray" value={formulario.nome} onChangeText={(valor) => atualizarCampo('nome', valor)} />

                            <Text style={styles.campoLabel}>Espécie *</Text>
                            <View style={styles.opcoesContainer}>
                                {ESPECIES.map((opcao) => (
                                    <Pressable key={opcao} style={[styles.opcaoBotao, formulario.especie === opcao && styles.opcaoBotaoSelecionada]} onPress={() => atualizarCampo('especie', opcao)}>
                                        <Text style={[styles.opcaoTexto, formulario.especie === opcao && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.campoLabel}>Raça *</Text>
                            <TextInput style={styles.campoInput} placeholder="Raça do animal, se souber" placeholderTextColor="gray" value={formulario.raca} onChangeText={(valor) => atualizarCampo('raca', valor)} />

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

                            <Text style={styles.campoLabel}>Local onde foi encontrado *</Text>
                            <TextInput style={styles.campoInput} placeholder="Ex: Rua Augusta, São Paulo - SP" placeholderTextColor="gray" value={formulario.local} onChangeText={(valor) => atualizarCampo('local', valor)} />

                            <Text style={styles.campoLabel}>Data em que foi encontrado *</Text>
                            <TextInput style={styles.campoInput} placeholder="DD/MM/AAAA" placeholderTextColor="gray" value={formulario.data} onChangeText={(valor) => atualizarCampo('data', formatarEntradaData(valor))} keyboardType="numeric" />

                            <Text style={styles.campoLabel}>Descrição adicional</Text>
                            <TextInput style={[styles.campoInput, styles.campoInputMultilinha]} placeholder="Características, comportamento, coleira, estado de saúde, etc." placeholderTextColor="gray" value={formulario.descricao} onChangeText={(valor) => atualizarCampo('descricao', valor)} multiline numberOfLines={4} />

                            <Pressable style={styles.botaoSalvar} onPress={salvarAnimal}>
                                <Text style={styles.botaoSalvarTexto}>Salvar</Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!confirmacaoEdicaoAlvo} transparent animationType="fade" onRequestClose={() => setConfirmacaoEdicaoAlvo(null)}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome name="pencil" size={30} color="#45a9d5" />
                        <Text style={styles.confirmTitulo}>Editar animal</Text>
                        <Text style={styles.confirmMensagem}>Tem certeza que deseja editar o cadastro deste animal?</Text>
                        <View style={styles.confirmBotoesContainer}>
                            <Pressable style={styles.confirmBotaoCancelar} onPress={() => setConfirmacaoEdicaoAlvo(null)}>
                                <Text style={styles.confirmBotaoCancelarTexto}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.confirmBotaoConfirmar} onPress={() => {
                                const animal = confirmacaoEdicaoAlvo;
                                setConfirmacaoEdicaoAlvo(null);
                                abrirEdicaoAnimal(animal, (atualizado) => setAnimais((atual) => atual.map((item) => item.id === atualizado.id ? { ...atualizado, status: atualizado.status, meuAnimal: true } : item)));
                            }}>
                                <Text style={styles.confirmBotaoConfirmarTexto}>Editar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!confirmacaoExclusaoAlvo} transparent animationType="fade" onRequestClose={() => setConfirmacaoExclusaoAlvo(null)}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome name="trash" size={30} color="#d9534f" />
                        <Text style={styles.confirmTitulo}>Excluir animal</Text>
                        <Text style={styles.confirmMensagem}>Tem certeza que deseja excluir este animal?</Text>
                        <View style={styles.confirmBotoesContainer}>
                            <Pressable style={styles.confirmBotaoCancelar} onPress={() => setConfirmacaoExclusaoAlvo(null)}>
                                <Text style={styles.confirmBotaoCancelarTexto}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.confirmBotaoConfirmar} onPress={() => {
                                const id = confirmacaoExclusaoAlvo;
                                setConfirmacaoExclusaoAlvo(null);
                                excluirAnimal(id);
                            }}>
                                <Text style={styles.confirmBotaoConfirmarTexto}>Excluir</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={!!confirmacaoAlvo} transparent animationType="fade" onRequestClose={cancelarAlteracaoStatus}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome
                            name={confirmacaoAlvo?.novoStatus === STATUS_DONO_ENCONTRADO ? 'check-circle' : 'search'}
                            size={30}
                            color={confirmacaoAlvo?.novoStatus === STATUS_DONO_ENCONTRADO ? '#3fae6a' : '#45a9d5'}
                        />

                        <Text style={styles.confirmTitulo}>Confirmar alteração</Text>

                        <Text style={styles.confirmMensagem}>
                            {confirmacaoAlvo?.novoStatus === STATUS_DONO_ENCONTRADO
                                ? 'Tem certeza que o dono desse animal foi encontrado?'
                                : 'Tem certeza que quer voltar o status para "Procurando Dono"?'}
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

            <Modal visible={mensagemModal.visivel} transparent animationType="fade" onRequestClose={fecharMensagem}>
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome name="info-circle" size={30} color="#45a9d5" />
                        <Text style={styles.confirmTitulo}>{mensagemModal.titulo}</Text>
                        <Text style={styles.confirmMensagem}>{mensagemModal.mensagem}</Text>
                        <Pressable style={styles.confirmBotaoConfirmar} onPress={fecharMensagem}>
                            <Text style={styles.confirmBotaoConfirmarTexto}>OK</Text>
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
        backgroundColor: '#f8b385',
        borderRadius: 15,
        overflow: 'hidden',
    },

    profileImage: {
        width: 30,
        height: 30,
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
        backgroundColor: '#45a9d5',
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
        backgroundColor: '#45a9d5',
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
        backgroundColor: '#f7fbfd',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#dcedf5',
        overflow: 'hidden',
    },

    fotoContainer: {
        position: 'relative',
        backgroundColor: '#f7f7f7',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 170,
    },

    foto: {
        width: '100%',
        height: 170,
        backgroundColor: '#f7f7f7',
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
        backgroundColor: '#45a9d5',
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
        backgroundColor: '#eef2f5',
    },

    statusToggleBotao: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 4,
        borderRadius: 6,
    },

    statusToggleBotaoProcurandoAtivo: {
        backgroundColor: '#45a9d5',
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
        backgroundColor: '#45a9d5',
    },

    confirmBotaoConfirmarTexto: {
        fontSize: 14,
        fontWeight: 'bold',
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
        backgroundColor: '#45a9d5',
        borderColor: '#45a9d5',
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
        backgroundColor: '#45a9d5',
        borderRadius: 10,
    },

    botaoSalvarTexto: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },
});