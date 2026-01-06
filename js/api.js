// ========================================================
// API SERVICE - Gerenciamento de Requisições
// ========================================================

async function fetchJikan(endpoint, options = {}) {
    const response = await fetch(`${CONFIG.JIKAN_API_URL}${endpoint}`, options);
    
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    
    return await response.json();
}

async function apiBuscarAnimes(query, page = 1) {
    const endpoint = `?q=${encodeURIComponent(query)}&limit=${CONFIG.ANIME_LIMIT_PER_PAGE}&page=${page}`;
    return await fetchJikan(endpoint);
}

async function apiBuscarSugestoes(query, signal) {
    const endpoint = `?q=${encodeURIComponent(query)}&limit=7`;
    return await fetchJikan(endpoint, { signal });
}

async function apiObterDetalhesFull(malId) {
    return await fetchJikan(`/${malId}/full`);
}

async function apiObterDadosSimples(malId) {
    return await fetchJikan(`/${malId}`);
}

async function apiTraduzirTexto(text) {
    if (!text || text.length < 5) return text || "Sinopse não disponível.";

    try {
        const cleanText = text.replace(/\n/g, ' ').trim();
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(cleanText)}`;
        
        const response = await fetch(url);
        if (!response.ok) return text;

        const data = await response.json();
        let translatedText = '';

        if (data && data[0]) {
            data[0].forEach(segment => {
                if (segment[0]) translatedText += segment[0];
            });
        }
        return translatedText || text;
    } catch (error) {
        console.error("Falha na tradução:", error);
        return text;
    }
}