const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCleartextTraffic(config) {
    config = withAndroidManifest(config, (config) => {
        const application = config.modResults.manifest.application?.[0];
        if (application) {
            application.$['android:usesCleartextTraffic'] = 'true';
            application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
        }
        return config;
    });

    return withDangerousMod(config, ['android', async (config) => {
        const resDirectory = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
        fs.mkdirSync(resDirectory, { recursive: true });
        fs.writeFileSync(
            path.join(resDirectory, 'network_security_config.xml'),
            '<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n    <base-config cleartextTrafficPermitted="true" />\n</network-security-config>\n'
        );
        return config;
    }]);
}

module.exports = withCleartextTraffic;