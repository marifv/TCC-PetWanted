import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Pressable from './ButtonPressable';
import * as ImagePicker from 'expo-image-picker';
import { formatarData } from './utils/formatarData';
import { API_ANIMAIS } from './config/api';
import GooglePlacesInput from './GooglePlacesInput';
import BottomNavigation from './BottomNavigation';

const ESPECIES = ['Cachorro', 'Gato', 'Outro'];
const PORTES = ['Pequeno', 'Médio', 'Grande'];
const SEXOS = ['Macho', 'Fêmea'];
const FAIXAS_ETARIAS = ['Filhote', 'Jovem', 'Adulto', 'Idoso'];

const STATUS_ADOCAO = 'Animal para Adoção';
const STATUS_ADOTADO = 'Animal Adotado';
const OPCOES_VISUALIZACAO = [
    { chave: 'todos', label: 'Todos', icone: 'globe' },
    { chave: 'meus', label: 'Meus animais', icone: 'user' },
];

function novoFormulario() {
    return { nome: '', especie: '', raca: '', cor: '', porte: '', sexo: '', idade: '', faixaEtaria: '', local: '', local_latitude: null, local_longitude: null, descricao: '', responsavel: '', contato: '', foto: null };
}

function formatarDataAtual() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    return `${dia}/${mes}/${ano}`;
}

export default function AnimalAdocao({ usuarioId, token, nome, fotoPerfil, onVoltar, setTelaAtual, abrirAnimalPerdido, abrirAnimalEncontrado, abrirEdicaoAnimal }) {
    const [animais, setAnimais] = useState([]);
    const letraPerfil = nome ? nome.charAt(0).toUpperCase() : 'U';
    const [visualizacao, setVisualizacao] = useState('todos');
    const [busca, setBusca] = useState('');
    const [menuAbertoId, setMenuAbertoId] = useState(null);

    const [filtroEspecie, setFiltroEspecie] = useState('Todos');
    const [filtroPorte, setFiltroPorte] = useState('Todos');
    const [filtroIdade, setFiltroIdade] = useState('Todos');

    const [filtroVisivel, setFiltroVisivel] = useState(false);

    const [modalVisivel, setModalVisivel] = useState(false);
    const [formulario, setFormulario] = useState(novoFormulario());
    const [salvando, setSalvando] = useState(false);
    const [confirmacaoAlvo, setConfirmacaoAlvo] = useState(null);
    const [confirmacaoEdicaoAlvo, setConfirmacaoEdicaoAlvo] = useState(null);
    const [confirmacaoExclusaoAlvo, setConfirmacaoExclusaoAlvo] = useState(null);

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
            ...(campo === 'local' ? { local_latitude: null, local_longitude: null } : {}),
        }));
    };

    const abrirMensagem = (titulo, mensagem) => {
        Alert.alert(titulo, mensagem, [{ text: 'OK' }]);
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
            base64: true,
        });

        if (!resultado.canceled) {
            const arquivo = resultado.assets[0];
            const dataUri = `data:image/${arquivo.mimeType?.split('/')?.[1] || 'jpeg'};base64,${arquivo.base64}`;
            atualizarCampo('foto', dataUri);
        }
    };

    const salvarAnimal = async () => {
        if (salvando) return;

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

        setSalvando(true);
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
                    local_latitude: formulario.local_latitude,
                    local_longitude: formulario.local_longitude,
                    data_evento: formatarDataAtual(),
                    tipo_registro: 'Adocao',
                    idade: formulario.idade,
                    faixa_etaria: formulario.faixaEtaria,
                    responsavel: formulario.responsavel,
                    contato: formulario.contato,
                    descricao: formulario.descricao,
                    foto: formulario.foto || null,
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
        } finally {
            setSalvando(false);
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
            setConfirmacaoExclusaoAlvo(null);
            abrirMensagem('Animal excluído', 'O animal foi excluído com sucesso.');
        } catch (error) {
            abrirMensagem('Erro', 'Não foi possível conectar ao servidor.');
        }
    };

    const animaisFiltrados = animais.filter((animal) => {
        if (visualizacao === 'meus' && !animal.meuAnimal) {
            return false;
        }

        const termo = busca.trim().toLowerCase();
        if (termo && ![
            animal.nome,
            animal.especie,
            animal.raca,
            animal.local,
        ].some((valor) => (valor || '').toLowerCase().includes(termo))) {
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
                backgroundColor="#eaf4fb"
            />

            <View style={styles.cabecalho}>
                <Pressable style={styles.headerActionButton} onPress={onVoltar} accessibilityLabel="Voltar">
                    <FontAwesome
                        name="arrow-left"
                        size={18}
                        color="#64748B"
                    />
                </Pressable>

                <Text style={styles.titulo}>Animais para Adoção</Text>

                <View style={styles.acoesHeader}>
                    <View style={styles.notificationButton}>
                        <FontAwesome name="bell" size={17} color="#6e8ba3" />
                    </View>

                    <Pressable style={styles.profileButton} onPress={setTelaAtual} accessibilityLabel="Abrir perfil">
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

            <View style={styles.buscaLinha}>
                <View style={styles.buscaContainer}>
                    <FontAwesome name="search" size={16} color="#9b9b9b" style={styles.iconeBusca} />
                    <TextInput
                        style={styles.inputBusca}
                        placeholder="Buscar por nome, raça ou local..."
                        placeholderTextColor="#9b9b9b"
                        value={busca}
                        onChangeText={setBusca}
                    />
                </View>

                <Pressable
                    style={[styles.botaoFiltro, quantidadeFiltrosAtivos > 0 && styles.botaoFiltroAtivo]}
                    onPress={() => setFiltroVisivel(true)}
                    accessibilityLabel={`Filtrar animais${quantidadeFiltrosAtivos > 0 ? `, ${quantidadeFiltrosAtivos} filtros ativos` : ''}`}
                >
                    <FontAwesome name="filter" size={17} color={quantidadeFiltrosAtivos > 0 ? '#ffffff' : '#6e9fc8'} />
                </Pressable>

                <Pressable style={styles.botaoAdicionar} onPress={abrirFormulario} accessibilityLabel="Adicionar animal para adoção">
                    <FontAwesome name="plus" size={18} color="#ffffff" />
                </Pressable>
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
                                : 'Nenhum animal encontrado com essa busca ou filtros.'}
                        </Text>
                    </View>
                )}

                {animaisFiltrados.map((animal) => (
                    <View key={animal.id} style={styles.card}>
                        <View style={styles.cardCabecalho}>
                            <View style={styles.avatarAnimal}>
                                {animal.foto ? (
                                    <Image source={{ uri: animal.foto }} style={styles.avatarAnimalImagem} />
                                ) : (
                                    <FontAwesome name="paw" size={18} color="#6e9fc8" />
                                )}
                            </View>
                            <View style={styles.cardCabecalhoTexto}>
                                <Text style={styles.nomeAnimal} numberOfLines={1}>{animal.nome || 'Animal sem nome'}</Text>
                                <Text style={styles.especieAnimal} numberOfLines={1}>{animal.especie}{animal.raca ? ` · ${animal.raca}` : ''}</Text>
                            </View>
                            {animal.meuAnimal && (
                                <View style={styles.menuWrapper}>
                                    <Pressable
                                        style={styles.menuBotao}
                                        onPress={() => setMenuAbertoId((atual) => atual === animal.id ? null : animal.id)}
                                        accessibilityLabel={`Opções para ${animal.nome || 'animal'}`}
                                    >
                                        <FontAwesome name="ellipsis-h" size={18} color="#49647a" />
                                    </Pressable>
                                    {menuAbertoId === animal.id && (
                                        <View style={styles.menuDropdown}>
                                            <Pressable
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setMenuAbertoId(null);
                                                    setConfirmacaoEdicaoAlvo(animal);
                                                }}
                                            >
                                                <FontAwesome name="pencil" size={14} color="#5791ca" />
                                                <Text style={styles.menuItemTexto}>Editar</Text>
                                            </Pressable>
                                            <Pressable
                                                style={styles.menuItem}
                                                onPress={() => {
                                                    setMenuAbertoId(null);
                                                    setConfirmacaoExclusaoAlvo(animal.id);
                                                }}
                                            >
                                                <FontAwesome name="trash" size={14} color="#c75a5a" />
                                                <Text style={[styles.menuItemTexto, styles.menuItemExcluir]}>Excluir</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                        <View style={styles.fotoContainer}>
                            {animal.foto ? (
                                <Image
                                    source={{ uri: animal.foto }}
                                    style={styles.foto}
                                    resizeMode="cover"
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

                            <View
                                style={[
                                    styles.badgeStatus,
                                    animal.status === STATUS_ADOTADO &&
                                        styles.badgeStatusAdotado,
                                ]}
                            >
                                <Text style={[
                                    styles.badgeStatusTexto,
                                    animal.status === STATUS_ADOTADO && styles.badgeStatusTextoAdotado,
                                ]}>
                                    {animal.status}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoContainer}>
                            <View style={styles.chipsContainer}>
                                <Text style={styles.infoChip}>Cor <Text style={styles.infoChipValor}>{animal.cor || '-'}</Text></Text>
                                <Text style={styles.infoChip}>Porte <Text style={styles.infoChipValor}>{animal.porte || '-'}</Text></Text>
                                <Text style={styles.infoChip}>Sexo <Text style={styles.infoChipValor}>{animal.sexo || '-'}</Text></Text>
                                <Text style={styles.infoChip}>Idade <Text style={styles.infoChipValor}>{animal.idade} anos</Text></Text>
                                <Text style={styles.infoChip}>Faixa <Text style={styles.infoChipValor}>{animal.faixaEtaria || '-'}</Text></Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="map-marker"
                                    size={14}
                                    color="#6e9fc8"
                                />

                                <Text style={styles.textoComIcone} numberOfLines={2}>
                                    {animal.local}
                                </Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="user"
                                    size={13}
                                    color="#6e9fc8"
                                />

                                <Text style={styles.textoComIcone} numberOfLines={1}>
                                    Responsável: {animal.responsavel}
                                </Text>
                            </View>

                            <View style={styles.linhaComIcone}>
                                <FontAwesome
                                    name="phone"
                                    size={13}
                                    color="#6e9fc8"
                                />

                                <Text style={styles.textoComIcone} numberOfLines={1}>
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
                                    color="#6e9fc8"
                                />

                                <Text style={styles.textoComIcone}>
                                    Cadastrado em: {formatarData(animal.data)}
                                </Text>
                            </View>

                            {animal.meuAnimal && (
                                <View style={styles.botoesContainer}>
                                    <View style={styles.statusToggleContainer}>
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
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>

            <BottomNavigation
                active="adocao"
                onMap={onVoltar}
                onLost={abrirAnimalPerdido}
                onFound={abrirAnimalEncontrado}
                containerStyle={styles.rodape}
            />

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
                            keyboardShouldPersistTaps="handled"
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
                            <Text style={styles.campoLabel}>Localização *</Text>
                            <GooglePlacesInput
                                style={styles.campoInput}
                                placeholder="Ex: São Paulo - SP"
                                value={formulario.local}
                                onChangeText={(valor) => atualizarCampo('local', valor)}
                                onLocationSelected={(coordenadas) => setFormulario((atual) => ({ ...atual, local_latitude: coordenadas.latitude, local_longitude: coordenadas.longitude }))}
                                token={token}
                            />
                            {renderCampo('Responsável *', 'responsavel', 'Nome do responsável')}
                            {renderCampo('Contato *', 'contato', 'Telefone ou WhatsApp', { keyboardType: 'phone-pad' })}
                            {renderCampo('Descrição ', 'descricao', 'Características, comportamento, cuidados, etc.', { multiline: true, numberOfLines: 4 })}

                            <Pressable
                                style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
                                onPress={salvarAnimal}
                                disabled={salvando}
                            >
                                {salvando && <ActivityIndicator size="small" color="#ffffff" />}
                                <Text style={styles.botaoSalvarTexto}>
                                    {salvando ? 'Salvando...' : 'Salvar'}
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
                            style={styles.confirmBotaoConfirmar}
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
                                abrirEdicaoAnimal(animal, (atualizado) => setAnimais((atual) => atual.map((item) => item.id === atualizado.id ? { ...atualizado, status: atualizado.status || item.status, meuAnimal: true } : item)));
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
                        <FontAwesome name="trash" size={30} color="#DC2626" />
                        <Text style={styles.confirmTitulo}>Excluir animal</Text>
                        <Text style={styles.confirmMensagem}>Tem certeza que deseja excluir este animal?</Text>
                        <View style={styles.confirmBotoesContainer}>
                            <Pressable style={styles.confirmBotaoCancelar} onPress={() => setConfirmacaoExclusaoAlvo(null)}>
                                <Text style={styles.confirmBotaoCancelarTexto}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={[styles.confirmBotaoConfirmar, styles.confirmBotaoDestrutivo]} onPress={() => {
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
        backgroundColor: '#eaf4fb',
    },

    cabecalho: {
        height: Platform.OS === 'android'
            ? 58 + (NativeStatusBar.currentHeight || 0)
            : 58,
        paddingTop: Platform.OS === 'android'
            ? NativeStatusBar.currentHeight || 0
            : 0,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#eaf4fb',
    },

    headerActionButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: '#ffffff',
        elevation: 2,
    },

    profileButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: '#75a9d8',
        elevation: 2,
    },

    titulo: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#29465e',
    },

    acoesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    notificationButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        backgroundColor: '#ffffff',
        elevation: 2,
    },

    avatar: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#75a9d8',
        borderRadius: 18,
        overflow: 'hidden',
    },

    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },

    avatarText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    segmentoContainer: {
        flexDirection: 'row',
        marginTop: 2,
        marginHorizontal: 18,
        padding: 3,
        backgroundColor: '#dcebf7',
        borderRadius: 24,
    },

    segmentoBotao: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        minHeight: 36,
        borderRadius: 20,
    },

    segmentoBotaoSelecionado: {
        backgroundColor: '#5791ca',
        elevation: 2,
    },

    segmentoTexto: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#65829a',
    },

    segmentoTextoSelecionado: {
        color: '#ffffff',
    },

    buscaLinha: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 12,
    },

    buscaContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 42,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        elevation: 2,
    },

    iconeBusca: {
        marginRight: 8,
    },

    inputBusca: {
        flex: 1,
        fontSize: 12,
        color: '#29465e',
    },

    botaoFiltro: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        elevation: 2,
    },

    botaoFiltroAtivo: {
        backgroundColor: '#5791ca',
    },

    botaoAdicionar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5791ca',
        elevation: 3,
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
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e1edf5',
        overflow: 'hidden',
        elevation: 2,
    },

    cardCabecalho: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 8,
        backgroundColor: '#ffffff',
        zIndex: 2,
    },

    avatarAnimal: {
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 17,
        backgroundColor: '#e4f0f8',
        overflow: 'hidden',
    },

    avatarAnimalImagem: {
        width: 34,
        height: 34,
    },

    cardCabecalhoTexto: {
        flex: 1,
        justifyContent: 'center',
    },

    menuWrapper: {
        position: 'relative',
        zIndex: 3,
    },

    menuBotao: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        backgroundColor: '#eef6fb',
    },

    menuDropdown: {
        position: 'absolute',
        top: 34,
        right: 0,
        width: 118,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        elevation: 7,
        shadowColor: '#29465e',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 7,
    },

    menuItem: {
        minHeight: 34,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        gap: 8,
    },

    menuItemTexto: {
        fontSize: 12,
        fontWeight: '600',
        color: '#38566e',
    },

    menuItemExcluir: {
        color: '#b94d4d',
    },

    fotoContainer: {
        position: 'relative',
        backgroundColor: '#cfe3f2',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 96,
    },

    foto: {
        width: '100%',
        height: 96,
        backgroundColor: '#cfe3f2',
    },

    fotoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cfe3f2',
    },

    nomeAnimal: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#29465e',
    },

    especieAnimal: {
        fontSize: 10,
        color: '#6c879b',
    },

    badgeStatus: {
        position: 'absolute',
        top: 8,
        left: 10,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#d6eee2',
    },

    badgeStatusAdotado: {
        backgroundColor: '#e5edf3',
    },

    badgeStatusTexto: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#24734b',
    },

    badgeStatusTextoAdotado: {
        color: '#587084',
    },

    infoContainer: {
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: 10,
    },

    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginBottom: 6,
    },

    infoChip: {
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: '#edf5fa',
        fontSize: 10,
        color: '#6b8192',
    },

    infoChipValor: {
        fontWeight: 'bold',
        color: '#38566e',
    },

    infoLabel: {
        fontWeight: 'bold',
        color: '#38566e',
    },

    linhaComIcone: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
        marginBottom: 4,
    },

    textoComIcone: {
        flex: 1,
        fontSize: 11,
        color: '#49647a',
        lineHeight: 15,
    },

    descricao: {
        fontSize: 11,
        color: '#38566e',
        marginTop: 3,
        marginBottom: 5,
        lineHeight: 15,
    },

    botoesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
        marginTop: 7,
    },

    statusToggleContainer: {
        flex: 1,
        flexDirection: 'row',
        gap: 3,
        padding: 3,
        minHeight: 36,
        borderRadius: 22,
        backgroundColor: '#e5f0f8',
    },

    statusToggleBotao: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
    },

    statusToggleBotaoAdocaoAtivo: {
        backgroundColor: '#5791ca',
    },

    statusToggleBotaoAdotadoAtivo: {
        backgroundColor: '#5791ca',
    },

    statusToggleTexto: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#65829a',
        textAlign: 'center',
    },

    statusToggleTextoAtivo: {
        color: '#ffffff',
    },

    rodape: {
        paddingBottom: Platform.OS === 'android' ? 10 : 8,
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
        borderRadius: 16,
        padding: 20,
    },

    modalCard: {
        maxHeight: '88%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
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
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#ffffff',
    },

    opcaoBotaoSelecionada: {
        backgroundColor: '#5791ca',
        borderColor: '#5791ca',
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
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#ffffff',
    },

    filtroLimparTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },

    filtroAplicarBotao: {
        flex: 1.5,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#5791ca',
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
        borderColor: '#CBD5E1',
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
        borderColor: '#CBD5E1',
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
        backgroundColor: '#5791ca',
        borderRadius: 8,
    },

    botaoSalvarTexto: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    botaoDesabilitado: {
        backgroundColor: '#94A3B8',
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
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#ffffff',
    },

    confirmBotaoCancelarTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
    },

    confirmBotaoConfirmar: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: '#5791ca',
    },

    confirmBotaoConfirmarTexto: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#ffffff',
    },

    confirmBotaoDestrutivo: {
        backgroundColor: '#DC2626',
    },

    
});
