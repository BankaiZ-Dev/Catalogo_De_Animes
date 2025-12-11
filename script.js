// ========================================================
// CATÁLOGO DE ANIMES - SCRIPT REORGANIZADO
// ========================================================
// Estrutura:
// 1. Estado da Aplicação
// 2. Funções Auxiliares
// 3. Storage & Modo Escuro
// 4. CRUD do Catálogo
// 5. Renderização de Cards
// 6. Busca e API
// 7. Modais
// 8. Sistema de Favoritos
// 9. Modo de Visualização
// 10. PWA & Service Worker
// 11. Event Listeners
// 12. Inicialização
// ========================================================

// ========================================================
// 1. ESTADO DA APLICAÇÃO
// ========================================================

let debounceTimer;
let catalogoPessoal = {};
let paginaAtual = 1;
let termoBuscaAtual = '';
let currentViewMode = 'grid';
let newWorker;

// ========================================================
// 2. FUNÇÕES AUXILIARES
// ========================================================

function debounce(func, delay) {
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
    imageElement.onerror = null;
    imageElement.src = CONFIG.PLACEHOLDER_IMAGE;
}

function showGlobalLoading(message = 'Carregando...') {
    DOM.loading.texto && (DOM.loading.texto.textContent = message);
    DOM.loading.overlay?.classList.remove('oculto');
}

function hideGlobalLoading() {
    DOM.loading.overlay?.classList.add('oculto');
}

function showToast(message, type = 'info') {
    if (!DOM.notificacoes.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;
    DOM.notificacoes.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fade-out 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function traduzirListaGeneros(genresArray) {
    if (!genresArray || genresArray.length === 0) return 'N/A';
    return genresArray.map(g => MAPA_GENEROS[g.name] || g.name).join(', ');
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

function renderizarNumerosPaginacao(paginaAtual, totalPaginas) {
    const container = DOM.paginacao.numerosContainer;
    if (!container) return;
    
    container.innerHTML = ''; 

    const criarBotao = (num) => {
        const btn = document.createElement('button');
        btn.className = `btn-pagina-numero ${num === paginaAtual ? 'ativo' : ''}`;
        btn.textContent = num;
        btn.onclick = () => {
            if (num !== paginaAtual) {
                buscarAnimes(termoBuscaAtual, num);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        return btn;
    };

    const criarDots = () => {
        const span = document.createElement('span');
        span.className = 'paginacao-dots';
        span.textContent = '...';
        return span;
    };

    container.appendChild(criarBotao(1));

    let inicio = Math.max(2, paginaAtual - 1);
    let fim = Math.min(totalPaginas - 1, paginaAtual + 1);

    if (inicio > 2) {
        container.appendChild(criarDots());
    }

    for (let i = inicio; i <= fim; i++) {
        container.appendChild(criarBotao(i));
    }

    if (fim < totalPaginas - 1) {
        container.appendChild(criarDots());
    }

    if (totalPaginas > 1) {
        container.appendChild(criarBotao(totalPaginas));
    }
}

// ========================================================
// 3. STORAGE & MODO ESCURO
// ========================================================

function carregarCatalogo() { 
    const data = localStorage.getItem(STORAGE_KEYS.CATALOGO); 
    if (data) {
        catalogoPessoal = JSON.parse(data);
        // Migração automática - garante que campo 'favorite' existe
        Object.keys(catalogoPessoal).forEach(malId => {
            if (!catalogoPessoal[malId].hasOwnProperty('favorite')) {
                catalogoPessoal[malId].favorite = false;
            }
        });
        salvarCatalogo();
    }
}

function salvarCatalogo() {
    localStorage.setItem(STORAGE_KEYS.CATALOGO, JSON.stringify(catalogoPessoal));
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, isDarkMode ? 'true' : 'false');
}

function aplicarModoEscuroInicial() {
    const isDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
}

function exportarBackup() {
    if (Object.keys(catalogoPessoal).length === 0) return showToast("Catálogo vazio!", "info");
    const dadosJSON = JSON.stringify(catalogoPessoal, null, 2);
    const blob = new Blob([dadosJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_animes_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Backup baixado!", "success");
}

function importarBackup(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (typeof dados !== 'object') throw new Error();
            if (confirm("Isso substituirá seu catálogo atual. Continuar?")) {
                catalogoPessoal = dados;
                salvarCatalogo();
                carregarAnimesSalvos();
                showToast("Restaurado!", "success");
            }
        } catch (error) {
            showToast("Arquivo inválido.", "error");
        }
    };
    leitor.readAsText(arquivo);
    event.target.value = '';
}

// ========================================================
// 4. CRUD DO CATÁLOGO
// ========================================================

function adicionarRapido(malId, tituloEncoded, posterUrl, maxEpisodes, type, year) {
    const titulo = decodeURIComponent(tituloEncoded);
    adicionarAoCatalogo(malId, titulo, posterUrl, maxEpisodes, 'Quero Ver', type, year);
}

function adicionarAoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial = 'Quero Ver', type = 'TV', year = '----') {
    if (!catalogoPessoal.hasOwnProperty(malId)) {
        catalogoPessoal[malId] = {
            mal_id: malId,
            title: titulo,
            poster: posterUrl,
            status: statusInicial,
            episode: 0,
            season: 1,
            maxEpisodes: maxEpisodes,
            dateAdded: new Date().toISOString(),
            type: type,
            year: year,
            favorite: false
        };
        if (statusInicial === 'Concluído' && maxEpisodes) catalogoPessoal[malId].episode = maxEpisodes;
        
        salvarCatalogo();
        showToast(`Anime adicionado como "${statusInicial}"!`, 'success');

        // Atualiza card in-place
        const cardAntigo = getCardAnime(malId);
        if (cardAntigo) {
            const animeDados = {
                mal_id: malId,
                title: titulo,
                images: { jpg: { image_url: posterUrl } },
                episodes: maxEpisodes,
                type: type,
                year: year
            };
            const novoCard = renderizarCardAnime(animeDados, true, {}, true);
            cardAntigo.replaceWith(novoCard);
        }
    } else {
        showToast('Este anime já está no seu catálogo!', 'info');
    }
}

function removerDoCatalogo(malId) {
    if (!confirm("Tem certeza que deseja remover este anime? Todo o progresso será perdido.")) {
        return;
    }

    if (catalogoPessoal.hasOwnProperty(malId)) {
        const animeTitulo = catalogoPessoal[malId].title;
        
        const dadosParaReset = {
            mal_id: malId,
            title: catalogoPessoal[malId].title,
            images: { jpg: { image_url: catalogoPessoal[malId].poster } },
            episodes: catalogoPessoal[malId].maxEpisodes,
            type: catalogoPessoal[malId].type,
            year: catalogoPessoal[malId].year
        };

        delete catalogoPessoal[malId];
        salvarCatalogo();

        const card = getCardAnime(malId);
        const isSearchMode = DOM.busca.campo.value.trim().length > 0 || (DOM.busca.resultados && !DOM.busca.resultados.classList.contains('oculto'));

        if (isSearchMode) {
            if (card) {
                const novoCardElement = renderizarCardAnime(dadosParaReset, false, {}, true);
                card.replaceWith(novoCardElement);
            }
        } else {
            if (card) {
                card.style.transition = 'opacity 0.3s, transform 0.3s';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => card.remove(), 300);
            }
            if (Object.keys(catalogoPessoal).length === 0) {
                setTimeout(() => carregarAnimesSalvos(), 300);
            }
        }

        showToast(`"${animeTitulo}" removido do catálogo.`, 'error');
        fecharModal();
    }
}

function atualizarStatusAnime(malId, novoStatus) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        const anime = catalogoPessoal[malId];
        anime.status = novoStatus;
        if (novoStatus === 'Concluído' && anime.maxEpisodes) {
            anime.episode = anime.maxEpisodes;
            // SUBSTITUIÇÃO AQUI (Usa Helper do DOM.js)
            const inputEp = getInputEpisodios(malId); 
            if (inputEp) inputEp.value = anime.maxEpisodes;
            updateProgressoDisplay(malId, anime.season, anime.episode, anime.maxEpisodes);
        }
        salvarCatalogo();
        carregarAnimesSalvos();
    }
}

function updateProgressoDisplay(malId, season, episode, maxEpisodes) {
    const progressoElement = getTextoProgresso(malId);
    if (progressoElement) progressoElement.textContent = `Ep ${episode}${maxEpisodes ? ` / ${maxEpisodes}` : ''}`;
    
    const barraElement = getBarraProgresso(malId);
    if (barraElement && maxEpisodes && maxEpisodes > 0) {
        let pct = (episode / maxEpisodes) * 100;
        if (pct < 0) pct = 0;
        if (pct > 100) pct = 100;
        barraElement.style.width = `${pct}%`;
    }
}

function quickUpdate(malId, change) {
    if (!catalogoPessoal.hasOwnProperty(malId)) return;
    const savedData = catalogoPessoal[malId];
    const statusBefore = savedData.status;

    let newValue = savedData.episode + change;
    if (newValue < 0) newValue = 0;
    savedData.episode = newValue;

    if (savedData.episode === 0) savedData.status = 'Quero Ver';
    else if (savedData.maxEpisodes && savedData.episode >= savedData.maxEpisodes) {
        savedData.status = 'Concluído';
        savedData.episode = savedData.maxEpisodes;
    } else if (savedData.episode > 0) {
        savedData.status = 'Em Andamento';
    }

    salvarCatalogo();

    const card = getCardAnime(malId);

    const inputElement = getInputEpisodios(malId);
    if (inputElement) inputElement.value = savedData.episode;

    const progressoTexto = getTextoProgresso(malId);
    if (progressoTexto) {
        const episodesTotal = savedData.maxEpisodes ? ` / ${savedData.maxEpisodes}` : '';
        progressoTexto.textContent = `Ep ${savedData.episode}${episodesTotal}`;
    }

    const barra = getBarraProgresso(malId);
    if (barra && savedData.maxEpisodes > 0) {
        let pct = (savedData.episode / savedData.maxEpisodes) * 100;
        if (pct > 100) pct = 100;
        barra.style.width = `${pct}%`;
    }

    if (savedData.status !== statusBefore) {
        const filtroAtual = DOM.filtros.status ? DOM.filtros.status.value : 'todos';
        let deveSairDaTela = false;

        if (filtroAtual === 'favoritos') {
            if (!savedData.favorite) deveSairDaTela = true;
        } else if (filtroAtual !== 'todos' && filtroAtual !== savedData.status) {
            deveSairDaTela = true;
        }

        if (deveSairDaTela) {
            if (card) {
                card.style.transition = "opacity 0.5s, transform 0.5s";
                card.style.opacity = "0";
                card.style.transform = "scale(0.95)";
                
                setTimeout(() => {
                    card.classList.add('oculto');
                    card.style.display = 'none';
                    card.style.opacity = "";
                    card.style.transform = "";
                    atualizarVisualDoCard(card, savedData);
                }, 500);
            }
        } else {
            if (card) {
                atualizarVisualDoCard(card, savedData);
            }
        }

        let tipoToast = 'info';
        if (savedData.status === 'Concluído') tipoToast = 'success';
        else if (savedData.status === 'Em Andamento') tipoToast = 'warning';

        showToast(`Status atualizado para: ${savedData.status}`, tipoToast);
    }
}

function atualizarVisualDoCard(card, savedData) {
    const statusInfo = getStatusData(savedData.status);
    
    card.classList.remove('status-concluido', 'status-em-andamento', 'status-quero-ver');
    card.classList.add(statusInfo.class);

    const etiqueta = card.querySelector('.etiqueta-status');
    if (etiqueta) {
        etiqueta.classList.remove('status-concluido', 'status-em-andamento', 'status-quero-ver');
        etiqueta.classList.add(statusInfo.class);
        etiqueta.textContent = statusInfo.label;
    }
}

function atualizarEpisodio(malId, novoEpisodio) {
    const newEpisodeInt = parseInt(novoEpisodio);
    if (!catalogoPessoal.hasOwnProperty(malId) || isNaN(newEpisodeInt) || newEpisodeInt < 0) return;
    quickUpdate(malId, newEpisodeInt - catalogoPessoal[malId].episode);
}

function incrementarEpisodio(malId) {
    quickUpdate(malId, 1);
}

function decrementarEpisodio(malId) {
    quickUpdate(malId, -1);
}

function concluirAnimeRapido(malId) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        const anime = catalogoPessoal[malId];
        
        if (anime.maxEpisodes) {
            anime.episode = anime.maxEpisodes;
        }
        anime.status = 'Concluído';
        
        salvarCatalogo();
        
        const card = getCardAnime(malId);
        
        if (card) {
            const inputElement = getInputEpisodios(malId);
            if (inputElement) inputElement.value = anime.episode;

            const progressoTexto = getTextoProgresso(malId);
            if (progressoTexto) {
                const episodesTotal = anime.maxEpisodes ? ` / ${anime.maxEpisodes}` : '';
                progressoTexto.textContent = `Ep ${anime.episode}${episodesTotal}`;
            }

            const barra = getBarraProgresso(malId);
            if (barra) {
                barra.style.width = '100%';
            }

            card.classList.remove('status-quero-ver', 'status-em-andamento');
            card.classList.add('status-concluido');

            const etiqueta = card.querySelector('.etiqueta-status');
            if (etiqueta) {
                etiqueta.classList.remove('status-quero-ver', 'status-em-andamento');
                etiqueta.classList.add('status-concluido');
                etiqueta.textContent = 'Concluído ✅';
            }
        }
        
        showToast('Anime marcado como Concluído! 🎉', 'success');
        fecharModal();
    }
}

// ========================================================
// 5. RENDERIZAÇÃO DE CARDS
// ========================================================

function getStatusData(status) {
    switch (status) {
        case 'Concluído':
            return { class: 'status-concluido', label: 'Concluído ✅' };
        case 'Em Andamento':
            return { class: 'status-em-andamento', label: 'Em Andamento 🟠' };
        default:
            return { class: 'status-quero-ver', label: 'Quero Ver 📘' };
    }
}

function renderizarCardAnime(animeAPI, isSaved = false, savedData = {}, returnElement = false) {
    const malId = animeAPI.mal_id;
    const isSavedFinal = catalogoPessoal.hasOwnProperty(malId);
    const finalSavedData = isSavedFinal ? catalogoPessoal[malId] : savedData;
    const posterUrl = animeAPI.images?.jpg?.image_url || finalSavedData.poster || CONFIG.PLACEHOLDER_IMAGE;
    const titulo = animeAPI.title_english || animeAPI.title;
    const tituloEncoded = encodeURIComponent(titulo).replace(/'/g, "%27");
    
    const detalhesBtn = `
        <button onclick="abrirModal(${malId})" class="btn-base btn-detalhes btn-icone-acao" title="Detalhes/Gerenciar">
            <svg class="icone-acao-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="width: 18px; height: 18px;">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
        </button>`;
    
    const favoriteBadge = (isSavedFinal && finalSavedData.favorite) ? '<div class="favorite-badge" title="Favorito">⭐</div>' : '';
    const tipoTraduzido = MAPA_TIPOS_MIDIA[animeAPI.type || finalSavedData.type || 'TV'] || (animeAPI.type || 'TV');
    const anoAnime = animeAPI.year || (animeAPI.aired && animeAPI.aired.prop && animeAPI.aired.prop.from ? animeAPI.aired.prop.from.year : null) || finalSavedData.year || '----';

    let statusHTML;
    let cardClass = '';

    if (isSavedFinal) {
        const savedData = catalogoPessoal[malId];
        const statusInfo = getStatusData(savedData.status);
        cardClass = statusInfo.class;
        const episodesTotal = savedData.maxEpisodes ? ` / ${savedData.maxEpisodes}` : '';
        let porcentagem = (savedData.maxEpisodes && savedData.maxEpisodes > 0) ? (savedData.episode / savedData.maxEpisodes) * 100 : 0;
        if (porcentagem > 100) porcentagem = 100;
        const dataAdicao = savedData.dateAdded ? new Date(savedData.dateAdded).toLocaleDateString('pt-BR') : '--/--';
        const btnFavorito = `<button onclick="toggleFavorite(${malId})" class="btn-base btn-favorite ${savedData.favorite ? 'active' : ''}" title="${savedData.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">⭐</button>`;
        
        statusHTML = `
            <span class="etiqueta-status ${statusInfo.class}">${statusInfo.label}</span>
            <div class="progresso-linha-topo">
                <p class="progresso-texto-inline">
                    <span id="ep-atual-${malId}">Ep ${savedData.episode}${episodesTotal}</span>
                </p>
                <div class="controle-individual">
                    <button class="btn-progresso btn-menos" onclick="decrementarEpisodio(${malId})">-</button>
                    <input type="number" id="episode-input-${malId}" value="${savedData.episode}" min="0" class="input-progresso-base" onchange="atualizarEpisodio(${malId}, this.value)" />
                    <button class="btn-progresso btn-mais" onclick="incrementarEpisodio(${malId})">+</button>
                </div>
            </div>
            <div class="barra-progresso-fundo">
                <div class="barra-progresso-preenchimento" id="bar-prog-${malId}" style="width: ${porcentagem}%"></div>
            </div>
            <div class="card-meta-info">
                <span class="tag-tipo">${tipoTraduzido}</span>
                <span>Lançado em: ${anoAnime}</span>
            </div>
            <div class="card-acoes-compactas">
                <div style="display: flex; flex-direction: column; margin-right: auto;">
                    <span style="font-size: 0.65em; opacity: 0.8;">Adicionado em:</span>
                    <span class="card-meta-info" style="margin:0; font-weight:bold;">${dataAdicao}</span>
                </div>
                ${btnFavorito}
                ${detalhesBtn}
            </div>`;
    } else {
        const textoEpisodios = animeAPI.episodes ? `${animeAPI.episodes} Episódios` : 'Episódios: N/A';
        statusHTML = `
            <p class="card-destaque-info">${textoEpisodios}</p>
            <div class="card-meta-info" style="margin: 10px 0 15px 0;">
                <span class="tag-tipo">${tipoTraduzido}</span>
                <span>Lançado em: ${anoAnime}</span>
            </div>
            <div class="card-acoes-compactas">
                <button onclick="adicionarRapido(${malId}, '${tituloEncoded}', '${posterUrl}', ${animeAPI.episodes}, '${animeAPI.type}', '${anoAnime}')" class="btn-add-destaque" title="Adicionar a Quero Ver">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                ${detalhesBtn}
            </div>`;
    }

    const cardElement = document.createElement('div');
    cardElement.className = `card-anime ${cardClass}`;
    cardElement.dataset.malId = malId;
    cardElement.innerHTML = `
        ${favoriteBadge}
        <img src="${posterUrl}" alt="Poster" class="card-poster" loading="lazy" onerror="handleImageError(this)">
        <div class="card-info" style="display: flex; flex-direction: column;">
            <h2 class="card-titulo">${titulo}</h2>
            <div class="card-status-pessoal" style="flex-grow: 1; display: flex; flex-direction: column;">
                ${statusHTML}
            </div>
        </div>`;
    
    if (returnElement) return cardElement;
    DOM.cards.lista.appendChild(cardElement);
}

function carregarAnimesSalvos() {
    DOM.cards.lista.innerHTML = '';
    termoBuscaAtual = '';
    paginaAtual = 1;
    DOM.paginacao.container?.classList.add('oculto');
    DOM.busca.resultados?.classList.add('oculto');

    let animesArray = Object.values(catalogoPessoal);
    
    if (animesArray.length === 0) {
        DOM.cards.lista.innerHTML = '<h2 style="width:100%; text-align:center; padding: 40px;">Seu Catálogo está vazio.<br>Pesquise por um anime acima!</h2>';
        DOM.filtros.status?.classList.add('oculto');
        DOM.filtros.ordenacao?.classList.add('oculto');
        return;
    }

    DOM.filtros.status?.classList.remove('oculto');
    DOM.filtros.ordenacao?.classList.remove('oculto');
    DOM.busca.botaoVoltar?.classList.add('oculto');

    const tipoOrdenacao = DOM.filtros.ordenacao?.value || 'data-desc';
    animesArray.sort((a, b) => {
        switch (tipoOrdenacao) {
            case 'az': return a.title.localeCompare(b.title);
            case 'za': return b.title.localeCompare(a.title);
            case 'data-asc': return new Date(a.dateAdded) - new Date(b.dateAdded);
            case 'data-desc':
            default: return new Date(b.dateAdded) - new Date(a.dateAdded);
        }
    });

    for (const savedData of animesArray) {
        renderizarCardAnime({
            mal_id: savedData.mal_id,
            title: savedData.title,
            images: { jpg: { image_url: savedData.poster } },
            type: savedData.type,
            year: savedData.year
        });
    }
    filtrarAnimesSalvos();
}

function filtrarAnimesSalvos() {
    const statusSelecionado = DOM.filtros.status?.value || 'todos';
    const termoBusca = DOM.busca.campo?.value.toLowerCase() || '';
    const cards = DOM.cards.lista.querySelectorAll('.card-anime');
    
    cards.forEach(card => {
        const malId = card.dataset.malId;
        const animeData = catalogoPessoal[malId];
        let mostrarCard = true;
        
        if (statusSelecionado === 'favoritos') {
            if (!animeData || !animeData.favorite) mostrarCard = false;
        } else if (statusSelecionado !== 'todos') {
            if (!animeData || animeData.status !== statusSelecionado) mostrarCard = false;
        }
        
        if (termoBusca) {
            if (!animeData || !animeData.title.toLowerCase().includes(termoBusca)) mostrarCard = false;
        }
        
        if (mostrarCard) {
            card.classList.remove('oculto');
            card.style.display = 'flex';
        } else {
            card.classList.add('oculto');
        }
    });
}  

// ========================================================
// 6. BUSCA E API
// ========================================================

async function buscarAnimes(query, page = 1) {
    showGlobalLoading(`Buscando página ${page}...`);
    DOM.cards.lista.innerHTML = '';
    termoBuscaAtual = query;
    paginaAtual = page;
    DOM.busca.resultados?.classList.add('oculto');
    DOM.busca.resultados && (DOM.busca.resultados.innerHTML = '');

    if (query.trim() === '') {
        DOM.paginacao.container?.classList.add('oculto');
        carregarAnimesSalvos();
        hideGlobalLoading();
        return;
    }

    DOM.filtros.status?.classList.add('oculto');
    DOM.filtros.ordenacao?.classList.add('oculto');
    DOM.busca.botaoVoltar?.classList.remove('oculto');

    try {
        const response = await fetch(`${CONFIG.JIKAN_API_URL}?q=${encodeURIComponent(query)}&limit=${CONFIG.ANIME_LIMIT_PER_PAGE}&page=${page}`);
        if (!response.ok) throw new Error(`Erro HTTP!`);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            data.data.forEach(anime => renderizarCardAnime(anime));
            
            if (DOM.paginacao.container) {
                DOM.paginacao.container.classList.remove('oculto');
                const totalPaginasAPI = data.pagination.last_visible_page || 1;
                renderizarNumerosPaginacao(page, totalPaginasAPI);
                DOM.paginacao.botaoAnterior.disabled = (page === 1);
                DOM.paginacao.botaoProxima.disabled = !data.pagination.has_next_page;
            }
        } else {
            DOM.cards.lista.innerHTML = '<p style="text-align: center; width: 100%;">Nenhum anime encontrado.</p>';
            DOM.paginacao.container?.classList.add('oculto');
        }
    } catch (error) {
        DOM.cards.lista.innerHTML = '<p style="text-align: center; width: 100%;">Erro na conexão com a API.</p>';
    } finally {
        hideGlobalLoading();
    }
}

function mudarPagina(direcao) {
    const novaPagina = paginaAtual + direcao;
    if (novaPagina < 1) return;
    paginaAtual = novaPagina;
    buscarAnimes(termoBuscaAtual, paginaAtual);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function buscarAnimesEmTempoReal() {
    if (!DOM.busca.campo || !DOM.busca.resultados) return;

    const query = DOM.busca.campo.value.trim();
    if (query.length < 3 || (termoBuscaAtual && query === termoBuscaAtual)) {
        DOM.busca.resultados.classList.add('oculto');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.JIKAN_API_URL}?q=${encodeURIComponent(query)}&limit=7`);
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            let html = '';
            data.data.forEach(anime => {
                html += `
                    <div class="resultado-item" onclick="selecionarSugestao(${anime.mal_id}, '${(anime.title_english || anime.title).replace(/'/g, "\\'")}')">
                        <img src="${anime.images.jpg.small_image_url || CONFIG.PLACEHOLDER_IMAGE}" class="resultado-imagem">
                        <span class="resultado-titulo">${anime.title_english || anime.title}</span>
                    </div>`;
            });
            DOM.busca.resultados.innerHTML = html;
            DOM.busca.resultados.classList.remove('oculto');
        } else {
            DOM.busca.resultados.classList.add('oculto');
        }
    } catch (error) {
        DOM.busca.resultados.classList.add('oculto');
    }
}

const buscarAnimesEmTempoRealDebounced = debounce(buscarAnimesEmTempoReal, 400);

function selecionarSugestao(malId, titulo) {
    if (!DOM.busca.resultados || !DOM.busca.campo) return;
    DOM.busca.resultados.classList.add('oculto');
    DOM.busca.resultados.innerHTML = '';
    DOM.busca.campo.value = titulo;
    buscarAnimes(titulo);
}

function limparTextoBusca() {
    if (DOM.busca.campo) {
        DOM.busca.campo.value = '';
        DOM.busca.campo.focus();
        DOM.busca.botaoLimpar?.classList.add('oculto');
        DOM.busca.resultados?.classList.add('oculto');
    }
}

function resetarInterfaceDeBusca() {
    DOM.busca.campo && (DOM.busca.campo.value = '');
    DOM.busca.botaoLimpar?.classList.add('oculto');
    DOM.busca.resultados?.classList.add('oculto');
    DOM.busca.botaoVoltar?.classList.add('oculto');
    carregarAnimesSalvos();
}

// ========================================================
// 7. MODAIS & STREAMING
// ========================================================

function fecharModal() {
    DOM.modais.anime?.classList.add('oculto');
    const iframe = DOM.modais.anime?.querySelector('iframe');
    if (iframe) iframe.src = '';
    DOM.modais.animeInfo && (DOM.modais.animeInfo.innerHTML = '');
}

async function obterLinksStreaming(animeData) {
    try {
        const tituloParaBusca = animeData.title_english || animeData.title;
        const todosOsLinks = [];
        
        if (animeData.streaming && animeData.streaming.length > 0) {
            animeData.streaming.forEach(stream => {
                todosOsLinks.push({
                    nome: stream.name,
                    url: stream.url,
                    tipo: 'oficial',
                    icon: obterIconePlataforma(stream.name)
                });
            });
        }
        
        Object.values(PLATAFORMAS_STREAMING).forEach(plataforma => {
            const urlBusca = plataforma.baseUrl + encodeURIComponent(tituloParaBusca);
            todosOsLinks.push({
                nome: plataforma.nome,
                url: urlBusca,
                icon: plataforma.icon,
                cor: plataforma.cor,
                tipo: 'busca'
            });
        });
        
        return todosOsLinks;
    } catch (error) {
        console.error('Erro ao obter links de streaming:', error);
        return [];
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

function renderizarAbaStreaming(links) {
    const linksOficiais = links.filter(link => link.tipo === 'oficial');
    const linksBusca = links.filter(link => link.tipo === 'busca');
    
    let html = '<div class="streaming-container">';
    
    if (linksOficiais.length > 0) {
        html += `
            <div class="streaming-section">
                <h3 class="streaming-titulo">✅ Licenciamento Oficial</h3>
                <p class="streaming-descricao">
                    Links registrados no banco de dados global.
                    <br>
                    <span style="font-size: 0.85em; color: var(--cor-primaria);">
                        ⚠️ Nota: Podem redirecionar para a tela inicial se não estiverem disponíveis no Brasil.
                    </span>
                </p>
                <div class="streaming-grid">
                    ${linksOficiais.map(link => `
                        <a href="${link.url}" target="_blank" class="streaming-link oficial" rel="noopener noreferrer">
                            <img src="${link.icon}" alt="${link.nome}" class="streaming-icon" onerror="this.style.display='none'">
                            <span class="streaming-nome">${link.nome}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="streaming-section">
            <h3 class="streaming-titulo">🔍 Buscar nas Plataformas</h3>
            <p class="streaming-descricao">Clique para buscar automaticamente este anime na plataforma</p>
            <div class="streaming-grid">
                ${linksBusca.map(link => `
                    <a href="${link.url}" target="_blank" class="streaming-link busca" style="border-left: 4px solid ${link.cor}" rel="noopener noreferrer">
                        <img src="${link.icon}" alt="${link.nome}" class="streaming-icon" onerror="this.style.display='none'">
                        <span class="streaming-nome">${link.nome}</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
    
    html += '</div>';
    return html;
}

function mudarAba(event, nomeAba) {
    const modal = event.target.closest('.modal-conteudo');
    
    modal.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('ativo'));
    modal.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('oculto');
        content.classList.remove('ativo');
    });

    if (nomeAba !== 'trailer') {
        const trailerContainer = modal.querySelector('#trailer iframe');
        if (trailerContainer) {
            const urlAtual = trailerContainer.src;
            trailerContainer.src = ''; 
            trailerContainer.src = urlAtual;
        }
    }

    event.target.classList.add('ativo');
    const conteudoAlvo = modal.querySelector('#' + nomeAba);
    if (conteudoAlvo) {
        conteudoAlvo.classList.remove('oculto');
        conteudoAlvo.classList.add('ativo');
    }
}

async function abrirModal(malId) {
    const animeModal = DOM.modais.anime;
    const modalInfo = DOM.modais.animeInfo;
    if (modalInfo) modalInfo.innerHTML = `
        <div style="text-align:center; padding: 50px 0;">
            <div class="spinner" style="border-top-color: #3f51b5; margin: 0 auto 15px auto;"></div>
            <p class="loading-text modal-loading-text-content">Carregando detalhes...</p>
        </div>`;
    if (animeModal) animeModal.classList.remove('oculto');

    try {
        const response = await fetch(`${CONFIG.JIKAN_API_URL}/${malId}/full`);
        if (!response.ok) throw new Error('Falha API');
        const data = await response.json();
        const anime = data.data;

        const sinopseTraduzida = await traduzirSinopse(anime.synopsis || 'Sinopse não disponível.');
        const anoLancamento = anime.year || anime.aired?.prop?.from?.year || 'N/A';
        const generos = traduzirListaGeneros(anime.genres);
        const tipoMidia = MAPA_TIPOS_MIDIA[anime.type] || anime.type || 'N/A';

        if (catalogoPessoal.hasOwnProperty(malId)) {
            const salvo = catalogoPessoal[malId];
            // Se o salvo estiver ruim E o novo estiver bom
            if ((!salvo.year || salvo.year === '----' || salvo.year === 'undefined') && anoLancamento !== 'N/A') {
                
                // 1. Atualiza no banco de dados
                salvo.year = anoLancamento;
                salvarCatalogo();
                
                // 2. Atualiza o card que está atrás do modal imediatamente
                const card = getCardAnime(malId);
                if (card) {
                    // Procura o span que tem o ano e atualiza o texto
                    const spans = card.querySelectorAll('.card-meta-info span');
                    spans.forEach(span => {
                        if (span.textContent.includes('Lançado em:') || span.textContent.includes('----')) {
                            span.textContent = `Lançado em: ${anoLancamento}`;
                        }
                    });
                }
                console.log(`🔧 Ano do anime ${salvo.title} corrigido para ${anoLancamento}`);
            }
        }

        const statusTraduzido = anime.status === 'Finished Airing' ? 'Concluído' : anime.status === 'Currently Airing' ? 'Em Exibição' : anime.status;
        let trailerEmbedUrl = anime.trailer?.embed_url ? anime.trailer.embed_url.replace(/[?&]autoplay=1/gi, '') + '&rel=0' : null;

        const isSaved = catalogoPessoal.hasOwnProperty(malId);
        
        let acoesHTML = '';
        if (isSaved) {
            acoesHTML = `
                <div class="modal-actions-row">
                    <button onclick="concluirAnimeRapido(${malId})" class="btn-modal-action btn-modal-concluir" title="Marcar como Concluído">
                        ✅ Marcar Concluído
                    </button>
                    <button onclick="removerDoCatalogo(${malId})" class="btn-modal-action btn-modal-excluir" title="Remover do Catálogo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;
        }

        const linksStreaming = await obterLinksStreaming(anime);
        const streamingHTML = renderizarAbaStreaming(linksStreaming);

        const trailerAbaHTML = trailerEmbedUrl 
            ? `<div id="trailer" class="tab-content oculto">
                <div class="modal-trailer-container">
                    <iframe src="${trailerEmbedUrl}" frameborder="0" allowfullscreen></iframe>
                </div>
              </div>`
            : `<div id="trailer" class="tab-content oculto">
                <div class="trailer-indisponivel">
                    <p>🎬 Trailer não disponível</p>
                </div>
              </div>`;

        modalInfo.innerHTML = `
            <h2 id="modal-titulo">${anime.title_english || anime.title}</h2>
            
            <div class="modal-poster-detalhes">
                <img id="modal-poster" src="${anime.images.jpg.large_image_url}" alt="Poster">
                
                <div id="modal-detalhes-rapidos">
                    <div style="flex-grow: 1;">
                        <p><strong>Tipo:</strong> ${tipoMidia}</p>
                        <p><strong>Gêneros:</strong> ${generos}</p>
                        <p><strong>Episódios:</strong> ${anime.episodes || 'N/A'}</p>
                        <p><strong>Status:</strong> ${statusTraduzido}</p>
                        <p><strong>Lançado em:</strong> ${anoLancamento}</p>
                    </div>
                    ${acoesHTML}
                </div>
            </div>
            
            <div class="modal-tabs">
                <button class="tab-button ativo" onclick="mudarAba(event, 'sinopse')">📖 Sinopse</button>
                <button class="tab-button" onclick="mudarAba(event, 'trailer')">🎥 Trailer</button>
                <button class="tab-button" onclick="mudarAba(event, 'streaming')">📺 Onde Assistir</button>
            </div>

            <div class="modal-tab-conteudo">
                <div id="sinopse" class="tab-content ativo">
                    <div class="sinopse-texto">
                        ${sinopseTraduzida}
                    </div>
                </div>
                
                ${trailerAbaHTML}
                
                <div id="streaming" class="tab-content oculto">
                    ${streamingHTML}
                </div>
            </div>`;

    } catch (error) {
        if (modalInfo) modalInfo.innerHTML = '<p style="text-align:center; color: red;">Não foi possível carregar detalhes.</p>';
        console.error(error);
    }
}

// ========================================================
// 7b. ESTATÍSTICAS & ALEATORIEDADE
// ========================================================

function calcularEstatisticas() {
    const animes = Object.values(catalogoPessoal);
    const totalAnimes = animes.length;
    let totalEps = 0;
    let totalConcluidos = 0;
    
    animes.forEach(anime => {
        totalEps += parseInt(anime.episode) || 0;
        if (anime.status === 'Concluído') totalConcluidos++;
    });
    
    const minutos = totalEps * 24;
    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    
    DOM.statsValores.totalAnimes.textContent = totalAnimes;
    DOM.statsValores.totalEpisodios.textContent = totalEps;
    DOM.statsValores.tempoTotal.textContent = (dias > 0 ? `${dias}d ` : '') + `${horas}h`;
    DOM.statsValores.concluidos.textContent = totalConcluidos;
    
    DOM.modais.stats?.classList.remove('oculto');
}

function sugerirAnimeAleatorio() {
    const animesCandidatos = Object.values(catalogoPessoal).filter(anime => anime.status === 'Quero Ver');
    if (animesCandidatos.length === 0) return showToast("Lista 'Quero Ver' vazia!", "info");
    
    showGlobalLoading("Sorteando...");
    setTimeout(() => {
        const index = Math.floor(Math.random() * animesCandidatos.length);
        hideGlobalLoading();
        abrirModal(animesCandidatos[index].mal_id);
        showToast(`Sorteado!`, "success");
    }, 600);
}

// ========================================================
// 8. SISTEMA DE FAVORITOS
// ========================================================

function toggleFavorite(malId) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        catalogoPessoal[malId].favorite = !catalogoPessoal[malId].favorite;
        const isFavorite = catalogoPessoal[malId].favorite;
        salvarCatalogo();

        const card = getCardAnime(malId);
        if (!card) return;

        const btn = card.querySelector('.btn-favorite');
        if (btn) {
            btn.classList.toggle('active', isFavorite);
            btn.title = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
        }

        let badge = card.querySelector('.favorite-badge');
        if (isFavorite && !badge) {
            card.insertAdjacentHTML('afterbegin', '<div class="favorite-badge" title="Favorito">⭐</div>');
        } else if (!isFavorite && badge) {
            badge.style.animation = 'badgeDisappear 0.3s ease-out forwards';
            setTimeout(() => badge.remove(), 300); 
        }

        const deveSair = DOM.filtros.status?.value === 'favoritos' && !isFavorite;
        if (deveSair) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.9)';

            setTimeout(() => {
                card.classList.add('oculto');
                card.style.cssText = '';
            }, 300);
        }

        showToast(
            isFavorite ? '⭐ Adicionado aos favoritos!' : '❌ Removido dos favoritos',
            isFavorite ? 'fav-add' : 'fav-remove'
        );
    }
}

// ========================================================
// 9. MODO DE VISUALIZAÇÃO
// ========================================================

function setViewMode(mode) {
    currentViewMode = mode;
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    
    DOM.cards.lista.classList.remove('compact-view', 'list-view');
    
    if (mode === 'compact') DOM.cards.lista.classList.add('compact-view');
    else if (mode === 'list') DOM.cards.lista.classList.add('list-view');
    
    DOM.visualizacao.botoes.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });
}

function aplicarModoVisualizacaoInicial() {
    const savedMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) || 'grid';
    setViewMode(savedMode);
}

// ========================================================
// 10. PWA & SERVICE WORKER
// ========================================================

function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('✅ Service Worker registrado:', reg);

                    if (reg.waiting) {
                        newWorker = reg.waiting;
                        showUpdateNotification();
                    }

                    reg.addEventListener('updatefound', () => {
                        newWorker = reg.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showUpdateNotification();
                            }
                        });
                    });
                })
                .catch(err => console.error('❌ Erro SW:', err));
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            localStorage.setItem('app_updated', 'true');
            window.location.reload();
        });
    }
}

function showUpdateNotification() {
    const updateToast = DOM.notificacoes.pwaUpdateToast;
    const btnAgora = DOM.notificacoes.pwaUpdateBtnAgora;
    const btnDepois = DOM.notificacoes.pwaUpdateBtnDepois;

    if (!updateToast) return;

    updateToast.classList.remove('oculto');

    btnAgora.onclick = () => {
        if (newWorker) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
        }
        hideUpdateNotification();
    };

    btnDepois.onclick = () => {
        hideUpdateNotification();
    };
}

function hideUpdateNotification() {
    const updateToast = DOM.notificacoes.pwaUpdateToast;
    if (!updateToast) return;

    updateToast.classList.add('saindo');
    setTimeout(() => {
        updateToast.classList.add('oculto');
        updateToast.classList.remove('saindo');
    }, 400);
}

// ========================================================
// 11. EVENT LISTENERS
// ========================================================

function setupListeners() {
    // Dark Mode
    DOM.acoesGlobais.botaoDarkMode?.addEventListener('click', toggleDarkMode);

    // Paginação
    DOM.paginacao.botaoAnterior?.addEventListener('click', () => mudarPagina(-1));
    DOM.paginacao.botaoProxima?.addEventListener('click', () => mudarPagina(1));

    // Busca
    if (DOM.busca.campo) {
        DOM.busca.campo.addEventListener('input', function() {
            DOM.busca.botaoLimpar?.classList.toggle('oculto', this.value.trim().length === 0);
        });
        DOM.busca.campo.addEventListener('input', buscarAnimesEmTempoRealDebounced);
        DOM.busca.campo.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarAnimes(DOM.busca.campo.value);
            }
        });
    }

    DOM.busca.botaoBuscar?.addEventListener('click', () => {
        const termo = DOM.busca.campo.value;
        buscarAnimes(termo);
    });

    // Controles
    DOM.busca.botaoLimpar?.addEventListener('click', limparTextoBusca);
    DOM.busca.botaoVoltar?.addEventListener('click', resetarInterfaceDeBusca);
    DOM.filtros.status?.addEventListener('change', filtrarAnimesSalvos);
    DOM.filtros.ordenacao?.addEventListener('change', carregarAnimesSalvos);

    // Modais
    window.addEventListener('click', (e) => {
        if (e.target === DOM.modais.anime) fecharModal();
        if (e.target === DOM.modais.stats) {
            DOM.modais.stats.classList.add('oculto');
        }
        if (DOM.busca.resultados && DOM.busca.campo && !DOM.busca.campo.contains(e.target) && !DOM.busca.resultados.contains(e.target)) {
            DOM.busca.resultados.classList.add('oculto');
        }
    });

    DOM.modais.animeFecharBtn?.addEventListener('click', fecharModal);

    // Backup
    DOM.acoesGlobais.botaoExportar?.addEventListener('click', exportarBackup);

    if (DOM.acoesGlobais.botaoImportar && DOM.acoesGlobais.inputImportar) {
        DOM.acoesGlobais.botaoImportar.addEventListener('click', () => DOM.acoesGlobais.inputImportar.click());
        DOM.acoesGlobais.inputImportar.addEventListener('change', importarBackup);
    }

    // Stats
    DOM.acoesGlobais.botaoStats?.addEventListener('click', calcularEstatisticas);
    DOM.modais.statsFecharBtn?.addEventListener('click', () => DOM.modais.stats.classList.add('oculto'));

    // Roleta
    DOM.acoesGlobais.botaoRoleta?.addEventListener('click', sugerirAnimeAleatorio);

    // Modos de visualização
    DOM.visualizacao.botoes.forEach(btn => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.view));
    });
}

// ========================================================
// 12. INICIALIZAÇÃO
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicação...');
    
    // Carrega preferências
    aplicarModoEscuroInicial();
    aplicarModoVisualizacaoInicial();
    
    // Carrega dados
    carregarCatalogo();
    carregarAnimesSalvos();
    
    // Configura eventos
    setupListeners();
    setupServiceWorker();
    
    // Verifica se teve atualização
    if (localStorage.getItem('app_updated')) {
        showToast('✅ App atualizado para a versão mais recente!', 'success');
        localStorage.removeItem('app_updated');
    }
    
    console.log('✅ Aplicação pronta!');
});