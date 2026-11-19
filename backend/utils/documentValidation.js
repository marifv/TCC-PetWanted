function digitosVerificadoresValidos(documento, pesos) {
    let soma = 0;

    for (let indice = 0; indice < pesos.length; indice += 1) {
        soma += Number(documento[indice]) * pesos[indice];
    }

    const resto = (soma * 10) % 11;
    return Number(documento[pesos.length]) === (resto === 10 ? 0 : resto);
}

function cpfValido(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    const primeiroValido = digitosVerificadoresValidos(
        cpf,
        [10, 9, 8, 7, 6, 5, 4, 3, 2]
    );
    const segundoValido = digitosVerificadoresValidos(
        cpf,
        [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return primeiroValido && segundoValido;
}

function cnpjValido(cnpj) {
    if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }

    const primeiroValido = digitosVerificadoresValidos(
        cnpj,
        [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );
    const segundoValido = digitosVerificadoresValidos(
        cnpj,
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    );

    return primeiroValido && segundoValido;
}

function documentoValido(documento, tipoPerfil) {
    const normalizado = typeof documento === 'string'
        ? documento.replace(/\D/g, '')
        : '';

    return tipoPerfil === 'Tutor'
        ? cpfValido(normalizado)
        : tipoPerfil === 'ONG'
            ? cnpjValido(normalizado)
            : false;
}

module.exports = {
    cpfValido,
    cnpjValido,
    documentoValido,
};
