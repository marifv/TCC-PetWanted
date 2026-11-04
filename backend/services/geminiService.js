const { GoogleGenAI } = require('@google/genai');

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
    const resposta = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
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
    if (!texto) {
        throw new Error('Gemini nao retornou uma resposta.');
    }

    try {
        return JSON.parse(texto);
    } catch (erro) {
        throw new Error('Gemini retornou JSON invalido.');
    }
}

module.exports = { analisarAnimal };
