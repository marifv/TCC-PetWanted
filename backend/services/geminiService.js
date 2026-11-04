const { GoogleGenAI } = require('@google/genai');

let indisponivelAte = 0;

const PROMPT_ANALISE = `
Analise a foto do animal e a descricao informada.
Retorne apenas JSON valido, sem markdown.
Use as chaves: especie, porte, pelagem, cores, marcasDistintivas, racaProvavel,
idadeProvavel, caracteristicas, confianca.
cores e marcasDistintivas devem ser arrays de strings.
confianca deve ser um numero entre 0 e 1.
Nao confirme a identidade ou a raça com certeza absoluta.
`.trim();

function criarCliente() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY nao configurada.');
    }

    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function analisarAnimal({ imagemUrl, descricao = '', dadosAnuncio = {} }) {
    if (!imagemUrl) {
        throw new Error('Anuncio sem foto para analise.');
    }

    if (Date.now() < indisponivelAte) {
        throw new Error('Gemini em modo de espera temporario; usando matching local.');
    }

    const respostaImagem = await fetch(imagemUrl);
    if (!respostaImagem.ok) {
        throw new Error('Nao foi possivel baixar a foto do anuncio.');
    }

    const contentType = respostaImagem.headers.get('content-type') || 'image/jpeg';
    if (!contentType.startsWith('image/')) {
        throw new Error('O arquivo do anuncio nao e uma imagem.');
    }

    const bytes = Buffer.from(await respostaImagem.arrayBuffer());
    const ai = criarCliente();
    const modelosConfigurados = [
        process.env.GEMINI_MODEL,
        process.env.GEMINI_FALLBACK_MODELS,
    ].filter(Boolean).join(',').split(',').map((modelo) => modelo.trim()).filter(Boolean);
    const modelos = [...new Set(modelosConfigurados.length ? modelosConfigurados : ['gemini-3.8-flash'])];
    let ultimoErro = null;

    for (const modelo of modelos) {
        for (let tentativa = 1; tentativa <= 2; tentativa += 1) {
            try {
                const resposta = await ai.models.generateContent({
                    model: modelo,
                    contents: [{
                        role: 'user',
                        parts: [
                            { text: `${PROMPT_ANALISE}\nDescricao: ${descricao || 'Nao informada'}\nDados: ${JSON.stringify(dadosAnuncio)}` },
                            { inlineData: { mimeType: contentType.split(';')[0], data: bytes.toString('base64') } },
                        ],
                    }],
                    config: { responseMimeType: 'application/json' },
                });

                const texto = resposta.text?.trim();
                if (!texto) throw new Error('Gemini nao retornou uma resposta.');

                try {
                    return { ...JSON.parse(texto), modelo };
                } catch (erro) {
                    throw new Error('Gemini retornou JSON invalido.');
                }
            } catch (erro) {
                ultimoErro = erro;
                const sobrecarregado = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(erro.message || '');
                if (/503|UNAVAILABLE/i.test(erro.message || '')) {
                    indisponivelAte = Date.now() + 60000;
                }
                if (!sobrecarregado || tentativa === 2) break;
                await new Promise((resolver) => setTimeout(resolver, 500));
            }
        }
    }

    throw new Error(`Gemini indisponivel: ${ultimoErro?.message || 'modelo sem resposta'}`);
}

module.exports = { analisarAnimal };
