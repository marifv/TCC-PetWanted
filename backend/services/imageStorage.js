const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const CLOUDINARY_ENV_VARS = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

function cloudinaryConfigurado() {
    const configuradas = CLOUDINARY_ENV_VARS.filter((nome) => process.env[nome]);
    if (configuradas.length === 0) return false;
    if (configuradas.length !== CLOUDINARY_ENV_VARS.length) {
        throw new Error('Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.');
    }

    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    return true;
}

function extensaoDaImagem(dataUri) {
    const tipo = dataUri.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/i)?.[1]?.toLowerCase();
    const extensoes = { jpeg: 'jpg', jpg: 'jpg', png: 'png', webp: 'webp' };
    return extensoes[tipo] || null;
}

function salvarImagemLocal(dataUri, publicId, req) {
    const extensao = extensaoDaImagem(dataUri);
    if (!extensao) {
        throw new Error('Formato de imagem inválido. Use JPEG, PNG ou WebP.');
    }

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const arquivo = `${publicId}-${Date.now()}.${extensao}`;
    const base64 = dataUri.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '');
    fs.writeFileSync(path.join(UPLOAD_DIR, arquivo), Buffer.from(base64, 'base64'));

    const host = req?.get('host') || 'localhost:3000';
    const protocolo = req?.protocol || 'http';
    return `${protocolo}://${host}/uploads/${arquivo}`;
}

async function salvarImagem(dataUri, pasta, publicId, req) {
    if (!dataUri || typeof dataUri !== 'string') return null;
    if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(dataUri)) {
        throw new Error('A imagem enviada está em um formato inválido.');
    }

    if (!cloudinaryConfigurado()) {
        return salvarImagemLocal(dataUri, publicId, req);
    }

    const resultado = await cloudinary.uploader.upload(dataUri, {
        folder: pasta,
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [{
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 'auto',
            fetch_format: 'auto',
        }],
    });
    return resultado.secure_url;
}

module.exports = { salvarImagem };
