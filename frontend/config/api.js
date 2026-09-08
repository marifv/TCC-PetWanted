import { Platform } from 'react-native';

const API_MODE = process.env.EXPO_PUBLIC_API_MODE || 'local';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || '192.168.0.27';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3000';

export const API_BASE_URL =
    API_MODE === 'render'
        ? 'https://tcc-petwanted.onrender.com/api'
        : Platform.OS === 'android'
            ? `http://${API_HOST}:${API_PORT}/api`
            : `http://localhost:${API_PORT}/api`;

export const API_USUARIOS = `${API_BASE_URL}/usuarios`;
export const API_ANIMAIS = `${API_BASE_URL}/animais`;