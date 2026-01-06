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

function adicionarRapido(malId, tituloEncoded, poster, episodes, type, year) {
    const titulo = decodeURIComponent(tituloEncoded);
    
    adicionarAoCatalogo(malId, titulo, poster, episodes, 'Quero Ver', type, year);
    
    const card = getCardAnime(malId);
    if (card) {
        const savedData = catalogoPessoal[malId];
        const newCard = renderizarCardAnime({
            mal_id: malId,
            title: titulo,
            images: { jpg: { image_url: poster } },
            type: type,
            year: year
        }, true, savedData, true);
        
        card.replaceWith(newCard);
    }

    const modalAcoes = document.querySelector('.modal-actions-row');
    const modalAberto = DOM.modais.anime.hasAttribute('open');

    if (modalAberto && modalAcoes) {
        const animeFake = {
            mal_id: malId,
            title: titulo,
            title_english: titulo,
            images: { jpg: { image_url: poster } },
            episodes: episodes,
            type: type,
            year: year
        };

        modalAcoes.outerHTML = gerarBotoesAcaoModal(animeFake, true);
    }
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
            card.classList.add('card-animacao-saida');
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

        if (anime.status === 'Concluído') {
            showToast('Este anime já está marcado como concluído! 😎', 'info');
            return;
        }

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
// 3. CARDS
// ========================================================

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
                card.classList.add('card-animacao-saida');
                
                setTimeout(() => {
                    card.classList.add('oculto');
                    card.classList.remove('card-animacao-saida');
                    atualizarVisualDoCard(card, savedData); 
                }, 300);
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
        totalEpisodios: animeAPI.episodes || finalSavedData.maxEpisodes || 0,
        isSaved: estaNoCatalogo, 
        savedData: finalSavedData
    };
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
        } else {
            card.classList.add('oculto');
        }
    });
}  

async function sincronizacaoInteligente() {
    if (!navigator.onLine) return;

    const filaPendentes = Object.values(catalogoPessoal).filter(anime => {
        const faltaEpisodios = (!anime.maxEpisodes || anime.maxEpisodes === 0);
        const faltaAno = (anime.year === '----' || !anime.year);
        return faltaEpisodios || faltaAno;
    });
    if (filaPendentes.length === 0) return;

    for (const anime of filaPendentes.slice(0, 5)) {
        try {
            await new Promise(r => setTimeout(r, 3000));

            const json = await apiObterDadosSimples(anime.mal_id);
            const dadosNovos = json.data;

            let houveMudanca = false;

            if (verificarAtualizacaoAno(anime.mal_id, dadosNovos.year || dadosNovos.aired?.prop?.from?.year)) houveMudanca = true;
            if (verificarAtualizacaoEpisodios(anime.mal_id, dadosNovos.episodes)) houveMudanca = true;

            if (houveMudanca) {
                salvarCatalogo();
                atualizarInterfaceCard(anime.mal_id);
            }
        } catch (erro) { console.error(`[Sync] Falha ao atualizar ${anime.title}:`, erro); }
    }
}

// ========================================================
// 4. BUSCA E API
// ========================================================

async function buscarAnimes(query, page = 1) {
    if (searchController) searchController.abort();

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
        const data = await apiBuscarAnimes(query, page);

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
        if (error.message === 'RATE_LIMIT') {
            showToast('🚦 Muita velocidade! Aguarde um pouco e tente novamente.', 'warning');
            DOM.cards.lista.innerHTML = '<p class="mensagem-centro">Muitas requisições. Aguarde...</p>';
        } else {
            DOM.cards.lista.innerHTML = '<p class="mensagem-centro">Erro na conexão com a API.</p>';
        }

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
        const data = await apiBuscarSugestoes(query, searchController.signal);

        const carregando = !DOM.loading.overlay.classList.contains('oculto');
        if (carregando || DOM.busca.campo.value.trim() === '') {
            DOM.busca.resultados.classList.add('oculto');
            return;
        }
        
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

function resetarInterfaceDeBusca() {
    DOM.busca.campo && (DOM.busca.campo.value = '');
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
        const data = await apiObterDetalhesFull(malId);
        const anime = data.data;

        const [sinopseTraduzida, linksStreaming] = await Promise.all([
            apiTraduzirTexto(anime.synopsis),
            obterLinksStreaming(anime)
        ]);

        const isSaved = catalogoPessoal.hasOwnProperty(malId);
        
        modalInfo.innerHTML = renderizarConteudoModal(anime, sinopseTraduzida, linksStreaming, isSaved);

    } catch (error) {
        console.error(error);

        if (error.message === 'RATE_LIMIT') {
            if (modalInfo) modalInfo.innerHTML = `
                <div class="conteudo-vazio">
                    <p>🚦 O servidor está ocupado.</p>
                    <p style="font-size: 0.9em">Aguarde 5 segundos e tente novamente.</p>
                </div>`;
        } else {
            if (modalInfo) modalInfo.innerHTML = '<p class="mensagem-erro-modal">Não foi possível carregar os detalhes.</p>';
        }
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
            badge.classList.remove('animar-entrada');
            badge.classList.add('badge-saindo');
            
            setTimeout(() => {
                if (badge.parentNode) badge.remove();
            }, 300);
        }

        const deveSair = DOM.filtros.status?.value === 'favoritos' && !isFavorite;
        if (deveSair) {
            card.classList.add('card-animacao-saida');

            setTimeout(() => {
                card.classList.add('oculto');
                card.classList.remove('card-animacao-saida');
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
        DOM.busca.campo.addEventListener('input', buscarAnimesEmTempoRealDebounced);
        
        DOM.busca.campo.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const itemAtivo = DOM.busca.resultados?.querySelector('.resultado-item.ativo');
                if (itemAtivo) {
                    return; 
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

        DOM.busca.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const termo = DOM.busca.campo.value.trim();
            if (termo) {
                buscarAnimes(termo);
            }
        });
    }

    DOM.busca.campo.addEventListener('search', () => {
        if (DOM.busca.campo.value === '') {
            DOM.busca.resultados.classList.add('oculto');
            DOM.busca.resultados.innerHTML = '';
            if (termoBuscaAtual === '') {
            DOM.busca.botaoVoltar?.classList.add('oculto');
            } else {
                DOM.busca.botaoVoltar?.classList.remove('oculto');
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (DOM.busca.form && !DOM.busca.form.contains(e.target)) {
            DOM.busca.resultados?.classList.add('oculto');
        }
    });

    // Controles
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
        }, { passive: true });

        btnTopo.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Conectividade
    window.addEventListener('offline', () => {
        showToast('📡 Você está offline. Modo de leitura ativado.', 'warning');
        document.body.classList.add('modo-offline');
    });

    window.addEventListener('online', () => {
        showToast('🌐 Conexão restabelecida! Tudo normal.', 'success');
        document.body.classList.remove('modo-offline');
        
        if (termoBuscaAtual) {
            buscarAnimes(termoBuscaAtual, paginaAtual);
        }
    });
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

    setTimeout(sincronizacaoInteligente, 8000);
    
    console.log('✅ Aplicação pronta!');
});