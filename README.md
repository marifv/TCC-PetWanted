
# PetWanted

## Backend

Configure the database variables already used by the project and add the secrets for login tokens and transactional email:

```env
JWT_SECRET=use-a-long-random-value-here
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=PetWanted
```

`GOOGLE_CLIENT_ID` must be the Web OAuth client ID from the same Google Cloud project configured in the Android app. Never put a Google client secret in the app.

The backend sends password recovery email through the Brevo transactional email API over HTTPS. Create an API key with transactional email sending permission, verify the sender address in Brevo, and configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` in `backend/.env` and in the backend service's Render environment. Never put the API key in the mobile app or commit it.

## Painel administrativo

O painel web administrativo fica separado do app mobile e é servido pelo backend em `/admin`. As rotas do painel usam contas administrativas separadas das contas de tutores/ONGs, uma sessão em cookie `HttpOnly`, `SameSite=Strict`, HTTPS em produção e permissões `owner` ou `analyst`. O primeiro administrador é criado uma única vez por comando; depois, um `owner` pode convidar outras pessoas pela tela. Não existe cadastro público de administradores.

Configure um segredo exclusivo para as sessões administrativas no ambiente do backend:

```env
ADMIN_JWT_SECRET=gere-um-segredo-aleatorio-com-pelo-menos-32-caracteres
ADMIN_PANEL_URL=https://seu-dominio-do-backend/admin
```

Gere o segredo fora do código e mantenha-o apenas no `.env` local ou no gerenciador de variáveis do serviço, por exemplo no Render. `ADMIN_PANEL_URL` é o endereço usado nos convites por e-mail; em produção deve ser HTTPS. O envio de convites usa o Brevo, portanto `BREVO_API_KEY` e `BREVO_SENDER_EMAIL` também precisam estar configurados.

Após implantar o backend (que aplica as tabelas administrativas pelo `schema.sql`), abra um terminal interativo na pasta `backend` com acesso ao mesmo banco e execute:

```powershell
npm run admin:bootstrap
```

O comando solicita e-mail e senha sem exibir a senha, exige pelo menos 12 caracteres (limite de 72 bytes por usar bcrypt) e só funciona enquanto ainda não existir nenhum administrador. A primeira conta recebe o perfil `owner`. Não passe a senha como argumento de linha de comando. Depois, acesse `https://seu-dominio-do-backend/admin`, entre e convide os demais pelo e-mail. `owner` pode ver estatísticas e gerenciar convites/perfis; `analyst` pode consultar somente estatísticas. Convites expiram em 48 horas e só podem ser usados uma vez. Mantenha pelo menos um `owner` ativo.

O painel mostra usuários ativos nos últimos 30 dias com base em requisições autenticadas (o registro de atividade começa após a implantação), anúncios por estado, matches pendentes e resultados confirmados/rejeitados. A “precisão com feedback” é a proporção de confirmações entre as respostas dos tutores; não representa uma verificação independente do reencontro. Os totais refletem os registros ainda armazenados, e exclusões feitas antes da instalação do painel não podem ser reconstruídas.

For a new PostgreSQL database, run the complete schema script once:

```text
backend/database/schema.sql
```

You can run it in the SQL editor of your PostgreSQL provider (for example, Render or pgAdmin). It creates the `usuarios`, `animais`, `password_reset_requests`, and chat tables, including Google sign-in, photo URLs, and password recovery fields. Run it only for a new, empty database; it does not migrate an existing schema.

For an existing database that does not yet have the password recovery table, run `backend/database/migration_password_reset_requests.sql` once in the provider's SQL editor.

For an existing database, run `backend/database/migration_chat.sql` once before deploying the chat backend. It creates private conversations, message history, and registered mobile device tokens.

Run `backend/database/migration_chat_notifications.sql` to add unread-message tracking. Run `backend/database/migration_remove_contact_fields.sql` to permanently remove previously stored phone and contact fields from an existing database.

Run `backend/database/migration_chat_actions.sql` to enable per-user conversation mute/delete preferences and persist reports. Muting suppresses FCM pushes for that recipient; deleting removes the conversation only from the current user's list. Reports are stored for review.

Run `backend/database/migration_animal_photos.sql` once in an existing database to support up to three photos per animal record. New databases already include this column in `backend/database/schema.sql`.

Animal and profile photos are uploaded by the backend to Cloudinary when the following credentials are set in `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Create a Cloudinary account on its free plan and copy these values from the Cloudinary Console. Keep the API secret private and never commit `backend/.env`. The app stores only each Cloudinary image URL in PostgreSQL; uploads are limited to 1200 × 1200 pixels and use automatic quality/format optimization. Without Cloudinary credentials, the backend keeps using its local `backend/uploads` storage, which is intended only for local development and is not persistent on many hosting providers. Existing local photos are not moved automatically; upload them again after Cloudinary is configured.

Password recovery is available through `POST /api/usuarios/recuperar-senha/enviar-codigo`, `POST /api/usuarios/recuperar-senha/verificar-codigo`, and `POST /api/usuarios/recuperar-senha/redefinir`. Codes expire after 10 minutes, are limited to five verification attempts, and code requests for existing accounts are throttled to one email per minute. The API returns a generic response when requesting a code to avoid revealing whether an address is registered.

Start the backend from the `backend` directory:

```powershell
npm.cmd install
npm.cmd start
```

On Android, the login button sends Google's ID token to the backend for verification. New users complete their PetWanted profile with a name, profile type, and CPF/CNPJ. To link Google to an existing PetWanted account, the user must confirm the existing account password once.

After installing frontend dependencies, rebuild the Android development app so the native Google Sign-In module is included:

```powershell
cd frontend
npx expo run:android
```

## Chat and notifications

The chat authenticates REST and Socket.IO with the existing JWT. PostgreSQL stores conversations and message history; a Socket.IO message is persisted before the server broadcasts `mensagem:nova` to both participants. The Chat tab searches users and opens a private conversation. Firebase push delivery requires a native development/production build; Expo Go does not include the native Firebase Messaging module.

For Android, download `google-services.json` from the Firebase project configured for package `com.petwanted.app` and place it in `frontend/`. The file is ignored by Git. Add a Firebase Admin service account to the backend environment as `FIREBASE_SERVICE_ACCOUNT` (JSON) or `FIREBASE_SERVICE_ACCOUNT_BASE64`; keep this private credential on the server only. Without it, chat works over Socket.IO but push delivery remains disabled. Run `npm install` in both `backend/` and `frontend/` to install the new dependencies and update their lockfiles, then rebuild the Android app after adding the Firebase file.

Authenticated chat endpoints:

- `GET /api/chat/usuarios?q=nome` searches people to start a conversation.
- `GET /api/chat/conversas` lists conversations.
- `POST /api/chat/conversas` accepts `{ "destinatarioId": 12 }`.
- `GET /api/chat/conversas/:id/mensagens` loads history.
- `POST /api/chat/dispositivos` registers the device FCM token.

Socket.IO authenticates with `{ auth: { token } }` and receives `mensagem:enviar` with `{ conversaId, conteudo }`. The callback confirms persistence; `mensagem:nova` is emitted after the message is stored.

After logging in, authenticated users can load all lost animals through:

```text
GET /api/animais/perdidos
Authorization: Bearer <token returned by login>
```
