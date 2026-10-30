const expoConfig = require('./app.json').expo;
const fs = require('fs');
const googleServicesFile = './google-services.json';
const firebaseConfigurado = fs.existsSync(`${__dirname}/${googleServicesFile}`);

module.exports = {
  ...expoConfig,
  plugins: firebaseConfigurado
    ? [...expoConfig.plugins, '@react-native-firebase/app', '@react-native-firebase/messaging']
    : expoConfig.plugins,
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