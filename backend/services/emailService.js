async function enviarEmail({ to, subject, html, text }) {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'PetWanted';

    if (!apiKey || !senderEmail) {
        const erro = new Error('Configure BREVO_API_KEY e BREVO_SENDER_EMAIL no ambiente do backend.');
        erro.code = 'BREVO_NOT_CONFIGURED';
        throw erro;
    }

    let resposta;
    try {
        resposta = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: senderName, email: senderEmail },
                to: [{ email: to }],
                subject,
                htmlContent: html,
                textContent: text,
            }),
            signal: AbortSignal.timeout(15000),
        });
    } catch (causa) {
        const erro = new Error('Não foi possível conectar à API do Brevo.');
        erro.code = 'BREVO_NETWORK_ERROR';
        erro.cause = causa;
        throw erro;
    }

    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
        const erro = new Error(`A API do Brevo recusou o envio (HTTP ${resposta.status}).`);
        erro.code = 'BREVO_API_ERROR';
        erro.status = resposta.status;
        throw erro;
    }

    return dados;
}

module.exports = { enviarEmail };
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
