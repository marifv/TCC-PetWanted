const expoConfig = require('./app.json').expo;
const fs = require('fs');
const path = require('path');
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
const caminhoGoogleServices = path.isAbsolute(googleServicesFile)
  ? googleServicesFile
  : path.resolve(__dirname, googleServicesFile);
const firebaseConfigurado = fs.existsSync(caminhoGoogleServices);

module.exports = {
  ...expoConfig,
  plugins: [
    ...expoConfig.plugins,
    'expo-notifications',
    ...(firebaseConfigurado
      ? ['@react-native-firebase/app', '@react-native-firebase/messaging']
      : []),
  ],
  android: {
    ...expoConfig.android,
    ...(firebaseConfigurado ? { googleServicesFile } : {}),
    config: {
      ...expoConfig.android.config,
      googleMaps: {
        ...expoConfig.android.config.googleMaps,
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || '',
      },
    },
  },
};