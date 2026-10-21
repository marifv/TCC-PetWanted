
# PetWanted

## Backend

Configure the database variables already used by the project and add a secret for login tokens:

```env
JWT_SECRET=use-a-long-random-value-here
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GMAIL_USER=petwantednoreply@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

`GOOGLE_CLIENT_ID` must be the Web OAuth client ID from the same Google Cloud project configured in the Android app. Never put a Google client secret in the app.

The backend sends password recovery email through Gmail SMTP using Nodemailer. Enable 2-Step Verification on the Gmail account, create an App Password in the Google Account security settings, and put the account address in `GMAIL_USER` and the App Password in `GMAIL_APP_PASSWORD` in `backend/.env`. Do not use your normal Google password or commit these values. The sender address is the Gmail account itself.

Before starting the backend, apply these migrations to the PostgreSQL database in order:

```text
backend/database/migrations/001_google_accounts.sql
backend/database/migrations/002_password_recovery.sql
backend/database/migrations/003_animal_photo_url.sql
```

The first allows Google-only accounts to have no password and adds a unique Google identity to user records. The second stores only hashed, expiring password recovery codes and reset tokens.

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
