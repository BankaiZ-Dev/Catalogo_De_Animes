// ========================================================
// API SERVICE - Gerenciamento de Requisições (Com Fallback)
// ========================================================

async function fetchJikan(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.JIKAN_API_URL}${endpoint}`;
    const response = await fetch(url, options);
    
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (!response.ok) throw new Error(`Jikan Erro HTTP: ${response.status}`);
    
    return await response.json();
}

async function fetchTenrai(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.TENRAI_API_URL}${endpoint}`;
    const response = await fetch(url, options);
    
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (!response.ok) throw new Error(`Tenrai Erro HTTP: ${response.status}`);
    
    return await response.json();
}

async function fetchComFallback(endpointJikan, endpointTenrai, options = {}) {
    try {
        return await fetchJikan(endpointJikan, options);
    } catch (error) {
        try {
            const endpointFinal = endpointTenrai || endpointJikan; 
            return await fetchTenrai(endpointFinal, options);
        } catch (errorTenrai) {
            console.error("[API] Ambas as APIs falharam.", errorTenrai);
            throw errorTenrai; 
        }
    }
}

async function apiBuscarAnimes(query, page = 1, signal) {
    const endpoint = `?q=${encodeURIComponent(query)}&limit=${CONFIG.ANIME_LIMIT_PER_PAGE}&page=${page}`;
    return await fetchComFallback(endpoint, endpoint, { signal }); 
}

async function apiBuscarSugestoes(query, signal) {
    const endpoint = `?q=${encodeURIComponent(query)}&limit=7`;
    return await fetchComFallback(endpoint, endpoint, { signal });
}

async function apiObterDetalhesFull(malId) {
    const endpointJikan = `/${malId}/full`;
    const endpointTenrai = `/${malId}/full`; 
    return await fetchComFallback(endpointJikan, endpointTenrai);
}

async function apiObterDadosSimples(malId) {
    return await fetchComFallback(`/${malId}`, `/${malId}`);
}

async function apiObterCalendarioSemanal() {
    let todosAnimes = [];
    let pagina = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        if (pagina > 1) {
            await new Promise(r => setTimeout(r, 500)); 
        }
        
        const urlJikan = `https://api.jikan.moe/v4/schedules?page=${pagina}`;
        const urlTenrai = `https://api.tenrai.org/v1/schedules?page=${pagina}`;
        
        try {
            const json = await fetchComFallback(urlJikan, urlTenrai);
            
            if (json.data) {
                todosAnimes = todosAnimes.concat(json.data);
            }
            
            hasNextPage = json.pagination?.has_next_page || false;
            
        } catch (error) {
            if (error.message === 'RATE_LIMIT') {
                console.warn(`[API] Rate limit atingido na página ${pagina}. Aguardando...`);
                await new Promise(r => setTimeout(r, 1000));
                continue; 
            }
            
            console.error(`[API] Falha crítica ao carregar a página ${pagina} do calendário:`, error);
            throw error; 
        }
        
        if (pagina > 25) break; 
        if (hasNextPage) pagina++;
    }
    
    return { data: todosAnimes };
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