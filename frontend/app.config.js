const expoConfig = require('./app.json').expo;

module.exports = {
  ...expoConfig,
  android: {
    ...expoConfig.android,
    config: {
      ...expoConfig.android.config,
      googleMaps: {
        ...expoConfig.android.config.googleMaps,
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || '',
      },
    },
  },
};