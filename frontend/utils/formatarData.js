export function formatarData(data) {
    if (!data) return '-';

    const valor = String(data).trim();
    const iso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (iso) {
        return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }

    const brasileira = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return brasileira ? `${brasileira[1]}/${brasileira[2]}/${brasileira[3]}` : valor;
}

export function formatarEntradaData(valor) {
    const numeros = String(valor || '').replace(/\D/g, '').slice(0, 8);

    if (numeros.length <= 2) return numeros;
    if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;

    return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

export function validarDataNaoFutura(valor) {
    const correspondencia = String(valor || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!correspondencia) {
        return 'Informe uma data válida no formato DD/MM/AAAA.';
    }

    const dia = Number(correspondencia[1]);
    const mes = Number(correspondencia[2]);
    const ano = Number(correspondencia[3]);
    const dataInformada = new Date(ano, mes - 1, dia);

    if (
        dataInformada.getFullYear() !== ano
        || dataInformada.getMonth() !== mes - 1
        || dataInformada.getDate() !== dia
    ) {
        return 'A data informada não existe. Confira o dia, o mês e o ano.';
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataInformada > hoje) {
        return 'A data não pode ser futura. Escolha hoje ou uma data anterior.';
    }

    return null;
}
