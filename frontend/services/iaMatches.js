import { API_BASE_URL } from '../config/api';

export async function analisarAnuncio(anuncioId, token) {
    const resposta = await fetch(`${API_BASE_URL}/ia/anuncios/${anuncioId}/analisar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível analisar o anúncio.');
    return dados;
}

export async function listarMatches(token) {
    const resposta = await fetch(`${API_BASE_URL}/ia/matches`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível carregar os potenciais matches.');
    return Array.isArray(dados.matches) ? dados.matches : [];
}

export async function decidirMatch(matchId, decisao, token) {
    const resposta = await fetch(`${API_BASE_URL}/ia/matches/${matchId}/${decisao}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    const dados = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(dados.mensagem || 'Não foi possível registrar sua decisão.');
    return dados;
}
