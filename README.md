
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

For a new PostgreSQL database, run the complete schema script once:

```text
backend/database/schema.sql
```

You can run it in the SQL editor of your PostgreSQL provider (for example, Render or pgAdmin). It creates the `usuarios`, `animais`, and `password_reset_requests` tables, including Google sign-in, photo URLs, and password recovery fields. Run it only for a new, empty database; it does not migrate an existing schema.

For an existing database that does not yet have the password recovery table, run `backend/database/migration_password_reset_requests.sql` once in the provider's SQL editor.

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

After logging in, authenticated users can load all lost animals through:

```text
GET /api/animais/perdidos
Authorization: Bearer <token returned by login>
```
