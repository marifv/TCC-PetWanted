const fs = require('fs');
const os = require('os');
const path = require('path');

const interfaces = os.networkInterfaces();
const addresses = Object.values(interfaces)
    .flat()
    .filter((address) => address && address.family === 'IPv4' && !address.internal)
    .map((address) => address.address);

const ipv4 = addresses.find((address) => address.startsWith('192.168.'))
    || addresses.find((address) => address.startsWith('10.'))
    || addresses.find((address) => address.startsWith('172.'));

if (!ipv4) {
    throw new Error('Nenhum IPv4 privado foi encontrado. Conecte o computador a uma rede e tente novamente.');
}

const envPath = path.join(__dirname, '..', '.env');
const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const mapsKeyLine = existingEnv
    .split(/\r?\n/)
    .find((line) => /^\s*GOOGLE_MAPS_ANDROID_API_KEY\s*=/.test(line))
    || 'GOOGLE_MAPS_ANDROID_API_KEY=';

fs.writeFileSync(
    envPath,
    `EXPO_PUBLIC_API_MODE=local\nEXPO_PUBLIC_API_HOST=${ipv4}\nEXPO_PUBLIC_API_PORT=3000\n${mapsKeyLine}\n`
);
console.log(`API configurada para http://${ipv4}:3000`);