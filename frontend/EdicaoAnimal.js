import { useState } from 'react';
import { Image, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { formatarData, formatarEntradaData } from './utils/formatarData';

const ESPECIES = ['Cachorro', 'Gato', 'Outro'];
const PORTES = ['Pequeno', 'Médio', 'Grande'];
const SEXOS = ['Macho', 'Fêmea'];

function valorInicial(animal) {
    return {
        nome: animal?.nome || '',
        especie: animal?.especie || '',
        raca: animal?.raca || '',
        cor: animal?.cor || '',
        porte: animal?.porte || '',
        sexo: animal?.sexo || '',
        local: animal?.local || '',
        data: formatarData(animal?.data),
        idade: animal?.idade || '',
        faixaEtaria: animal?.faixaEtaria || '',
        responsavel: animal?.responsavel || '',
        contato: animal?.contato || '',
        descricao: animal?.descricao || '',
        foto: animal?.foto || null,
    };
}

export default function EdicaoAnimal({ animal, onVoltar, onSalvar }) {
    const [formulario, setFormulario] = useState(valorInicial(animal));
    const [mensagem, setMensagem] = useState('');
    const [confirmacaoSalvarVisivel, setConfirmacaoSalvarVisivel] = useState(false);
    const [confirmacaoVoltarVisivel, setConfirmacaoVoltarVisivel] = useState(false);

    const atualizarCampo = (campo, valor) => {
        setFormulario((atual) => ({ ...atual, [campo]: valor }));
    };

    const escolherFoto = async () => {
        const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissao.granted) {
            setMensagem('Precisamos de acesso à galeria para trocar a foto do animal.');
            return;
        }

        const resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (resultado.canceled) {
            return;
        }

        const arquivo = resultado.assets?.[0];
        const mimeType = arquivo?.mimeType || 'image/jpeg';
        const base64 = arquivo?.base64;
        const extensao = mimeType.split('/')?.[1] || 'jpeg';

        if (!base64) {
            setMensagem('Não foi possível ler a imagem escolhida. Tente outra foto.');
            return;
        }

        const dataUri = `data:image/${extensao};base64,${base64}`;
        atualizarCampo('foto', dataUri);
    };

    const salvar = async () => {
        if (!formulario.nome || !formulario.especie || !formulario.raca || !formulario.cor || !formulario.porte || !formulario.sexo || !formulario.local || !formulario.data) {
            setMensagem('Preencha nome, espécie, raça, cor, porte, sexo, local e data.');
            return;
        }

        const fotoParaEnviar = formulario.foto?.startsWith('data:image/')
            ? formulario.foto
            : null;

        const atualizado = await onSalvar({
            nome: formulario.nome,
            especie: formulario.especie,
            raca: formulario.raca,
            cor: formulario.cor,
            porte: formulario.porte,
            sexo: formulario.sexo,
            local: formulario.local,
            data: formulario.data,
            idade: formulario.idade,
            faixa_etaria: formulario.faixaEtaria,
            responsavel: formulario.responsavel,
            contato: formulario.contato,
            descricao: formulario.descricao,
            foto: fotoParaEnviar,
        });

        if (!atualizado?.id) {
            setMensagem('Não foi possível atualizar o animal.');
        }
    };

    const confirmarSalvar = async () => {
        setConfirmacaoSalvarVisivel(false);
        await salvar();
    };

    const tipo = animal?.tipo_registro;
    const labelLocal = tipo === 'Perdido' ? 'Local do desaparecimento' : tipo === 'Encontrado' ? 'Local onde foi encontrado' : 'Localização';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <View style={styles.header}>
                <Pressable onPress={() => setConfirmacaoVoltarVisivel(true)}>
                    <Text style={styles.back}>‹</Text>
                </Pressable>
                <Text style={styles.title}>Alterar animal</Text>
                <View style={styles.headerSpace} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Pressable style={styles.uploadFoto} onPress={escolherFoto}>
                    {formulario.foto ? (
                        <Image source={{ uri: formulario.foto }} style={styles.uploadFotoPreview} />
                    ) : (
                        <View style={styles.uploadFotoVazio}>
                            <FontAwesome name="camera" size={22} color="#9b9b9b" />
                            <Text style={styles.uploadFotoTexto}>Trocar foto</Text>
                        </View>
                    )}
                </Pressable>

                <Text style={styles.label}>Nome *</Text>
                <TextInput style={styles.input} placeholder="Nome do animal" placeholderTextColor="gray" value={formulario.nome} onChangeText={(valor) => atualizarCampo('nome', valor)} />

                <Text style={styles.label}>Espécie *</Text>
                <View style={styles.options}>
                    {ESPECIES.map((opcao) => (
                        <Pressable key={opcao} style={[styles.option, formulario.especie === opcao && styles.selected]} onPress={() => atualizarCampo('especie', opcao)}>
                            <Text style={[styles.optionText, formulario.especie === opcao && styles.selectedText]}>{opcao}</Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.label}>Raça *</Text>
                <TextInput style={styles.input} value={formulario.raca} onChangeText={(valor) => atualizarCampo('raca', valor)} />
                <Text style={styles.label}>Cor *</Text>
                <TextInput style={styles.input} value={formulario.cor} onChangeText={(valor) => atualizarCampo('cor', valor)} />

                <Text style={styles.label}>Porte *</Text>
                <View style={styles.options}>
                    {PORTES.map((opcao) => (
                        <Pressable key={opcao} style={[styles.option, formulario.porte === opcao && styles.selected]} onPress={() => atualizarCampo('porte', opcao)}>
                            <Text style={[styles.optionText, formulario.porte === opcao && styles.selectedText]}>{opcao}</Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.label}>Sexo *</Text>
                <View style={styles.options}>
                    {SEXOS.map((opcao) => (
                        <Pressable key={opcao} style={[styles.option, formulario.sexo === opcao && styles.selected]} onPress={() => atualizarCampo('sexo', opcao)}>
                            <Text style={[styles.optionText, formulario.sexo === opcao && styles.selectedText]}>{opcao}</Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.label}>{labelLocal} *</Text>
                <TextInput style={styles.input} placeholder={tipo === 'Perdido' ? 'Ex: Parque Ibirapuera, São Paulo - SP' : 'Localização'} placeholderTextColor="gray" value={formulario.local} onChangeText={(valor) => atualizarCampo('local', valor)} />
                <Text style={styles.label}>{tipo === 'Perdido' ? 'Data do desaparecimento' : 'Data'} *</Text>
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor="gray" value={formulario.data} onChangeText={(valor) => atualizarCampo('data', formatarEntradaData(valor))} keyboardType="numeric" />
                {tipo === 'Adocao' && (
                    <>
                        <Text style={styles.label}>Idade</Text>
                        <TextInput style={styles.input} value={formulario.idade} onChangeText={(valor) => atualizarCampo('idade', valor.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
                        <Text style={styles.label}>Faixa etária</Text>
                        <TextInput style={styles.input} value={formulario.faixaEtaria} onChangeText={(valor) => atualizarCampo('faixaEtaria', valor)} />
                        <Text style={styles.label}>Responsável</Text>
                        <TextInput style={styles.input} value={formulario.responsavel} onChangeText={(valor) => atualizarCampo('responsavel', valor)} />
                        <Text style={styles.label}>Contato</Text>
                        <TextInput style={styles.input} value={formulario.contato} onChangeText={(valor) => atualizarCampo('contato', valor)} keyboardType="phone-pad" />
                    </>
                )}
                <Text style={styles.label}>Descrição</Text>
                <TextInput style={[styles.input, styles.multiline]} value={formulario.descricao} onChangeText={(valor) => atualizarCampo('descricao', valor)} multiline />

                {!!mensagem && <Text style={styles.message}>{mensagem}</Text>}
                <Pressable style={styles.save} onPress={() => setConfirmacaoSalvarVisivel(true)}>
                    <Text style={styles.saveText}>Salvar alterações</Text>
                </Pressable>
            </ScrollView>

            <Modal transparent animationType="fade" visible={confirmacaoSalvarVisivel} onRequestClose={() => setConfirmacaoSalvarVisivel(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Salvar alterações</Text>
                        <Text style={styles.modalMessage}>Tem certeza que deseja editar o cadastro deste animal?</Text>
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => setConfirmacaoSalvarVisivel(false)}>
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.modalConfirm} onPress={confirmarSalvar}>
                                <Text style={styles.modalConfirmText}>Salvar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal transparent animationType="fade" visible={confirmacaoVoltarVisivel} onRequestClose={() => setConfirmacaoVoltarVisivel(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Sair sem salvar</Text>
                        <Text style={styles.modalMessage}>Tem certeza que deseja voltar sem salvar as alterações?</Text>
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => setConfirmacaoVoltarVisivel(false)}>
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable style={styles.modalConfirm} onPress={() => { setConfirmacaoVoltarVisivel(false); onVoltar(); }}>
                                <Text style={styles.modalConfirmText}>Voltar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fafafa' },
    header: { height: Platform.OS === 'android' ? 58 + (NativeStatusBar.currentHeight || 0) : 58, paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e1e1e1' },
    back: { fontSize: 36, lineHeight: 36, color: '#292929' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#292929' },
    headerSpace: { width: 30 },
    content: { padding: 20, paddingBottom: 36 },
    uploadFoto: { alignSelf: 'center', width: 140, height: 140, borderRadius: 70, backgroundColor: '#eff7fa', alignItems: 'center', justifyContent: 'center', marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#45a9d5' },
    uploadFotoPreview: { width: '100%', height: '100%' },
    uploadFotoVazio: { alignItems: 'center', justifyContent: 'center' },
    uploadFotoTexto: { color: '#8a8a8a', fontSize: 12, marginTop: 4 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#292929', marginTop: 8, marginBottom: 6 },
    input: { height: 44, marginBottom: 8, paddingHorizontal: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d8d8d8', borderRadius: 8, fontSize: 14 },
    multiline: { height: 90, paddingTop: 10, textAlignVertical: 'top' },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    option: { paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#d8d8d8', backgroundColor: '#ffffff' },
    selected: { backgroundColor: '#45a9d5', borderColor: '#45a9d5' },
    optionText: { fontSize: 13, color: '#4a4a4a' },
    selectedText: { color: '#ffffff', fontWeight: 'bold' },
    message: { color: '#d9534f', marginTop: 10, textAlign: 'center' },
    save: { height: 46, marginTop: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#45a9d5', borderRadius: 10 },
    saveText: { fontSize: 15, fontWeight: 'bold', color: '#ffffff' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modalCard: { width: '90%', backgroundColor: '#ffffff', borderRadius: 14, padding: 20, alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#292929', marginBottom: 10 },
    modalMessage: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'space-between' },
    modalCancel: { flex: 1, backgroundColor: '#eaeaea', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    modalCancelText: { color: '#292929', fontWeight: 'bold' },
    modalConfirm: { flex: 1, backgroundColor: '#45a9d5', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginLeft: 10 },
    modalConfirmText: { color: '#ffffff', fontWeight: 'bold' },
});
