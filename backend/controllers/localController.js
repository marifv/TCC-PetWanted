async function buscarSugestoesEndereco(req, res) {
    const entrada = String(req.query.input || '').trim();

    if (entrada.length < 3) {
        return res.json({ sugestoes: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ mensagem: 'Busca de endereços não configurada no servidor.' });
    }

    try {
        const resposta = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
            },
            body: JSON.stringify({
                input: entrada,
                languageCode: 'pt-BR',
                includedRegionCodes: ['br'],
            }),
        });

        if (!resposta.ok) {
            console.error('Google Places autocomplete respondeu com status:', resposta.status);
            return res.status(502).json({ mensagem: 'Não foi possível buscar endereços agora.' });
        }

        const dados = await resposta.json();
        const sugestoes = (dados.suggestions || [])
            .map((item) => item.placePrediction)
            .filter((item) => item?.text?.text)
            .slice(0, 5)
            .map((item) => ({
                id: item.placeId,
                endereco: item.text.text,
            }));

        return res.json({ sugestoes });
    } catch (error) {
        console.error('Erro ao consultar Google Places:', error.message);
        return res.status(502).json({ mensagem: 'Não foi possível buscar endereços agora.' });
    }
}

async function obterCoordenadasLugar(req, res) {
    const placeId = String(req.params.placeId || '').trim();
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!placeId || !apiKey) {
        return res.status(apiKey ? 400 : 503).json({ mensagem: 'Não foi possível localizar este endereço.' });
    }

    try {
        const resposta = await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
            {
                headers: {
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'location',
                },
            }
        );

        if (!resposta.ok) {
            console.error('Google Places Details respondeu com status:', resposta.status);
            return res.status(502).json({ mensagem: 'Não foi possível localizar este endereço.' });
        }

        const dados = await resposta.json();
        if (!Number.isFinite(dados.location?.latitude) || !Number.isFinite(dados.location?.longitude)) {
            return res.status(404).json({ mensagem: 'O Google Maps não retornou as coordenadas deste endereço.' });
        }

        return res.json({
            latitude: dados.location.latitude,
            longitude: dados.location.longitude,
        });
    } catch (error) {
        console.error('Erro ao obter coordenadas do Google Places:', error.message);
        return res.status(502).json({ mensagem: 'Não foi possível localizar este endereço.' });
    }
}

module.exports = { buscarSugestoesEndereco, obterCoordenadasLugar };