// ========================================================
// CATÁLOGO DE ANIMES PESSOAL
// ========================================================
// Estrutura:
// 1. Estado da Aplicação
// 2. CRUD do Catálogo
// 3. Renderização de Cards
// 4. Busca e API
// 5. Modais
// 6. Sistema de Favoritos
// 7. Modo de Visualização
// 8. PWA & Service Worker
// 9. Event Listeners
// 10. Inicialização
// ========================================================

// ========================================================
// 1. ESTADO DA APLICAÇÃO
// ========================================================

let paginaAtual = 1;
let termoBuscaAtual = '';
let currentViewMode = 'grid';
let newWorker;
let searchController = null;

// ========================================================
// 2. CRUD DO CATÁLOGO
// ========================================================

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

function fabricarAnimeSalvo(malId, titulo, poster, maxEpisodes, type, year, status = 'Quero Ver') {
    return {
        mal_id: parseInt(malId),
        title: titulo,
        poster: poster,
        status: status,
        episode: 0,
        maxEpisodes: parseInt(maxEpisodes) || 0,
        dateAdded: new Date().toISOString(),
        type: type,
        year: year,
        favorite: false
    };
}

function adicionarRapido(malId, tituloEncoded, posterUrl, maxEpisodes, type, year) {
    const titulo = decodeURIComponent(tituloEncoded);
    adicionarAoCatalogo(malId, titulo, posterUrl, maxEpisodes, 'Quero Ver', type, year);
}

function salvarNovoAnimeNoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial, type, year) {
    const novoAnime = fabricarAnimeSalvo(malId, titulo, posterUrl, maxEpisodes, type, year, statusInicial);
    
    if (statusInicial === 'Concluído' && novoAnime.maxEpisodes) {
        novoAnime.episode = novoAnime.maxEpisodes;
    }

    catalogoPessoal[malId] = novoAnime;
    salvarCatalogo();
}

function atualizarEpisodioEStatus(malId, change) {
    if (!catalogoPessoal.hasOwnProperty(malId)) return { statusChanged: false, savedData: null };
    
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

    return { 
        statusChanged: savedData.status !== statusBefore,
        savedData: savedData,
        statusNovo: savedData.status
    };
}

function adicionarAoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial = 'Quero Ver', type = 'TV', year = '----') {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        showToast('Este anime já está no seu catálogo!', 'info');
        return;
    }

    salvarNovoAnimeNoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial, type, year);

    atualizarCardNaTela(malId, titulo, posterUrl, maxEpisodes, type, year);

    showToast(`Anime adicionado como "${statusInicial}"!`, 'info');
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

        showToast(`${animeTitulo} Removido do catálogo.`, 'error');
        fecharModal();
    }
}

function atualizarStatusAnime(malId, novoStatus) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        const anime = catalogoPessoal[malId];
        const statusBefore = anime.status;
        
        anime.status = novoStatus;
        if (novoStatus === 'Concluído' && anime.maxEpisodes) {
             anime.episode = anime.maxEpisodes;
        }
        salvarCatalogo();

        const statusChanged = (anime.status !== statusBefore);
        const savedData = anime;
        atualizarElementosDoCard(malId, savedData, statusChanged); 
        
        showToast(`Status de ${anime.title} atualizado para: ${novoStatus}`, 'info');
        fecharModal();
    }
}

function quickUpdate(malId, change) {
    const resultado = atualizarEpisodioEStatus(malId, change);

    if (!resultado.savedData) return;

    atualizarElementosDoCard(malId, resultado.savedData, resultado.statusChanged); 

    if (resultado.statusChanged) {
        let tipoToast = 'info';
        if (resultado.statusNovo === 'Concluído') tipoToast = 'success';
        else if (resultado.statusNovo === 'Em Andamento') tipoToast = 'warning';
        showToast(`Status atualizado para: ${resultado.statusNovo}`, tipoToast);
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
        const statusAnterior = anime.status; 
        
        if (anime.maxEpisodes) {
            anime.episode = anime.maxEpisodes;
        }
        anime.status = 'Concluído';
        
        salvarCatalogo(); 
        
        const statusMudou = (statusAnterior !== 'Concluído');
        atualizarElementosDoCard(malId, anime, statusMudou);

        showToast('Anime marcado como Concluído! 🎉', 'success');
        fecharModal();
    }
}

// ========================================================
// 3. RENDERIZAÇÃO DE CARDS
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

function atualizarCardNaTela(malId, titulo, posterUrl, maxEpisodes, type, year) {
    const cardAntigo = getCardAnime(malId);
    if (cardAntigo) {
        const savedData = catalogoPessoal[malId]; 

        const animeDadosAPI = {
            mal_id: malId,
            title: titulo,
            images: { jpg: { image_url: posterUrl } },
            episodes: maxEpisodes,
            type: type,
            year: year
        };
        
        const novoCard = renderizarCardAnime(animeDadosAPI, true, savedData, true);
        
        cardAntigo.replaceWith(novoCard);
    }
}

function atualizarElementosDoCard(malId, savedData, statusChanged) {
    const card = getCardAnime(malId);
    const inputElement = getInputEpisodios(malId);
    if (inputElement) inputElement.value = savedData.episode;

    updateProgressoDisplay(malId, savedData.episode, savedData.maxEpisodes)

    if (statusChanged) {
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
    }
}

function updateProgressoDisplay(malId, episode, maxEpisodes) {
    const progressoTexto = getTextoProgresso(malId);
    const barra = getBarraProgresso(malId);
    
    if (progressoTexto) {
        const episodesTotal = maxEpisodes ? ` / ${maxEpisodes}` : '';
        progressoTexto.textContent = `Ep ${episode}${episodesTotal}`;
    }

    if (barra && maxEpisodes > 0) {
        let pct = (episode / maxEpisodes) * 100;
        if (pct > 100) pct = 100;
        barra.style.width = `${pct}%`;
    }
}

function prepararDadosCard(animeAPI, isSaved, savedData) {
    const malId = animeAPI.mal_id;
    const estaNoCatalogo = catalogoPessoal.hasOwnProperty(malId);
    const finalSavedData = estaNoCatalogo ? catalogoPessoal[malId] : savedData;
    
    return {
        malId: malId,
        poster: animeAPI.images?.jpg?.image_url || finalSavedData.poster || CONFIG.PLACEHOLDER_IMAGE,
        titulo: animeAPI.title_english || animeAPI.title,
        tipo: MAPA_TIPOS_MIDIA[animeAPI.type || finalSavedData.type || 'TV'] || (animeAPI.type || 'TV'),
        ano: animeAPI.year || (animeAPI.aired?.prop?.from?.year) || finalSavedData.year || '----',
        
        isSaved: estaNoCatalogo, 
        savedData: finalSavedData
    };
}

function gerarMioloCardSalvo(dados) {
    const statusInfo = getStatusData(dados.savedData.status);
    const episodesTotal = dados.savedData.maxEpisodes ? ` / ${dados.savedData.maxEpisodes}` : '';
    let porcentagem = (dados.savedData.maxEpisodes > 0) ? (dados.savedData.episode / dados.savedData.maxEpisodes) * 100 : 0;
    if (porcentagem > 100) porcentagem = 100;
    const dataAdicao = dados.savedData.dateAdded ? new Date(dados.savedData.dateAdded).toLocaleDateString('pt-BR') : '--/--';
    const classeAtiva = dados.savedData.favorite ? 'active' : '';

    return `
        <span class="etiqueta-status ${statusInfo.class}">${statusInfo.label}</span>
        
        <div class="progresso-linha-topo">
            <p class="progresso-texto-inline">
                <span id="ep-atual-${dados.malId}">Ep ${dados.savedData.episode}${episodesTotal}</span>
            </p>
            <div class="controle-individual">
                <button class="btn-progresso btn-menos" onclick="decrementarEpisodio(${dados.malId})">-</button>
                <input type="number" id="episode-input-${dados.malId}" value="${dados.savedData.episode}" min="0" class="input-progresso-base" onchange="atualizarEpisodio(${dados.malId}, this.value)" />
                <button class="btn-progresso btn-mais" onclick="incrementarEpisodio(${dados.malId})">+</button>
            </div>
        </div>
        
        <div class="barra-progresso-fundo">
            <div class="barra-progresso-preenchimento" id="bar-prog-${dados.malId}" style="width: ${porcentagem}%"></div>
        </div>
        
        <div class="card-meta-info">
            <span class="tag-tipo">${dados.tipo}</span>
            <span>Lançado em: ${dados.ano}</span>
        </div>
        
        <div class="card-acoes-compactas">
            <div class="flex-coluna margem-direita-auto">
                <span class="card-meta-label">Adicionado em:</span>
                <span class="card-meta-valor card-meta-info">${dataAdicao}</span>
            </div>
            <button onclick="toggleFavorite(${dados.malId})" class="btn-base btn-favorite ${classeAtiva}" title="Favorito">⭐</button>
            ${gerarBotaoDetalhes(dados.malId)}
        </div>`;
}

function gerarMioloCardNovo(dados, animeAPI) {
    const textoEpisodios = animeAPI.episodes ? `${animeAPI.episodes} Episódios` : 'Episódios: N/A';
    const tituloEncoded = encodeURIComponent(dados.titulo).replace(/'/g, "%27");

    return `
        <p class="card-destaque-info">${textoEpisodios}</p>
        
        <div class="card-meta-info" style="margin: 10px 0 15px 0;">
            <span class="tag-tipo">${dados.tipo}</span>
            <span>Lançado em: ${dados.ano}</span>
        </div>
        
        <div class="card-acoes-compactas">
            <button onclick="adicionarRapido(${dados.malId}, '${tituloEncoded}', '${dados.poster}', ${animeAPI.episodes}, '${animeAPI.type}', '${dados.ano}')" class="btn-add-destaque" title="Adicionar a Quero Ver">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            ${gerarBotaoDetalhes(dados.malId)}
        </div>`;
}

function gerarBotaoDetalhes(malId) {
    return `
        <button onclick="abrirModal(${malId})" class="btn-base btn-detalhes btn-icone-acao" title="Detalhes">
            <svg class="icone-acao-svg icone-pequeno" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
        </button>`;
}

function renderizarCardAnime(animeAPI, isSaved = false, savedData = {}, returnElement = false) {
    const dados = prepararDadosCard(animeAPI, isSaved, savedData);
    
    const corpoHTML = dados.isSaved 
        ? gerarMioloCardSalvo(dados) 
        : gerarMioloCardNovo(dados, animeAPI);

    const favoriteBadge = (dados.isSaved && dados.savedData.favorite) 
        ? '<div class="favorite-badge" title="Favorito">⭐</div>' 
        : '';
    
    const classeStatus = dados.isSaved ? getStatusData(dados.savedData.status).class : '';

    const cardElement = document.createElement('div');
    cardElement.className = `card-anime ${classeStatus}`;
    cardElement.dataset.malId = dados.malId;
    
    cardElement.innerHTML = `
        ${favoriteBadge}
        <img src="${dados.poster}" alt="Poster" class="card-poster" loading="lazy" onerror="handleImageError(this)">
        <div class="card-info flex-coluna">
            <h2 class="card-titulo">${dados.titulo}</h2>
            <div class="card-status-pessoal flex-coluna flex-grow">
                ${corpoHTML}
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
        DOM.cards.lista.innerHTML = '<h2 class="mensagem-vazia-titulo">Seu Catálogo está vazio.<br>Pesquise por um anime acima!</h2>';
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
// 4. BUSCA E API
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
            DOM.cards.lista.innerHTML = '<p class="mensagem-centro">Nenhum anime encontrado.</p>';
            DOM.paginacao.container?.classList.add('oculto');
        }
    } catch (error) {
        DOM.cards.lista.innerHTML = '<p class="mensagem-centro">Erro na conexão com a API.</p>';
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

    if (searchController) {
        searchController.abort();
    }
    
    searchController = new AbortController();

    try {
        const response = await fetch(`${CONFIG.JIKAN_API_URL}?q=${encodeURIComponent(query)}&limit=7`, {
            signal: searchController.signal
        });
        
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            let html = '';
            data.data.forEach(anime => {
                const safeTitle = (anime.title_english || anime.title).replace(/'/g, "\\'");
                html += `
                    <div class="resultado-item" onclick="selecionarSugestao(${anime.mal_id}, '${safeTitle}')">
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
        if (error.name === 'AbortError') {
            console.log('🚫 Busca antiga cancelada para economizar dados.');
            return;
        }
        DOM.busca.resultados.classList.add('oculto');
    } finally {
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
// 5. MODAIS & STREAMING
// ========================================================

function fecharModal() {
    const modal = DOM.modais.anime;
    if (modal) {
        modal.close();
        const iframe = modal.querySelector('iframe');
        if (iframe) iframe.src = '';
        DOM.modais.animeInfo && (DOM.modais.animeInfo.innerHTML = '');
    }
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
                    <span class="streaming-nota-texto">
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
                    <a href="${link.url}" target="_blank" class="streaming-link busca streaming-link-busca" style="border-color: ${link.cor}" rel="noopener noreferrer">
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
    const modal = event.target.closest('dialog');
    
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

function gerarBotoesAcaoModal(malId, isSaved) {
    if (!isSaved) return '';
    return `
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
        </div>`;
}

function renderizarAbaMusicas(theme) {
    if (!theme || (!theme.openings?.length && !theme.endings?.length)) {
        return '<div class="trailer-indisponivel"><p>🎵 Nenhuma informação musical encontrada.</p></div>';
    }

    const criarLista = (lista, titulo) => {
        if (!lista || lista.length === 0) return '';
        
        const itens = lista.map(musica => {
            let textoLimpo = musica.replace(/^\d+:\s*/, '');
            textoLimpo = textoLimpo.replace(/['"]/g, ''); 
            textoLimpo = textoLimpo.replace(/\s*\(eps?.*?\)$/i, '');
            
            const termoBusca = encodeURIComponent(textoLimpo);

            return `
                <a href="https://www.youtube.com/results?search_query=${termoBusca}" target="_blank" class="item-musica">
                    <svg class="icone-play" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <span class="nome-musica">${musica}</span>
                </a>
            `;
        }).join('');

        return `
            <div class="bloco-musica">
                <h4 class="titulo-musica">${titulo}</h4>
                <div class="lista-musicas">${itens}</div>
            </div>
        `;
    };

    return `
        <div class="container-musicas">
            ${criarLista(theme.openings, '🎧 Aberturas (Openings)')}
            ${criarLista(theme.endings, '🏁 Encerramentos (Endings)')}
        </div>
    `;
}

function renderizarConteudoModal(anime, sinopse, links, isSaved) {
    // 1. Processamento
    const generos = traduzirListaGeneros(anime.genres);
    const tipo = MAPA_TIPOS_MIDIA[anime.type] || anime.type || 'N/A';
    
    // 2. Traduções
    const status = MAPA_STATUS[anime.status] || anime.status;
    const rating = MAPA_RATING[anime.rating] || anime.rating || 'N/A';
    const season = anime.season ? MAPA_SEASONS[anime.season] : '';
    const seasonYear = anime.year || '';
    const temporadaFormatada = (season && seasonYear) ? `${season} de ${seasonYear}` : 'N/A';

    // 3. Datas
    const dataInicio = anime.aired?.from ? formatarDataCompleta(anime.aired.from) : '?';
    const dataFim = anime.aired?.to ? formatarDataCompleta(anime.aired.to) : '?';
    const periodoExibicao = (anime.status === 'Currently Airing') 
        ? `De ${dataInicio} (Em andamento)`
        : (dataInicio !== '?' && dataFim !== '?') ? `${dataInicio} até ${dataFim}` : dataInicio;

    // 4. Indústria
    const estudios = formatarListaSimples(anime.studios, 2);
    const produtores = formatarListaSimples(anime.producers, 2);
    const licenciadores = formatarListaSimples(anime.licensors, 2);

    // 5. Trailer
    const trailerUrl = anime.trailer?.embed_url 
        ? anime.trailer.embed_url.replace(/[?&]autoplay=1/gi, '') + '&rel=0'
        : null;
    const trailerHTML = trailerUrl 
        ? `<div id="trailer" class="tab-content oculto"><div class="modal-trailer-container"><iframe src="${trailerUrl}" frameborder="0" allowfullscreen></iframe></div></div>`
        : `<div id="trailer" class="tab-content oculto"><div class="trailer-indisponivel"><p>🎬 Trailer não disponível</p></div></div>`;

    // 6. Músicas
    const musicasHTML = renderizarAbaMusicas(anime.theme);

    const acoesHTML = gerarBotoesAcaoModal(anime.mal_id, isSaved);
    const streamingHTML = renderizarAbaStreaming(links);

    // 7. Montagem final
    return `
        <h2 id="modal-titulo">${anime.title_english || anime.title}</h2>
        
        <div class="modal-poster-detalhes">
            <img id="modal-poster" src="${anime.images.jpg.large_image_url}" alt="Poster">
            
            <div id="modal-detalhes-rapidos">
                <div class="flex-grow">
                    <p><strong>Tipo:</strong> ${tipo}</p>
                    <p><strong>Episódios:</strong> ${anime.episodes || 'N/A'}</p>
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Exibição:</strong> ${periodoExibicao}</p>
                    <p><strong>Temporada:</strong> ${temporadaFormatada}</p>
                    <p><strong>Classificação:</strong> ${rating}</p>
                    <p><strong>Gêneros:</strong> ${generos}</p>
                    
                    <p><strong>Estúdio:</strong> ${estudios}</p>
                    <p><strong>Produtores:</strong> ${produtores}</p>
                    <p><strong>Licenciado por:</strong> ${licenciadores}</p>
                </div>
                ${acoesHTML}
            </div>
        </div>
        
        <div class="modal-tabs">
            <button class="tab-button ativo" onclick="mudarAba(event, 'sinopse')">📖 Sinopse</button>
            <button class="tab-button" onclick="mudarAba(event, 'trailer')">🎥 Trailer</button>
            <button class="tab-button" onclick="mudarAba(event, 'musicas')">🎵 Músicas</button>
            <button class="tab-button" onclick="mudarAba(event, 'streaming')">📺 Onde Assistir</button>
        </div>

        <div class="modal-tab-conteudo">
            <div id="sinopse" class="tab-content ativo">
                <div class="sinopse-texto">${sinopse}</div>
            </div>
            
            ${trailerHTML}
            
            <div id="musicas" class="tab-content oculto">
                ${musicasHTML}
            </div>

            <div id="streaming" class="tab-content oculto">
                ${streamingHTML}
            </div>
        </div>`;
}

function verificarAtualizacaoAno(malId, anoApi) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        const salvo = catalogoPessoal[malId];
        if ((!salvo.year || salvo.year === '----') && anoApi && anoApi !== 'N/A') {
            salvo.year = anoApi;
            salvarCatalogo();
            const card = getCardAnime(malId);
            if (card) {
                const spans = card.querySelectorAll('.card-meta-info span');
                spans.forEach(span => {
                    if (span.textContent.includes('Lançado') || span.textContent.includes('----')) {
                        span.textContent = `Lançado em: ${anoApi}`;
                    }
                });
            }
        }
    }
}

async function abrirModal(malId) {
    const modalInfo = DOM.modais.animeInfo;
    const animeModal = DOM.modais.anime;

    if (modalInfo) modalInfo.innerHTML = `
        <div class="modal-loading-container">
            <div class="spinner modal-spinner-margin"></div>
            <p class="loading-text modal-loading-text-content">Carregando detalhes...</p>
        </div>`;
    
    if (animeModal) {
        animeModal.showModal();
        animeModal.scrollTop = 0;
    }

    try {
        const response = await fetch(`${CONFIG.JIKAN_API_URL}/${malId}/full`);
        if (!response.ok) throw new Error('Falha API');
        const data = await response.json();
        const anime = data.data;

        const [sinopseTraduzida, linksStreaming] = await Promise.all([
            traduzirSinopse(anime.synopsis),
            obterLinksStreaming(anime)
        ]);

        const anoLancamento = anime.year || anime.aired?.prop?.from?.year || 'N/A';
        verificarAtualizacaoAno(malId, anoLancamento);

        const isSaved = catalogoPessoal.hasOwnProperty(malId);
        modalInfo.innerHTML = renderizarConteudoModal(anime, sinopseTraduzida, linksStreaming, isSaved);

    } catch (error) {
        console.error(error);
        if (modalInfo) modalInfo.innerHTML = '<p class="mensagem-erro-modal">Não foi possível carregar detalhes.</p>';
    }
}

// ========================================================
// 5b. ESTATÍSTICAS & ALEATORIEDADE
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
    
    DOM.modais.stats?.showModal();
}

function sugerirAnimeAleatorio() {
    const animesCandidatos = Object.values(catalogoPessoal).filter(anime => anime.status === 'Quero Ver');
    
    if (animesCandidatos.length === 0) {
        return showToast("Lista 'Quero Ver' vazia! Adicione animes para sortear.", "info");
    }
    
    showGlobalLoading("🎲 Rolando os dados...");
    
    setTimeout(() => {
        const index = Math.floor(Math.random() * animesCandidatos.length);
        const animeSorteado = animesCandidatos[index];

        hideGlobalLoading();
        
        abrirModal(animeSorteado.mal_id);
        
        showToast(`🎲 Sorteado: ${animeSorteado.title}`, "roleta");
        
    }, 800);
}

// ========================================================
// 6. SISTEMA DE FAVORITOS
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
            
            const novoBadge = card.querySelector('.favorite-badge');
            
            if (novoBadge) {
                novoBadge.classList.add('animar-entrada');
            }
        
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
// 7. MODO DE VISUALIZAÇÃO
// ========================================================

function setViewMode(mode) {
    currentViewMode = mode;
    salvarModoVisualizacao(mode);
    
    DOM.cards.lista.classList.remove('compact-view', 'list-view');
    
    if (mode === 'compact') DOM.cards.lista.classList.add('compact-view');
    else if (mode === 'list') DOM.cards.lista.classList.add('list-view');
    
    DOM.visualizacao.botoes.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });
}

function aplicarModoVisualizacaoInicial() {
    const savedMode = carregarModoVisualizacao();
    setViewMode(savedMode);
}

function aplicarPreferenciasFiltros() {
    const statusSalvo = localStorage.getItem(STORAGE_KEYS.FILTRO_STATUS);
    const ordemSalva = localStorage.getItem(STORAGE_KEYS.FILTRO_ORDEM);

    if (statusSalvo && DOM.filtros.status) {
        DOM.filtros.status.value = statusSalvo;
    }

    if (ordemSalva && DOM.filtros.ordenacao) {
        DOM.filtros.ordenacao.value = ordemSalva;
    }
}

// ========================================================
// 8. PWA & SERVICE WORKER
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
// 9. EVENT LISTENERS
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
                const itemAtivo = DOM.busca.resultados?.querySelector('.resultado-item.ativo');
                if (!itemAtivo) {
                    e.preventDefault();
                    buscarAnimes(DOM.busca.campo.value);
                }
            }
        });

        DOM.busca.resultados.addEventListener('mouseover', (e) => {
            if (DOM.busca.resultados.classList.contains('navegacao-teclado')) return;

            const item = e.target.closest('.resultado-item');
            if (item) {
                const ativos = DOM.busca.resultados.querySelectorAll('.resultado-item.ativo');
                ativos.forEach(i => i.classList.remove('ativo'));
                item.classList.add('ativo');
            }
        });

        DOM.busca.resultados.addEventListener('mousemove', (e) => {
            if (DOM.busca.resultados.classList.contains('navegacao-teclado')) {
                DOM.busca.resultados.classList.remove('navegacao-teclado');

                const itemSobMouse = e.target.closest('.resultado-item');

                const ativos = DOM.busca.resultados.querySelectorAll('.resultado-item.ativo');
                ativos.forEach(i => i.classList.remove('ativo'));

                if (itemSobMouse) {
                    itemSobMouse.classList.add('ativo');
                }
            }
        });

        DOM.busca.campo.addEventListener('keydown', function(e) {
            const container = DOM.busca.resultados;
            if (!container || container.classList.contains('oculto') || container.innerHTML.trim() === '') return;

            const itens = Array.from(container.querySelectorAll('.resultado-item'));
            if (itens.length === 0) return;

            let currentIndex = itens.findIndex(item => item.classList.contains('ativo'));

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                
                container.classList.add('navegacao-teclado');

                if (currentIndex >= 0) itens[currentIndex].classList.remove('ativo');

                let nextIndex;
                if (e.key === 'ArrowDown') {
                    nextIndex = (currentIndex + 1) % itens.length;
                } else {
                    if (currentIndex === -1) currentIndex = 0;
                    nextIndex = (currentIndex - 1 + itens.length) % itens.length;
                }

                itens[nextIndex].classList.add('ativo');
                itens[nextIndex].scrollIntoView({ block: 'nearest' });

            } else if (e.key === 'Enter' && currentIndex !== -1) {
                e.preventDefault();
                container.classList.remove('navegacao-teclado'); 
                itens[currentIndex].click();
            }
        });

        DOM.busca.botaoBuscar?.addEventListener('click', () => {
            const termo = DOM.busca.campo.value;
            buscarAnimes(termo);
        });
    }

    // Controles
    DOM.busca.botaoLimpar?.addEventListener('click', limparTextoBusca);
    DOM.busca.botaoVoltar?.addEventListener('click', resetarInterfaceDeBusca);

    // Modais
    const dialogs = document.querySelectorAll('dialog');
    dialogs.forEach(dialog => {
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.close();
            }
        });
    });

    DOM.modais.animeFecharBtn?.addEventListener('click', fecharModal);
    DOM.acoesGlobais.botaoExportar?.addEventListener('click', exportarBackup);

    // Importação/Exportação
    if (DOM.acoesGlobais.botaoImportar && DOM.acoesGlobais.inputImportar) {
        DOM.acoesGlobais.botaoImportar.addEventListener('click', () => DOM.acoesGlobais.inputImportar.click());
        DOM.acoesGlobais.inputImportar.addEventListener('change', importarBackup);
    }

    // Estatísticas & Roleta
    DOM.acoesGlobais.botaoStats?.addEventListener('click', calcularEstatisticas);
    DOM.modais.statsFecharBtn?.addEventListener('click', () => DOM.modais.stats.close());;
    DOM.acoesGlobais.botaoRoleta?.addEventListener('click', sugerirAnimeAleatorio);

    // Modo de Visualização
    DOM.visualizacao.botoes.forEach(btn => {
        btn.addEventListener('click', () => setViewMode(btn.dataset.view));
    });
    DOM.filtros.status?.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEYS.FILTRO_STATUS, DOM.filtros.status.value);
        filtrarAnimesSalvos();
    });
    DOM.filtros.ordenacao?.addEventListener('change', () => {
        localStorage.setItem(STORAGE_KEYS.FILTRO_ORDEM, DOM.filtros.ordenacao.value);
        carregarAnimesSalvos();
    });

    // Botão Voltar ao Topo
    const btnTopo = DOM.acoesGlobais.botaoTopo;
    if (btnTopo) {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    if (window.scrollY > 300) {
                        btnTopo.classList.add('visivel');
                    } else {
                        btnTopo.classList.remove('visivel');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });

        btnTopo.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// ========================================================
// 10. INICIALIZAÇÃO
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando aplicação...');
    
    // Carrega preferências
    aplicarModoEscuroInicial();
    aplicarModoVisualizacaoInicial();
    aplicarPreferenciasFiltros();
    
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