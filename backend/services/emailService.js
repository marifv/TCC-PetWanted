const nodemailer = require('nodemailer');

async function enviarEmail({ to, subject, html, text }) {
    const user = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '');

    if (!user || !appPassword) {
        throw new Error('Configure GMAIL_USER e GMAIL_APP_PASSWORD no ambiente do backend.');
    }

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        auth: {
            user,
            pass: appPassword
        }
    });

    return transporter.sendMail({
        from: `PetWanted <${user}>`,
        to,
        subject,
        html,
        text
    });
}

module.exports = { enviarEmail };
