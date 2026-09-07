import { Platform } from 'react-native';

const API_HOST = process.env.EXPO_PUBLIC_API_HOST || 'localhost';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3000';

export const API_BASE_URL = Platform.OS === 'android'
	? `http://${API_HOST}:${API_PORT}/api`
	: `http://localhost:${API_PORT}/api`;

export const API_USUARIOS = `${API_BASE_URL}/usuarios`;
export const API_ANIMAIS = `${API_BASE_URL}/animais`;
