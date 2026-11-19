const SENHA_FORTE_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function senhaAtendePolitica(senha) {
    return typeof senha === 'string'
        && Buffer.byteLength(senha, 'utf8') <= 72
        && SENHA_FORTE_REGEX.test(senha);
}

module.exports = {
    senhaAtendePolitica,
};
