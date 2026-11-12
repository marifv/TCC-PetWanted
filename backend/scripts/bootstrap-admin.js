require('dotenv').config();
const bcrypt = require('bcrypt');
const readline = require('node:readline');
const pool = require('../database/connection');

function perguntar(pergunta) {
    const interfaceLinha = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolver) => {
        interfaceLinha.question(pergunta, (resposta) => {
            interfaceLinha.close();
            resolver(resposta.trim());
        });
    });
}

function perguntarSenha(pergunta) {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
        throw new Error('Execute este comando em um terminal interativo para digitar a senha com segurança.');
    }

    return new Promise((resolver, rejeitar) => {
        const entrada = process.stdin;
        let senha = '';
        process.stdout.write(pergunta);
        entrada.setRawMode(true);
        entrada.resume();

        const finalizar = (erro) => {
            entrada.setRawMode(false);
            entrada.removeListener('data', receber);
            process.stdout.write('\n');
            if (erro) rejeitar(erro);
            else resolver(senha);
        };

        const receber = (dados) => {
            for (const caractere of dados.toString()) {
                if (caractere === '\u0003') {
                    finalizar(new Error('Operação cancelada.'));
                    return;
                }
                if (caractere === '\r' || caractere === '\n') {
                    finalizar();
                    return;
                }
                if (caractere === '\u0008' || caractere === '\u007f') {
                    senha = senha.slice(0, -1);
                    continue;
                }
                if (caractere >= ' ') senha += caractere;
            }
        };

        entrada.on('data', receber);
    });
}

async function criarPrimeiroAdmin() {
    if (!process.env.ADMIN_JWT_SECRET || process.env.ADMIN_JWT_SECRET.length < 32) {
        throw new Error('Configure ADMIN_JWT_SECRET com pelo menos 32 caracteres antes de continuar.');
    }
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
        throw new Error('Execute este comando em um terminal interativo para digitar a senha com segurança.');
    }

    const email = (await perguntar('E-mail do primeiro administrador: ')).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw new Error('E-mail inválido.');
    }

    const senha = await perguntarSenha('Senha (mínimo 12 caracteres, entrada oculta): ');
    const confirmacao = await perguntarSenha('Confirme a senha: ');
    if (senha.length < 12 || Buffer.byteLength(senha, 'utf8') > 72 || senha !== confirmacao) {
        throw new Error('As senhas devem coincidir, ter ao menos 12 caracteres e no máximo 72 bytes.');
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(7412, 1)');
        const existentes = await client.query('SELECT COUNT(*)::integer AS quantidade FROM admin_accounts');
        if (Number(existentes.rows[0].quantidade) > 0) {
            throw new Error('Já existe um administrador. Use os convites pelo painel.');
        }

        await client.query(
            `INSERT INTO admin_accounts (email, password_hash, role)
             VALUES ($1, $2, 'owner')`,
            [email, senhaHash]
        );
        await client.query('COMMIT');
        console.log('Primeiro administrador criado. Acesse /admin no domínio do backend.');
    } catch (erro) {
        await client.query('ROLLBACK');
        throw erro;
    } finally {
        client.release();
    }
}

criarPrimeiroAdmin()
    .catch((erro) => {
        console.error(`Não foi possível criar o primeiro administrador: ${erro.message}`);
        process.exitCode = 1;
    })
    .finally(() => pool.end());
