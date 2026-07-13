// ========================================================
// COMPONENTES DE INTERFACE
// ========================================================

// --- BADGE DE FAVORITO ---
function renderizarBadgeFavorito(dados) {
    if (!dados.isSaved || !dados.savedData.favorite) return '';
    return `<div class="favorite-badge" title="Favorito">⭐</div>`;
}

// --- POSTER DO CARD ---
function renderizarPoster(dados) {
    return `<img src="${dados.poster}" alt="Poster" class="card-poster" loading="lazy" onerror="handleImageError(this)">`;
}

// --- DADOS DE STATUS ---
function getStatusData(status) {
    switch (status) {
        case 'Concluído': return { class: 'status-concluido', label: 'Concluído ✅' };
        case 'Em Andamento': return { class: 'status-em-andamento', label: 'Em Andamento 🟠' };
        default: return { class: 'status-quero-ver', label: 'Quero Ver 📘' };
    }
}

// --- ETIQUETA DE STATUS ---
function renderizarEtiquetaStatus(dados) {
    if (!dados.isSaved) return '';
    const statusInfo = getStatusData(dados.savedData.status);
    return `<span class="etiqueta-status ${statusInfo.class}">${statusInfo.label}</span>`;
}

// --- CONTROLE DE PROGRESSO ---
function renderizarControleProgresso(dados) {
    const { savedData, malId } = dados;
    const episodesTotal = savedData.maxEpisodes ? ` / ${savedData.maxEpisodes}` : '';
    let porcentagem = (savedData.maxEpisodes > 0) ? (savedData.episode / savedData.maxEpisodes) * 100 : 0;
    if (porcentagem > 100) porcentagem = 100;

    return `
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
        </div>`;
}

// --- INFORMAÇÕES TAG/ANO ---
function renderizarMetaInfo(dados) {
    let prefixo = "Lançamento:";
    let icone = "📅"; 

    if (dados.statusLancamento === "Finished Airing") {
        prefixo = "Lançou em:";
        icone = "🏁";
    } else if (dados.statusLancamento === "Currently Airing") {
        prefixo = "Lançando Desde:";
        icone = "🔥";
    } else if (dados.statusLancamento === "Not yet aired") {
        prefixo = "Lançamento em:";
        icone = "⏳";
    }

    return `
        <div class="card-meta-info">
            <span class="tag-tipo">${dados.tipo}</span>
            <span title="${dados.statusLancamento}">${icone} ${prefixo} ${dados.ano}</span>
        </div>`;
}

// --- AÇÕES PARA ANIMES SALVOS ---
function renderizarAcoesSalvo(dados) {
    const dataExibicao = formatarDataSimples(dados.savedData.dateAdded);
    const classeAtiva = dados.savedData.favorite ? 'active' : '';

    return `
        <div class="card-acoes-compactas">
            <div class="flex-coluna margem-direita-auto">
                <span class="card-meta-label">Adicionado em:</span>
                <span class="card-meta-valor">${dataExibicao}</span>
            </div>
            <button onclick="toggleFavorite(${dados.malId})" class="btn-base btn-favorite ${classeAtiva}" title="Favorito">⭐</button>
            ${renderizarBotaoDetalhes(dados.malId)}
        </div>`;
}

// --- AÇÕES PARA RESULTADOS DE BUSCA ---
function renderizarAcoesBusca(dados) {
    const tituloEncoded = encodeURIComponent(dados.titulo).replace(/'/g, "%27");
    return `
        <div class="card-acoes-compactas">
            <button onclick="adicionarRapido(${dados.malId}, '${tituloEncoded}', '${dados.poster}', ${dados.totalEpisodios}, '${dados.tipo}', '${dados.ano}', '${dados.statusLancamento}')" class="btn-add-destaque" title="Adicionar a Quero Ver">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
            ${renderizarBotaoDetalhes(dados.malId)}
        </div>`;
}

// --- BOTÃO DETALHES ---
function renderizarBotaoDetalhes(malId) {
    return `
        <button onclick="abrirModal(${malId})" class="btn-base btn-detalhes btn-icone-acao" title="Detalhes">
            <svg class="icone-acao-svg icone-pequeno" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
        </button>`;
}

// --- ORQUESTRADORES DE CONTEÚDO (MOLDE DOS CARDS) ---
function renderizarConteudoSalvo(dados) {
    return `
        ${renderizarEtiquetaStatus(dados)}
        ${renderizarControleProgresso(dados)}
        ${renderizarMetaInfo(dados)}
        ${renderizarAcoesSalvo(dados)}
    `;
}

// --- CONTEÚDO PARA RESULTADOS DE BUSCA ---
function renderizarConteudoBusca(dados) {
    let textoEpisodios = 'Episódios: N/A';
    
    if (dados.totalEpisodios) {
        if (dados.totalEpisodios === 1) {
            textoEpisodios = '1 Episódio';
        } else {
            textoEpisodios = `${dados.totalEpisodios} Episódios`;
        }
    }

    return `
        <p class="card-destaque-info">${textoEpisodios}</p>
        ${renderizarMetaInfo(dados)}
        ${renderizarAcoesBusca(dados)}
    `;
}

// --- FUNÇÃO PRINCIPAL: CARD ANIME ---
function renderizarCardAnime(animeAPI, isSaved = false, savedData = {}, returnElement = false) {
    const dados = prepararDadosCard(animeAPI, isSaved, savedData);
    
    const cardElement = document.createElement('div');
    const statusInfo = dados.isSaved ? getStatusData(dados.savedData.status) : { class: '' };
    cardElement.className = `card-anime ${statusInfo.class}`;
    cardElement.dataset.malId = dados.malId;
    
    cardElement.innerHTML = `
        ${renderizarBadgeFavorito(dados)}
        ${renderizarPoster(dados)}
        
        <h2 class="card-titulo-compacto">${dados.titulo}</h2>
        
        <div class="card-overlay-wrapper">
            <div class="card-info flex-coluna">
                <h2 class="card-titulo">${dados.titulo}</h2>
                
                <div class="card-status-pessoal flex-coluna flex-grow">
                    ${dados.isSaved ? renderizarConteudoSalvo(dados) : renderizarConteudoBusca(dados)}
                </div>
            </div>
        </div>`;

    if (returnElement) return cardElement;
    DOM.cards.lista.appendChild(cardElement);
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
        savedData: finalSavedData,
        statusLancamento: animeAPI.status || finalSavedData.statusLancamento || 'Unknown' 
    };
}

function atualizarCardNaTela(malId, titulo, posterUrl, maxEpisodes, type, year, statusLancamento) {
    const cardAntigo = getCardAnime(malId);
    if (cardAntigo) {
        const savedData = catalogoPessoal[malId]; 

        const animeDadosAPI = {
            mal_id: malId,
            title: titulo,
            images: { jpg: { image_url: posterUrl } },
            episodes: maxEpisodes,
            type: type,
            year: year,
            status: statusLancamento
        };
        
        const novoCard = renderizarCardAnime(animeDadosAPI, true, savedData, true);
        
        cardAntigo.replaceWith(novoCard);
        
        if (typeof filtrarAnimesSalvos === 'function') {
            filtrarAnimesSalvos();
        }
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

// --- ORQUESTRADOR DO CONTEÚDO DO MODAL ---
function renderizarConteudoModal(anime, sinopse, links, isSaved) {
    const generos = traduzirListaGeneros(anime.genres);
    const tipo = MAPA_TIPOS_MIDIA[anime.type] || anime.type || 'N/A';
    
    const status = MAPA_STATUS[anime.status] || anime.status;
    const rating = MAPA_RATING[anime.rating] || anime.rating || 'N/A';
    const season = anime.season ? MAPA_SEASONS[anime.season] : '';
    const seasonYear = anime.year || '';
    const temporadaFormatada = (season && seasonYear) ? `${season} de ${seasonYear}` : 'N/A';
    const episodiosHTML = anime.episodes > 1 
        ? `<p><strong>Episódios:</strong> ${anime.episodes}</p>` 
        : '';

    const dataInicio = anime.aired?.from ? formatarDataCompleta(anime.aired.from) : '?';
    const dataFim = anime.aired?.to ? formatarDataCompleta(anime.aired.to) : '?';
    const periodoExibicao = (anime.status === 'Currently Airing') 
        ? `De ${dataInicio} (Em andamento)`
        : (dataInicio !== '?' && dataFim !== '?') ? `${dataInicio} até ${dataFim}` : dataInicio;
    const broadcastHTML = formatarBroadcast(anime.broadcast, anime.status);

    const estudios = formatarListaSimples(anime.studios, 2);
    const produtores = formatarListaSimples(anime.producers, 2);
    const licenciadores = formatarListaSimples(anime.licensors, 2);

    let duracaoRaw = anime.duration || 'N/A';
    let duracaoFormatada = duracaoRaw
    .replace(/Unknown/gi, 'Desconhecida')
    .replace(/per ep/g, 'por ep')
    .replace(/min/g, 'min')
    .replace(/sec/g, 'seg')
    .replace(/hr/g, 'h')
    .replace(/(\d+)\s+(min|seg|h)/g, '$1$2');

    let tempoTotalHTML = '';

    if (anime.episodes > 1 && anime.duration && !anime.duration.toLowerCase().includes('unknown')) {
        const valorNumerico = parseInt(anime.duration);
        
        if (!isNaN(valorNumerico)) {
            if (anime.duration.toLowerCase().includes('min')) {
                const totalMinutos = anime.episodes * valorNumerico;
                const h = Math.floor(totalMinutos / 60);
                const m = totalMinutos % 60;
                const textoFinal = h > 0 ? `${h}h ${m}min` : `${totalMinutos}min`;
                tempoTotalHTML = ` <span class="badge-tempo-total">(Total: ${textoFinal})</span>`;
            } 
            else if (anime.duration.toLowerCase().includes('sec')) {
                const totalSegundos = anime.episodes * valorNumerico;
                const m = Math.floor(totalSegundos / 60);
                const s = totalSegundos % 60;
                const textoFinal = m > 0 ? `${m}min ${s}seg` : `${totalSegundos}seg`;
                tempoTotalHTML = ` <span class="badge-tempo-total">(Total: ${textoFinal})</span>`;
            }
        }
    }

    const trailerUrl = anime.trailer?.embed_url 
        ? anime.trailer.embed_url.replace(/[?&]autoplay=1/gi, '') + '&rel=0'
        : null;
    const trailerHTML = trailerUrl 
        ? `<div id="trailer" class="tab-content oculto"><div class="modal-trailer-container"><iframe src="${trailerUrl}" frameborder="0" allowfullscreen></iframe></div></div>`
        : `<div id="trailer" class="tab-content oculto"><div class="conteudo-vazio"><p>🎬 Trailer não disponível</p></div></div>`;

    const musicasHTML = renderizarAbaMusicas(anime.theme);
    const relacionadosHTML = renderizarAbaRelacionados(anime.relations);

    const acoesHTML = gerarBotoesAcaoModal(anime, isSaved);
    const streamingHTML = renderizarAbaStreaming(links);

    return `
        <h2 id="modal-titulo">${anime.title_english || anime.title}</h2>
        
        <div class="modal-poster-detalhes">
            <img id="modal-poster" src="${anime.images.jpg.large_image_url}" alt="Poster">
            <div id="modal-detalhes-rapidos">
                <div class="flex-grow">
                     <p><strong>Gêneros:</strong> ${generos}</p>
                     <p><strong>Tipo:</strong> ${tipo}</p>
                     <p><strong>Status:</strong> ${status}</p>
                     ${broadcastHTML}
                     ${episodiosHTML}
                     <p><strong>Duração:</strong> ${duracaoFormatada}${tempoTotalHTML}</p>
                     <p><strong>Exibição:</strong> ${periodoExibicao}</p>
                     <p><strong>Temporada:</strong> ${temporadaFormatada}</p>
                     <p><strong>Classificação:</strong> ${rating}</p>
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
            <button class="tab-button" onclick="mudarAba(event, 'relacionados')">🔗 Relacionados</button>
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

            <div id="relacionados" class="tab-content oculto">
                ${relacionadosHTML}
            </div>

            <div id="streaming" class="tab-content oculto">
                ${streamingHTML}
            </div>
        </div>`;
}

// --- COMPONENTES DE PAGINAÇÃO ---
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

    if (inicio > 2) container.appendChild(criarDots());

    for (let i = inicio; i <= fim; i++) {
        container.appendChild(criarBotao(i));
    }

    if (fim < totalPaginas - 1) container.appendChild(criarDots());

    if (totalPaginas > 1) container.appendChild(criarBotao(totalPaginas));
}

// --- ATUALIZAÇÃO EM TEMPO REAL DO CARD ---
function atualizarInterfaceCard(malId) {
    const anime = catalogoPessoal[malId];
    const card = getCardAnime(malId);
    
    if (!card) return;

    const anoEl = card.querySelector('.anime-ano'); 
    if (anoEl) anoEl.textContent = anime.year;

    const progressoEl = getTextoProgresso(malId);
    if (progressoEl) {
        progressoEl.textContent = `Ep ${anime.episode}${anime.maxEpisodes ? ' / ' + anime.maxEpisodes : ''}`;
    }
    
    const barra = getBarraProgresso(malId);
    if (barra && anime.maxEpisodes > 0) {
        const porc = (anime.episode / anime.maxEpisodes) * 100;
        barra.style.width = porc + '%';
    }
}

// --- OBTER LINKS DE STREAMING ---
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