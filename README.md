# PetWanted

## Integrantes

- Mariana Vieira
- Fernando Palmieri
- Leticia Sudan

## Explicação do projeto

O **PetWanted** é uma plataforma para ajudar tutores e ONGs a divulgar animais perdidos, encontrados e disponíveis para adoção.

O aplicativo reúne anúncios de animais perdidos, encontrados e disponíveis para adoção em um só lugar. O usuário pode publicar fotos, informar o local da ocorrência, visualizar os registros em um mapa e conversar diretamente com outras pessoas interessadas.

Uma das dificuldades que o PetWanted pretende reduzir é a perda de informações entre redes sociais e grupos de mensagens. Características do animal, fotos, local do ocorrido e situação do anúncio ficam organizados na própria plataforma. O sistema também sugere possíveis correspondências entre animais perdidos e encontrados e envia notificações aos usuários.

## Tecnologias utilizadas

### Aplicativo mobile

- React Native
- Expo
- JavaScript
- React Native Maps
- Google Places
- Google Sign-In
- Firebase Cloud Messaging
- Socket.IO Client
- Jest e React Native Testing Library

### Backend

- Node.js
- Express
- PostgreSQL
- JWT
- bcrypt
- Socket.IO
- Google Auth Library
- Cloudinary
- Firebase Admin
- Brevo
- Google Gemini
- Jest e Supertest

### Painel administrativo

- HTML
- CSS
- JavaScript
- API REST fornecida pelo backend

## Estrutura do projeto

```text
TCC-PetWanted/
├── frontend/                # Aplicativo mobile com React Native e Expo
│   ├── assets/              # Ícones, imagens e recursos visuais
│   ├── config/              # Configuração da API
│   ├── services/            # Serviços de IA e notificações
│   ├── utils/               # Funções auxiliares
│   ├── App.js               # Fluxo principal e telas de autenticação
│   └── package.json
├── backend/                 # API REST e servidor em tempo real
│   ├── controllers/         # Regras de negócio e respostas das rotas
│   ├── database/            # Conexão PostgreSQL e schema
│   ├── middleware/          # Autenticação de usuários e administradores
│   ├── routes/              # Endpoints da API
│   ├── services/            # Chat, email, IA, Firebase e imagens
│   ├── admin-panel/         # Painel administrativo web
│   ├── tests/               # Testes automatizados
│   ├── app.js               # Configuração do Express
│   ├── server.js            # Inicialização do servidor
│   └── package.json
└── README.md
```

## Funcionalidades

### Usuários

- Cadastro com CPF ou CNPJ
- Login com email e senha
- Login com Google
- Recuperação de senha por código enviado por email
- Edição e exclusão do perfil
- Cadastro e edição de foto de perfil
- Sessão persistida no aplicativo

### Animais

- Cadastro de animais perdidos
- Cadastro de animais encontrados
- Cadastro de animais para adoção
- Até três fotos por anúncio
- Dados de espécie, raça, cor, porte, sexo, idade e localização
- Atualização e exclusão dos registros
- Listagem por categoria
- Visualização em mapa

### Inteligência artificial e correspondências

- Análise de anúncios com Google Gemini
- Comparação entre animais perdidos e encontrados
- Pontuação visual, textual, geográfica e temporal
- Lista de correspondências possíveis
- Aceite ou descarte das sugestões pelo usuário

### Chat

- Busca de usuários
- Conversas privadas
- Histórico de mensagens armazenado no PostgreSQL
- Comunicação em tempo real por Socket.IO
- Contador de mensagens não lidas
- Silenciamento, exclusão e denúncia de conversas
- Notificações por Firebase Cloud Messaging

### Painel administrativo

- Login administrativo separado
- Perfis `owner` e `analyst`
- Estatísticas de usuários e anúncios
- Gerenciamento de administradores e convites
- Registro de auditoria
- Inicialização da primeira conta por terminal

## Manual básico de uso do aplicativo

### 1. Criar uma conta

1. Abra o aplicativo na tela de entrada.
2. Escolha se o perfil será de **Tutor** ou **ONG**.
3. Informe nome, email, CPF ou CNPJ, localização e senha.
4. Confirme a senha e finalize o cadastro.
5. Também é possível entrar ou vincular uma conta pelo Google.

### 2. Entrar e recuperar a conta

1. Informe o email e a senha cadastrados e toque em entrar.
2. Para recuperar o acesso, selecione a opção de recuperação de senha.
3. Informe o email cadastrado e aguarde o código.
4. Digite o código recebido, confira-o e informe a nova senha.

### 3. Consultar anúncios no mapa

1. Após entrar, a tela inicial exibirá o mapa.
2. Toque nos marcadores para visualizar os anúncios próximos.
3. Use o menu inferior para alternar entre **Perdidos**, **Encontrados** e **Adoção**.
4. Abra o perfil de outro usuário ou um anúncio para iniciar um chat.

### 4. Cadastrar um animal perdido

1. Toque em **Perdidos** no menu inferior.
2. Selecione a opção de cadastrar um novo anúncio.
3. Informe nome, espécie, raça, cor, porte, sexo, faixa etária, data, local e descrição.
4. Selecione até três fotos.
5. Confirme o cadastro.

### 5. Cadastrar um animal encontrado

1. Toque em **Encontrados** no menu inferior.
2. Abra o formulário de cadastro.
3. Informe as características do animal, a data e o local onde ele foi encontrado.
4. Adicione fotos e finalize o anúncio.
5. Use o status do anúncio quando o dono ou responsável já tiver sido encontrado.

### 6. Cadastrar ou encontrar um animal para adoção

1. Toque em **Adoção** no menu inferior.
2. Use os filtros de espécie, porte e idade para pesquisar animais.
3. Para anunciar, selecione o botão de cadastrar animal e preencha todos os dados exigidos.
4. Adicione até três fotos e confirme.
5. Quando o animal for adotado, o autor pode atualizar o status do anúncio.

### 7. Editar ou excluir um anúncio

1. Acesse a categoria correspondente ao anúncio.
2. Utilize o filtro **Meus animais** para localizar registros próprios.
3. Abra o menu do anúncio e escolha editar ou excluir.
4. Confirme a ação. A exclusão remove permanentemente o anúncio.

### 8. Usar correspondências sugeridas

1. Abra um anúncio perdido ou encontrado.
2. Caso existam possíveis correspondências, o sistema mostrará os resultados calculados pela inteligência artificial.
3. Consulte as pontuações e os detalhes da sugestão.
4. Confirme como correspondência válida ou descarte o resultado.

### 9. Conversar com outros usuários

1. Toque em **Chat** no menu inferior.
2. Selecione uma conversa existente ou crie uma nova.
3. Para iniciar uma conversa nova, busque o usuário pelo nome.
4. Envie texto ou uma imagem pelo campo de mensagem.
5. O número no ícone de Chat indica mensagens não lidas.
6. Pelo menu da conversa, é possível silenciar, denunciar ou excluir a conversa.

### 10. Gerenciar o perfil

1. Toque no avatar no canto superior da tela inicial.
2. Consulte seus dados pessoais e localização.
3. Toque no botão de edição para alterar nome, contato, localização, foto ou outras informações permitidas.
4. Use **Sair da conta** para encerrar a sessão.
5. A opção **Excluir perfil** remove permanentemente a conta após confirmação.

## Configuração do banco de dados

O projeto utiliza PostgreSQL.

Ao iniciar o backend, o servidor executa o arquivo `backend/database/schema.sql`, responsável pela criação das tabelas utilizadas pelo sistema.

Para um banco novo, execute o schema no PostgreSQL ou deixe o backend aplicá-lo na primeira inicialização.

## Variáveis de ambiente

Os arquivos `backend/.env.example` e `frontend/.env.example` mostram as variáveis utilizadas pelo projeto. Para configurar o ambiente local:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Preencha os arquivos `.env` com as configurações próprias de cada ambiente. Arquivos `.env`, credenciais do Firebase e contas de serviço não devem ser enviados ao repositório.

Em produção, as variáveis devem ser cadastradas diretamente no painel da plataforma de hospedagem. Isso vale principalmente para senha do banco, `JWT_SECRET`, `ADMIN_JWT_SECRET` e chaves privadas dos serviços integrados.

## Requisitos para execução

- Node.js
- npm
- PostgreSQL
- Android Studio ou dispositivo Android
- Conta Google Cloud para login, Maps e Places
- Conta opcional no Cloudinary
- Conta opcional no Brevo
- Conta opcional no Firebase
- Conta opcional no Google Gemini

## Instalação e execução

### Backend

```powershell
cd backend
npm install
npm start
```

O backend ficará disponível em:

```text
http://localhost:3000
```

Verifique o funcionamento em:

```text
http://localhost:3000/api/health
```

### Aplicativo

```powershell
cd frontend
npm install
npm start
```

Para iniciar diretamente no Android:

```powershell
npm run android
```

Para incluir os módulos nativos de Google Sign-In e Firebase:

```powershell
npx expo run:android
```

O script `frontend/scripts/configure-api-env.js` detecta o endereço IPv4 do computador e configura o aplicativo para a rede local.

Em um dispositivo Android físico, não utilize `localhost`. Use o endereço IPv4 do computador e mantenha o computador e o celular na mesma rede.

### Painel administrativo

O painel ficará disponível em:

```text
http://localhost:3000/admin
```

Crie o primeiro administrador:

```powershell
cd backend
npm run admin:bootstrap
```

A primeira conta criada será do tipo `owner`. Convites e demais contas podem ser gerenciados pelo painel.

## Como testar

Backend:

```powershell
cd backend
npm test
```

Frontend:

```powershell
cd frontend
npm test -- --runInBand
```
