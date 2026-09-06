
# PetWanted

## Backend

Configure the database variables already used by the project and add a secret for login tokens:

```env
JWT_SECRET=use-a-long-random-value-here
```

Start the backend from the `backend` directory:

```powershell
npm.cmd install
npm.cmd start
```

After logging in, authenticated users can load all lost animals through:

```text
GET /api/animais/perdidos
Authorization: Bearer <token returned by login>
```

