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
