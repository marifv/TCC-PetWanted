const app = require('./app');
const http = require('http');
const { inicializarSocketChat } = require('./services/chatSocket');

const PORT = Number(process.env.PORT) || 3000;
const servidor = http.createServer(app);

inicializarSocketChat(servidor);

servidor.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});