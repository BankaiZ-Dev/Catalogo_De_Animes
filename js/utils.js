// ========================================================
// UTILS.JS - Ferramentas e Componentes Visuais Genéricos
// ========================================================

function debounce(func, delay) {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            func.apply(context, args);
        }, delay);
    };
}

function handleImageError(imageElement) {
    const placeholder = (typeof CONFIG !== 'undefined') ? CONFIG.PLACEHOLDER_IMAGE : 'img/placeholder.png';
    imageElement.onerror = null;
    imageElement.src = placeholder;
}

function showGlobalLoading(message = 'Carregando...') {
    if (DOM.loading.texto) DOM.loading.texto.textContent = message;
    if (DOM.loading.overlay) DOM.loading.overlay.classList.remove('oculto');
}

function hideGlobalLoading() {
    if (DOM.loading.overlay) DOM.loading.overlay.classList.add('oculto');
}

function showToast(message, type = 'info') {
    const container = DOM.notificacoes.toastContainer;
    if (!container) return;

    const suportaPopover = 'popover' in HTMLElement.prototype && 'showPopover' in container;

    if (suportaPopover) {
        try {
            container.hidePopover(); 
            container.showPopover();
        } catch (e) { }
    } else {
        container.classList.remove('oculto');
        container.style.display = 'flex';
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fade-out 0.5s forwards';
        setTimeout(() => {
            toast.remove();
            
            if (container.children.length === 0) {
                if (suportaPopover) {
                    container.hidePopover();
                } else {
                    container.classList.add('oculto');
                }
            }
        }, 500);
    }, 3000);
}

function traduzirListaGeneros(genresArray) {
    if (!genresArray || genresArray.length === 0) return 'N/A';
    const mapa = (typeof MAPA_GENEROS !== 'undefined') ? MAPA_GENEROS : {};
    return genresArray.map(g => mapa[g.name] || g.name).join(', ');
}

async function traduzirSinopse(text) {
    if (!text || text.length < 5) return text || "Sinopse não disponível.";
    try {
        const cleanText = text.replace(/\n/g, ' ').trim();
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=${encodeURIComponent(cleanText)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro Tradução');
        const data = await response.json();
        let translatedText = '';
        if (data && data[0]) {
            data[0].forEach(segment => {
                if (segment[0]) translatedText += segment[0];
            });
        }
        return translatedText || text;
    } catch (error) {
        return text;
    }
}

function obterIconePlataforma(nomePlataforma) {
    const nome = nomePlataforma.toLowerCase();
    let domain = '';

    if (nome.includes('crunchyroll')) domain = 'crunchyroll.com';
    else if (nome.includes('netflix')) domain = 'netflix.com';
    else if (nome.includes('amazon') || nome.includes('prime')) domain = 'primevideo.com';
    else if (nome.includes('disney')) domain = 'disneyplus.com';
    else if (nome.includes('hbo') || nome.includes('max')) domain = 'max.com';
    else {
        domain = nome.replace(/\s+/g, '') + '.com';
    }
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}