// ========================================================
// API SERVICE - Principal + Slot Reserva de Fallback
// ========================================================

const PROVEDORES_CONFIG = {
    TIMEOUT_MS: 4500,

    TENRAI: {
        ativo: true,
        baseUrl: () => (typeof CONFIG !== 'undefined' && CONFIG.TENRAI_API_URL) || 'https://api.tenrai.org/v1'
    },

    RESERVA: {
        ativo: false,
        baseUrl: () => (typeof CONFIG !== 'undefined' && CONFIG.RESERVA_API_URL) || ''
    }
};

// ========================================================
// REQUISIÇÕES INDIVIDUAIS COM CONTROLE DE TIMEOUT
// ========================================================

async function requisicaoComTimeout(url, options = {}) {
    const controller = new AbortController();
    const idTimer = setTimeout(() => controller.abort(), PROVEDORES_CONFIG.TIMEOUT_MS);

    const sinalFinal = options.signal || controller.signal;

    try {
        const resposta = await fetch(url, { ...options, signal: sinalFinal });
        clearTimeout(idTimer);
        return resposta;
    } catch (erro) {
        clearTimeout(idTimer);
        throw erro;
    }
}

async function fetchTenrai(endpoint, options = {}) {
    const baseUrl = PROVEDORES_CONFIG.TENRAI.baseUrl();
    let url;

    if (endpoint.startsWith('http')) {
        url = endpoint;
    } else if (endpoint.startsWith('/schedules')) {
        url = `${baseUrl.replace(/\/anime\/?$/, '')}${endpoint}`;
    } else {
        url = `${baseUrl}${endpoint}`;
    }

    const response = await requisicaoComTimeout(url, options);
    
    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (!response.ok) throw new Error(`Tenrai Erro HTTP: ${response.status}`);
    
    return await response.json();
}

async function fetchApiReserva(endpoint, options = {}) {
    const baseUrl = PROVEDORES_CONFIG.RESERVA.baseUrl();
    if (!PROVEDORES_CONFIG.RESERVA.ativo || !baseUrl) {
        throw new Error('API Reserva não configurada');
    }

    let url;
    if (endpoint.startsWith('http')) {
        url = endpoint;
    } else if (endpoint.startsWith('/schedules')) {
        url = `${baseUrl.replace(/\/anime\/?$/, '')}${endpoint}`;
    } else {
        url = `${baseUrl}${endpoint}`;
    }

    const response = await requisicaoComTimeout(url, options);

    if (response.status === 429) throw new Error('RATE_LIMIT');
    if (!response.ok) throw new Error(`Reserva Erro HTTP: ${response.status}`);

    return await response.json();
}

// ========================================================
// ORQUESTRADOR DE FLUXO
// ========================================================

async function fetchComFallback(endpoint, options = {}) {
    if (PROVEDORES_CONFIG.TENRAI.ativo) {
        try {
            return await fetchTenrai(endpoint, options);
        } catch (erroTenrai) {
            if (erroTenrai.name === 'AbortError' && options.signal?.aborted) {
                throw erroTenrai;
            }
            console.warn('[API] Tenrai falhou ou demorou a responder:', erroTenrai.message);
        }
    }

    if (PROVEDORES_CONFIG.RESERVA.ativo) {
        try {
            console.log('[API] Acionando API Reserva de contingência...');
            return await fetchApiReserva(endpoint, options);
        } catch (erroReserva) {
            console.error('[API] Falha também na API Reserva:', erroReserva.message);
            throw erroReserva;
        }
    }

    throw new Error('Nenhuma API de animes disponível no momento');
}

// ========================================================
// MÉTODOS PÚBLICOS UTILIZADOS PELO APP
// ========================================================

async function apiBuscarAnimes(query, page = 1, signal, limit = 9) {
    const endpoint = `?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}`;
    return await fetchComFallback(endpoint, { signal });
}

async function apiBuscarSugestoes(query, signal) {
    const endpoint = `?q=${encodeURIComponent(query)}&limit=7`;
    return await fetchComFallback(endpoint, { signal });
}

async function apiObterDetalhesFull(malId) {
    const endpoint = `/${malId}/full`;
    return await fetchComFallback(endpoint);
}

async function apiObterDadosSimples(malId) {
    const endpoint = `/${malId}`;
    return await fetchComFallback(endpoint);
}

async function apiObterCalendarioSemanal() {
    let todosAnimes = [];
    let pagina = 1;
    let hasNextPage = true;

    while (hasNextPage) {
        if (pagina > 1) {
            await new Promise(r => setTimeout(r, 500)); 
        }
        
        const endpoint = `/schedules?page=${pagina}`;
        
        try {
            const json = await fetchComFallback(endpoint);
            
            if (json.data) {
                todosAnimes = todosAnimes.concat(json.data);
            }
            
            hasNextPage = json.pagination?.has_next_page || false;
            
        } catch (error) {
            if (error.message === 'RATE_LIMIT') {
                console.warn(`[API] Rate limit atingido na página ${pagina} do calendário. A aguardar...`);
                await new Promise(r => setTimeout(r, 1000));
                continue; 
            }
            
            console.error(`[API] Falha crítica ao carregar página ${pagina} do calendário:`, error);
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