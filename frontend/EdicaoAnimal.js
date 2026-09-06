import { useState } from 'react';
import { Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const ESPECIES = ['Cachorro', 'Gato', 'Outro'];
const PORTES = ['Pequeno', 'Médio', 'Grande'];
const SEXOS = ['Macho', 'Fêmea', 'Não Binarie'];

function valorInicial(animal) {
    return {
        nome: animal?.nome || '',
        especie: animal?.especie || '',
        raca: animal?.raca || '',
        cor: animal?.cor || '',
        porte: animal?.porte || '',
        sexo: animal?.sexo || '',
        local: animal?.local || '',
        data: animal?.data || '',
        descricao: animal?.descricao || '',
    };
}

export default function EdicaoAnimal({ animal, onVoltar, onSalvar }) {
    const [formulario, setFormulario] = useState(valorInicial(animal));
    const [mensagem, setMensagem] = useState('');

    const atualizarCampo = (campo, valor) => {
        setFormulario((atual) => ({ ...atual, [campo]: valor }));
    };

    const salvar = async () => {
        if (!formulario.especie || !formulario.raca || !formulario.cor || !formulario.porte || !formulario.sexo || !formulario.local || !formulario.data) {
            setMensagem('Preencha todos os campos obrigatórios.');
            return;
        }

        const atualizado = await onSalvar({
            nome: formulario.nome,
            especie: formulario.especie,
            raca: formulario.raca,
            cor: formulario.cor,
            porte: formulario.porte,
            sexo: formulario.sexo,
            local: formulario.local,
            data: formulario.data,
            descricao: formulario.descricao,
        });

        if (!atualizado) {
            setMensagem('Não foi possível atualizar o animal.');
        }
    };

    const tipo = animal?.tipo_registro;
    const labelLocal = tipo === 'Perdido' ? 'Local do desaparecimento' : tipo === 'Encontrado' ? 'Local onde foi encontrado' : 'Localização';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <View style={styles.header}>
                <Pressable onPress={onVoltar}>
                    <Text style={styles.back}>‹</Text>
                </Pressable>
                <Text style={styles.title}>Editar animal</Text>
                <View style={styles.headerSpace} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.label}>Nome</Text>
                <TextInput style={styles.input} value={formulario.nome} onChangeText={(valor) => atualizarCampo('nome', valor)} />

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
                <TextInput style={styles.input} value={formulario.local} onChangeText={(valor) => atualizarCampo('local', valor)} />
                <Text style={styles.label}>Data *</Text>
                <TextInput style={styles.input} value={formulario.data} onChangeText={(valor) => atualizarCampo('data', valor)} keyboardType="numeric" />
                <Text style={styles.label}>Descrição</Text>
                <TextInput style={[styles.input, styles.multiline]} value={formulario.descricao} onChangeText={(valor) => atualizarCampo('descricao', valor)} multiline />

                {!!mensagem && <Text style={styles.message}>{mensagem}</Text>}
                <Pressable style={styles.save} onPress={salvar}>
                    <Text style={styles.saveText}>Salvar alterações</Text>
                </Pressable>
            </ScrollView>
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
});
