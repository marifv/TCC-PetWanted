import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatarData } from './utils/formatarData';

const ESPECIES = ['Cachorro', 'Gato', 'Outro'];
const PORTES = ['Pequeno', 'Médio', 'Grande'];
const SEXOS = ['Macho', 'Fêmea', 'Não Binarie'];
const FAIXAS_ETARIAS = ['Filhote', 'Jovem', 'Adulto', 'Idoso'];

const STATUS_ADOCAO = 'Animal para Adoção';
const STATUS_ADOTADO = 'Animal Adotado';
const API_ANIMAIS = Platform.OS === 'android' ? 'http://192.168.0.125:3000/api/animais' : 'http://localhost:3000/api/animais';

const OPCOES_VISUALIZACAO = [
    { chave: 'todos', label: 'Todos', icone: 'globe' },
    { chave: 'meus', label: 'Meus animais', icone: 'user' },
];

function novoFormulario() {
    return { nome: '', especie: '', raca: '', cor: '', porte: '', sexo: '', idade: '', faixaEtaria: '', local: '', descricao: '', responsavel: '', contato: '', foto: null };
}

function formatarDataAtual() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    return `${dia}/${mes}/${ano}`;
}

export default function AnimalAdocao({ usuarioId, token, onVoltar, setTelaAtual, abrirAnimalPerdido, abrirAnimalEncontrado, abrirEdicaoAnimal }) {
    const [animais, setAnimais] = useState([]);
    const [visualizacao, setVisualizacao] = useState('todos');

    const [filtroEspecie, setFiltroEspecie] = useState('Todos');
    const [filtroPorte, setFiltroPorte] = useState('Todos');
    const [filtroIdade, setFiltroIdade] = useState('Todos');

    const [filtroVisivel, setFiltroVisivel] = useState(false);

    const [modalVisivel, setModalVisivel] = useState(false);
    const [formulario, setFormulario] = useState(novoFormulario());

    const [confirmacaoAlvo, setConfirmacaoAlvo] = useState(null);

    const [mensagemModal, setMensagemModal] = useState({
        visivel: false,
        titulo: '',
        mensagem: '',
    });

    useEffect(() => {
        async function carregarAnimais() {
            const resposta = await fetch(`${API_ANIMAIS}/adocao`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const dados = await resposta.json();

            if (resposta.ok) {
                setAnimais(dados
                    .map((animal) => ({
                        ...animal,
                        status: animal.status || STATUS_ADOCAO,
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

    const atualizarCampo = (campo, valor) => {
        setFormulario((atual) => ({
            ...atual,
            [campo]: valor,
        }));
    };

    const abrirMensagem = (titulo, mensagem) => {
        setMensagemModal({
            visivel: true,
            titulo,
            mensagem,
        });
    };

    const fecharMensagem = () => {
        setMensagemModal({
            visivel: false,
            titulo: '',
            mensagem: '',
        });
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
            abrirMensagem(
                'Permissão necessária',
                'Permita o acesso às fotos para escolher uma imagem.'
            );
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!resultado.canceled) {
            atualizarCampo('foto', resultado.assets[0].uri);
        }
    };

    const salvarAnimal = async () => {
        if (
            !formulario.nome ||
            !formulario.especie ||
            !formulario.raca ||
            !formulario.cor ||
            !formulario.porte ||
            !formulario.sexo ||
            !formulario.idade ||
            !formulario.faixaEtaria ||
            !formulario.local ||
            !formulario.descricao ||
            !formulario.responsavel ||
            !formulario.contato
        ) {
            abrirMensagem(
                'Atenção',
                'Preencha todos os campos obrigatórios para cadastrar o animal.'
            );
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
                    local_encontrado: formulario.local,
                    data_evento: formatarDataAtual(),
                    tipo_registro: 'Adocao',
                    idade: formulario.idade,
                    faixa_etaria: formulario.faixaEtaria,
                    responsavel: formulario.responsavel,
                    contato: formulario.contato,
                    descricao: formulario.descricao,
                }),
            });
            const novoAnimal = await resposta.json();

            if (!resposta.ok) {
                abrirMensagem('Erro', novoAnimal.mensagem || 'Não foi possível salvar o animal.');
                return;
            }

            setAnimais((atual) => [{ ...novoAnimal, status: STATUS_ADOCAO, meuAnimal: true }, ...atual]);
            setModalVisivel(false);
        } catch (error) {
            abrirMensagem('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    const solicitarAlteracaoStatus = (id, novoStatus) => {
        const animal = animais.find((item) => item.id === id);

        if (!animal || animal.status === novoStatus) {
            return;
        }

        setConfirmacaoAlvo({
            id,
            novoStatus,
        });
    };

    const cancelarAlteracaoStatus = () => {
        setConfirmacaoAlvo(null);
    };

    const confirmarAlteracaoStatus = async () => {
        if (!confirmacaoAlvo) {
            return;
        }

        const animal = animais.find((item) => item.id === confirmacaoAlvo.id);
        if (!animal || !animal.meuAnimal) return;

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
                    local_encontrado: animal.local,
                    data_evento: animal.data,
                    tipo_registro: 'Adocao',
                    status: confirmacaoAlvo.novoStatus,
                    idade: animal.idade,
                    faixa_etaria: animal.faixaEtaria,
                    responsavel: animal.responsavel,
                    contato: animal.contato,
                    descricao: animal.descricao,
                }),
            });

            if (!resposta.ok) {
                const dados = await resposta.json().catch(() => ({}));
                abrirMensagem('Erro', dados.mensagem || 'Não foi possível atualizar o status.');
                return;
            }

            if (confirmacaoAlvo.novoStatus === STATUS_ADOTADO) {
                setAnimais((atual) => atual.filter((item) => item.id !== animal.id));
            } else {
                const atualizado = await resposta.json();
                setAnimais((atual) => atual.map((item) => item.id === atualizado.id
                    ? { ...atualizado, meuAnimal: true }
                    : item));
            }

            setConfirmacaoAlvo(null);
        } catch (error) {
            abrirMensagem('Erro', 'Não foi possível conectar ao servidor.');
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
        } catch (error) {
            abrirMensagem('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    const animaisFiltrados = animais.filter((animal) => {
        if (visualizacao === 'meus' && !animal.meuAnimal) {
            return false;
        }

        if (
            filtroEspecie !== 'Todos' &&
            animal.especie !== filtroEspecie
        ) {
            return false;
        }

        if (
            filtroPorte !== 'Todos' &&
            animal.porte !== filtroPorte
        ) {
            return false;
        }

        if (
            filtroIdade !== 'Todos' &&
            animal.faixaEtaria !== filtroIdade
        ) {
            return false;
        }

        return true;
    });

    const limparFiltros = () => {
        setFiltroEspecie('Todos');
        setFiltroPorte('Todos');
        setFiltroIdade('Todos');
    };

    const quantidadeFiltrosAtivos =
        (filtroEspecie !== 'Todos' ? 1 : 0) +
        (filtroPorte !== 'Todos' ? 1 : 0) +
        (filtroIdade !== 'Todos' ? 1 : 0);

    const renderOpcoes = (opcoes, campo, selecionado = formulario[campo]) => (
        <View style={styles.opcoesContainer}>
            {opcoes.map((opcao) => (
                <Pressable key={opcao} style={[styles.opcaoBotao, selecionado === opcao && styles.opcaoBotaoSelecionada]} onPress={() => atualizarCampo(campo, opcao)}>
                    <Text style={[styles.opcaoTexto, selecionado === opcao && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                </Pressable>
            ))}
        </View>
    );

    const renderFiltroOpcoes = (opcoes, valor, atualizar) => (
        <View style={styles.opcoesContainer}>
            {['Todos', ...opcoes].map((opcao) => (
                <Pressable key={opcao} style={[styles.opcaoBotao, valor === opcao && styles.opcaoBotaoSelecionada]} onPress={() => atualizar(opcao)}>
                    <Text style={[styles.opcaoTexto, valor === opcao && styles.opcaoTextoSelecionado]}>{opcao}</Text>
                </Pressable>
            ))}
        </View>
    );

    const renderCampo = (label, campo, placeholder, propriedades = {}) => {
        const { numeric, ...inputProps } = propriedades;
        return (
            <>
                <Text style={styles.campoLabel}>{label}</Text>
                <TextInput style={inputProps.multiline ? [styles.campoInput, styles.campoInputMultilinha] : styles.campoInput} placeholder={placeholder} placeholderTextColor="gray" value={formulario[campo]} onChangeText={(valor) => atualizarCampo(campo, numeric ? valor.replace(/[^0-9]/g, '') : valor)} {...inputProps} />
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar
                style="dark"
                hidden={false}
                backgroundColor="#ffffff"
            />

            <View style={styles.cabecalho}>
                <Pressable onPress={onVoltar}>
                    <FontAwesome
                        name="arrow-left"
                        size={22}
                        color="#292929"
                    />
                </Pressable>

                <Text style={styles.titulo}>
                    Animais para Adoção
                </Text>

                <View style={styles.acoesHeader}>
                    <FontAwesome
                        name="bell"
                        size={20}
                        color="#555"
                    />

                    <Pressable onPress={setTelaAtual}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>U</Text>
                        </View>
                    </Pressable>
                </View>
            </View>

            <View style={styles.segmentoContainer}>
                {OPCOES_VISUALIZACAO.map((opcao) => (
                    <Pressable
                        key={opcao.chave}
                        style={[
                            styles.segmentoBotao,
                            visualizacao === opcao.chave &&
                                styles.segmentoBotaoSelecionado,
                        ]}
                        onPress={() =>
                            setVisualizacao(opcao.chave)
                        }
                    >
                        <FontAwesome
                            name={opcao.icone}
                            size={13}
                            color={
                                visualizacao === opcao.chave
                                    ? '#ffffff'
                                    : '#8a8a8a'
                            }
                        />

                        <Text
                            style={[
                                styles.segmentoTexto,
                                visualizacao === opcao.chave &&
                                    styles.segmentoTextoSelecionado,
                            ]}
                        >
                            {opcao.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <View style={styles.acoesLinha}>
                <View>
                    <Text style={styles.filtrosTitulo}>
                        Animais disponíveis
                    </Text>

                    {quantidadeFiltrosAtivos > 0 && (
                        <Text style={styles.filtrosAtivos}>
                            {quantidadeFiltrosAtivos} filtro(s) ativo(s)
                        </Text>
                    )}
                </View>

                <View style={styles.botoesAcoes}>
                    <Pressable
                        style={[
                            styles.botaoFiltro,
                            quantidadeFiltrosAtivos > 0 &&
                                styles.botaoFiltroAtivo,
                        ]}
                        onPress={() => setFiltroVisivel(true)}
                    >
                        <FontAwesome
                            name="filter"
                            size={17}
                            color={
                                quantidadeFiltrosAtivos > 0
                                    ? '#ffffff'
                                    : '#45a9d5'
                            }
                        />
                    </Pressable>

                    <Pressable
                        style={styles.botaoAdicionar}
                        onPress={abrirFormulario}
                    >
                        <FontAwesome
                            name="plus"
                            size={18}
                            color="#ffffff"
                        />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={styles.lista}
                contentContainerStyle={styles.listaConteudo}
            >
                {animaisFiltrados.length === 0 && (
                    <View style={styles.vazioContainer}>
                        <FontAwesome
                            name="heart"
                            size={28}
                            color="#d8d8d8"
                        />

                        <Text style={styles.vazioTexto}>
                            {animais.length === 0
                                ? 'Nenhum animal disponível para adoção. Toque no + para adicionar.'
                                : 'Nenhum animal encontrado com esses filtros.'}
                        </Text>
                    </View>
                )}

                {animaisFiltrados.map((animal) => (
                    <View
                        key={animal.id}
                        style={styles.card}
                    >
                        <View style={styles.fotoContainer}>
                            {animal.foto ? (
                                <Image
                                    source={{ uri: animal.foto }}
                                    style={styles.foto}
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.foto,
                                        styles.fotoPlaceholder,
                                    ]}
                                >
                                    <FontAwesome
                                        name="paw"
                                        size={32}
                                        color="#cfcfcf"
                                    />
                                </View>
                            )}

                            <View style={styles.fotoOverlay}>
                                <Text style={styles.nomeAnimal}>
                                    {animal.nome}
                                </Text>

                                <Text style={styles.especieAnimal}>
                                    {animal.especie}
                                    {animal.raca
                                        ? ` • ${animal.raca}`
                                        : ''}
                                </Text>
                            </View>

                            <View
                                style={[
                                    styles.badgeStatus,
                                    animal.status === STATUS_ADOTADO &&
                                        styles.badgeStatusAdotado,
                                ]}
                            >
                                <Text style={styles.badgeStatusTexto}>
                                    {animal.status}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoContainer}>
                            <Text style={styles.infoLinha}>
                                <Text style={styles.infoLabel}>
                                    Cor:{' '}
                                </Text>
                                {animal.cor}{'   '}

                                <Text style={styles.infoLabel}>
                                    Porte:{' '}
                                </Text>
                                {animal.porte}{'   '}

                                <Text style={styles.infoLabel}>
                                    Sexo:{' '}
                                </Text>
                                {animal.sexo}
                            </Text>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="birthday-cake"
                                    size={13}
                                    color="#45a9d5"
                                />

                                <Text style={styles.textoComIcone}>
                                    {animal.idade} anos • {animal.faixaEtaria}
                                </Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="map-marker"
                                    size={14}
                                    color="#45a9d5"
                                />

                                <Text style={styles.textoComIcone}>
                                    {animal.local}
                                </Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="user"
                                    size={13}
                                    color="#45a9d5"
                                />

                                <Text style={styles.textoComIcone}>
                                    Responsável: {animal.responsavel}
                                </Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="phone"
                                    size={13}
                                    color="#45a9d5"
                                />

                                <Text style={styles.textoComIcone}>
                                    Contato: {animal.contato}
                                </Text>
                            </View>

                            {!!animal.descricao && (
                                <Text style={styles.descricao}>
                                    {animal.descricao}
                                </Text>
                            )}

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="calendar"
                                    size={13}
                                    color="#45a9d5"
                                />

                                <Text style={styles.textoComIcone}>
                                    Cadastrado em: {formatarData(animal.data)}
                                </Text>
                            </View>

                            <View style={styles.botoesContainer}>
                                {animal.meuAnimal && <Pressable
                                    style={styles.botaoEditar}
                                    onPress={() => abrirEdicaoAnimal(animal, (atualizado) => setAnimais((atual) => atual.map((item) => item.id === atualizado.id ? { ...atualizado, status: atualizado.status || item.status, meuAnimal: true } : item)))}
                                >
                                    <FontAwesome
                                        name="pencil"
                                        size={14}
                                        color="#45a9d5"
                                    />

                                    <Text
                                        style={styles.botaoEditarTexto}
                                    >
                                        Editar
                                    </Text>
                                </Pressable>}

                                {animal.meuAnimal && <View style={styles.statusToggleContainer}>
                                    <Pressable
                                        style={[
                                            styles.statusToggleBotao,
                                            animal.status === STATUS_ADOCAO &&
                                                styles.statusToggleBotaoAdocaoAtivo,
                                        ]}
                                        onPress={() =>
                                            solicitarAlteracaoStatus(
                                                animal.id,
                                                STATUS_ADOCAO
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.statusToggleTexto,
                                                animal.status === STATUS_ADOCAO &&
                                                    styles.statusToggleTextoAtivo,
                                            ]}
                                        >
                                            Adoção
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        style={[
                                            styles.statusToggleBotao,
                                            animal.status === STATUS_ADOTADO &&
                                                styles.statusToggleBotaoAdotadoAtivo,
                                        ]}
                                        onPress={() =>
                                            solicitarAlteracaoStatus(
                                                animal.id,
                                                STATUS_ADOTADO
                                            )
                                        }
                                    >
                                        <Text
                                            style={[
                                                styles.statusToggleTexto,
                                                animal.status === STATUS_ADOTADO &&
                                                    styles.statusToggleTextoAtivo,
                                            ]}
                                        >
                                            Adotado
                                        </Text>
                                    </Pressable>
                                </View>}

                                {animal.meuAnimal && <Pressable
                                    style={styles.botaoExcluir}
                                    onPress={() =>
                                        excluirAnimal(animal.id)
                                    }
                                >
                                    <FontAwesome
                                        name="trash"
                                        size={16}
                                        color="#d9534f"
                                    />
                                </Pressable>}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.rodape}>
                <Pressable
                    style={styles.itemRodape}
                    onPress={abrirAnimalPerdido}
                >
                    <FontAwesome
                        name="search"
                        size={20}
                        color="#6b6b6b"
                    />

                    <Text style={styles.textoRodape}>
                        Perdido
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.itemRodape}
                    onPress={abrirAnimalEncontrado}
                >
                    <FontAwesome
                        name="paw"
                        size={20}
                        color="#6b6b6b"
                    />

                    <Text style={styles.textoRodape}>
                        Encontrado
                    </Text>
                </Pressable>

                <Pressable style={styles.itemRodape}>
                    <FontAwesome
                        name="comment-o"
                        size={20}
                        color="#6b6b6b"
                    />

                    <Text style={styles.textoRodape}>
                        Chat
                    </Text>
                </Pressable>

                <View
                    style={[
                        styles.itemRodapeAdocao,
                        styles.itemSelecionado,
                    ]}
                >
                    <FontAwesome
                        name="heart"
                        size={20}
                        color="#ffffff"
                    />

                    <Text style={styles.textoRodapeSelecionado}>
                        Adoção
                    </Text>
                </View>
            </View>

            <Modal
                visible={filtroVisivel}
                transparent
                animationType="fade"
                onRequestClose={() => setFiltroVisivel(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.filtroModalCard}>
                        <View style={styles.modalCabecalho}>
                            <Text style={styles.modalTitulo}>
                                Filtrar animais
                            </Text>

                            <Pressable
                                onPress={() =>
                                    setFiltroVisivel(false)
                                }
                            >
                                <FontAwesome
                                    name="times"
                                    size={20}
                                    color="#292929"
                                />
                            </Pressable>
                        </View>

                        <Text style={styles.filtroModalLabel}>
                            Espécie
                        </Text>
                        {renderFiltroOpcoes(ESPECIES, filtroEspecie, setFiltroEspecie)}

                        <Text style={styles.filtroModalLabel}>
                            Porte
                        </Text>
                        {renderFiltroOpcoes(PORTES, filtroPorte, setFiltroPorte)}

                        <Text style={styles.filtroModalLabel}>
                            Faixa etária
                        </Text>
                        {renderFiltroOpcoes(FAIXAS_ETARIAS, filtroIdade, setFiltroIdade)}

                        <View style={styles.filtroBotoesContainer}>
                            <Pressable
                                style={styles.filtroLimparBotao}
                                onPress={limparFiltros}
                            >
                                <Text style={styles.filtroLimparTexto}>
                                    Limpar
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.filtroAplicarBotao}
                                onPress={() =>
                                    setFiltroVisivel(false)
                                }
                            >
                                <Text style={styles.filtroAplicarTexto}>
                                    Aplicar filtros
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={modalVisivel}
                animationType="slide"
                transparent
                onRequestClose={fecharFormulario}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalCabecalho}>
                            <Text style={styles.modalTitulo}>
                                Novo Animal para Adoção
                            </Text>

                            <Pressable
                                onPress={fecharFormulario}
                            >
                                <FontAwesome
                                    name="times"
                                    size={20}
                                    color="#292929"
                                />
                            </Pressable>
                        </View>

                        <ScrollView
                            style={styles.modalScroll}
                            showsVerticalScrollIndicator={false}
                        >
                            <Pressable
                                style={styles.uploadFoto}
                                onPress={escolherFoto}
                            >
                                {formulario.foto ? (
                                    <Image
                                        source={{
                                            uri: formulario.foto,
                                        }}
                                        style={styles.uploadFotoPreview}
                                    />
                                ) : (
                                    <View
                                        style={styles.uploadFotoVazio}
                                    >
                                        <FontAwesome
                                            name="camera"
                                            size={22}
                                            color="#9b9b9b"
                                        />

                                        <Text
                                            style={styles.uploadFotoTexto}
                                        >
                                            Adicionar foto
                                        </Text>
                                    </View>
                                )}
                            </Pressable>

                            {renderCampo('Nome *', 'nome', 'Nome do animal')}
                            <Text style={styles.campoLabel}>Espécie *</Text>
                            {renderOpcoes(ESPECIES, 'especie')}
                            {renderCampo('Raça *', 'raca', 'Raça do animal')}
                            {renderCampo('Cor *', 'cor', 'Cor predominante')}
                            <Text style={styles.campoLabel}>Porte *</Text>
                            {renderOpcoes(PORTES, 'porte')}
                            <Text style={styles.campoLabel}>Sexo *</Text>
                            {renderOpcoes(SEXOS, 'sexo')}
                            {renderCampo('Idade *', 'idade', 'Idade em anos', { numeric: true, keyboardType: 'numeric' })}
                            <Text style={styles.campoLabel}>Faixa etária *</Text>
                            {renderOpcoes(FAIXAS_ETARIAS, 'faixaEtaria')}
                            {renderCampo('Localização *', 'local', 'Ex: São Paulo - SP')}
                            {renderCampo('Responsável *', 'responsavel', 'Nome do responsável')}
                            {renderCampo('Contato *', 'contato', 'Telefone ou WhatsApp', { keyboardType: 'phone-pad' })}
                            {renderCampo('Descrição *', 'descricao', 'Características, comportamento, cuidados, etc.', { multiline: true, numberOfLines: 4 })}

                            <Pressable
                                style={styles.botaoSalvar}
                                onPress={salvarAnimal}
                            >
                                <Text
                                    style={styles.botaoSalvarTexto}
                                >
                                    Salvar
                                </Text>
                            </Pressable>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!confirmacaoAlvo}
                transparent
                animationType="fade"
                onRequestClose={cancelarAlteracaoStatus}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome
                            name={
                                confirmacaoAlvo?.novoStatus === STATUS_ADOTADO
                                    ? 'check-circle'
                                    : 'heart'
                            }
                            size={30}
                            color="#45a9d5"
                        />

                        <Text style={styles.confirmTitulo}>
                            Confirmar alteração
                        </Text>

                        <Text style={styles.confirmMensagem}>
                            {confirmacaoAlvo?.novoStatus === STATUS_ADOTADO
                                ? 'Tem certeza que esse animal foi adotado?'
                                : 'Tem certeza que deseja voltar o status para "Animal para Adoção"?'}
                        </Text>

                        <View style={styles.confirmBotoesContainer}>
                            <Pressable
                                style={styles.confirmBotaoCancelar}
                                onPress={cancelarAlteracaoStatus}
                            >
                                <Text
                                    style={
                                        styles.confirmBotaoCancelarTexto
                                    }
                                >
                                    Cancelar
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.confirmBotaoConfirmar}
                                onPress={confirmarAlteracaoStatus}
                            >
                                <Text
                                    style={
                                        styles.confirmBotaoConfirmarTexto
                                    }
                                >
                                    Confirmar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={mensagemModal.visivel}
                transparent
                animationType="fade"
                onRequestClose={fecharMensagem}
            >
                <View style={styles.confirmOverlay}>
                    <View style={styles.confirmCard}>
                        <FontAwesome
                            name="info-circle"
                            size={30}
                            color="#45a9d5"
                        />

                        <Text style={styles.confirmTitulo}>
                            {mensagemModal.titulo}
                        </Text>

                        <Text style={styles.confirmMensagem}>
                            {mensagemModal.mensagem}
                        </Text>

                        <Pressable
                            style={styles.confirmBotaoMensagem}
                            onPress={fecharMensagem}
                        >
                            <Text
                                style={
                                    styles.confirmBotaoConfirmarTexto
                                }
                            >
                                OK
                            </Text>
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
        height: Platform.OS === 'android'
            ? 58 + (NativeStatusBar.currentHeight || 0)
            : 58,
        paddingTop: Platform.OS === 'android'
            ? NativeStatusBar.currentHeight || 0
            : 0,
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

    acoesLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 14,
        marginTop: 12,
        marginBottom: 8,
    },

    filtrosTitulo: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#292929',
    },

    filtrosAtivos: {
        fontSize: 11,
        color: '#45a9d5',
        marginTop: 2,
    },

    botoesAcoes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    botaoFiltro: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#45a9d5',
    },

    botaoFiltroAtivo: {
        backgroundColor: '#45a9d5',
    },

    botaoAdicionar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#45a9d5',
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
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e1e1e1',
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
        textShadowOffset: {
            width: 0,
            height: 1,
        },
        textShadowRadius: 3,
    },

    especieAnimal: {
        fontSize: 13,
        color: '#f2f2f2',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: {
            width: 0,
            height: 1,
        },
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

    badgeStatusAdotado: {
        backgroundColor: '#777777',
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
        backgroundColor: '#e9e9e9',
    },

    statusToggleBotao: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
    },

    statusToggleBotaoAdocaoAtivo: {
        backgroundColor: '#45a9d5',
    },

    statusToggleBotaoAdotadoAtivo: {
        backgroundColor: '#777777',
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

    textoRodapeSelecionado: {
        marginTop: 4,
        fontSize: 10,
        color: '#ffffff',
    },

    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(17, 12, 9, 0.45)',
        paddingHorizontal: 20,
    },

    filtroModalCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 20,
    },

    modalCard: {
        maxHeight: '88%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 18,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
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

    filtroModalLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#292929',
        marginTop: 8,
        marginBottom: 8,
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

    filtroBotoesContainer: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },

    filtroLimparBotao: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d8d8d8',
    },

    filtroLimparTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4a4a4a',
    },

    filtroAplicarBotao: {
        flex: 1.5,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#45a9d5',
    },

    filtroAplicarTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
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

    confirmBotaoMensagem: {
        width: '100%',
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#45a9d5',
        marginTop: 4,
    },
});

