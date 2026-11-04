const app = require('./app');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { inicializarSocketChat } = require('./services/chatSocket');
const pool = require('./database/connection');

const PORT = Number(process.env.PORT) || 3000;
const servidor = http.createServer(app);

async function iniciarServidor() {
    try {
        const schema = fs.readFileSync(
            path.join(__dirname, 'database', 'schema.sql'),
            'utf8'
        );
        await pool.query(schema);
    } catch (erro) {
        console.error('Erro ao aplicar o schema do banco:', erro.message);
        process.exitCode = 1;
        return;
    }

    inicializarSocketChat(servidor);
    servidor.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

iniciarServidor();