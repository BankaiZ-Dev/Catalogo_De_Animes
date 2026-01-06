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
    return `
        <div class="card-meta-info">
            <span class="tag-tipo">${dados.tipo}</span>
            <span>Lançado em: ${dados.ano}</span>
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
            <button onclick="adicionarRapido(${dados.malId}, '${tituloEncoded}', '${dados.poster}', ${dados.totalEpisodios}, '${dados.tipo}', '${dados.ano}')" class="btn-add-destaque" title="Adicionar a Quero Ver">
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
    const textoEpisodios = dados.totalEpisodios ? `${dados.totalEpisodios} Episódios` : 'Episódios: N/A';
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

    cardElement.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            
            if (e.target.closest('button') || e.target.closest('input')) {
                return; 
            }

            const isActive = this.classList.contains('active-mobile');

            document.querySelectorAll('.card-anime').forEach(card => {
                card.classList.remove('active-mobile');
            });

            if (!isActive) {
                this.classList.add('active-mobile');
            }
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.card-anime')) {
            document.querySelectorAll('.card-anime.active-mobile').forEach(card => {
                card.classList.remove('active-mobile');
            });
        }
    });

    if (returnElement) return cardElement;
    DOM.cards.lista.appendChild(cardElement);
}

// --- ABA DE MÚSICAS ---
function renderizarAbaMusicas(theme) {
    if (!theme || (!theme.openings?.length && !theme.endings?.length)) {
        return '<div class="conteudo-vazio"><p>🎵 Nenhuma informação musical encontrada.</p></div>';
    }

    const criarBlocoColapsavel = (lista, titulo) => {
        if (!lista || lista.length === 0) return '';
        
        const itens = lista.map(musica => {
            let textoLimpo = musica.replace(/^\d+:\s*/, '').replace(/['"]/g, '').replace(/\s*\(eps?.*?\)$/i, '');
            return `
                <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(textoLimpo)}" target="_blank" class="item-musica">
                    <svg class="icone-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span class="nome-musica">${musica}</span>
                </a>`;
        }).join('');

        return `
            <details class="grupo-colapsavel">
                <summary>${titulo} (${lista.length})</summary>
                <div class="conteudo-colapsavel lista-musicas">
                    ${itens}
                </div>
            </details>`;
    };

    return `
        <div class="container-musicas">
            ${criarBlocoColapsavel(theme.openings, '🎧 Aberturas (Openings)')}
            ${criarBlocoColapsavel(theme.endings, '🏁 Encerramentos (Endings)')}
        </div>`;
}

// --- ABA DE RELACIONADOS ---
function renderizarAbaRelacionados(relations) {
    if (!relations || relations.length === 0) {
        return '<div class="conteudo-vazio"><p>🔗 Sem animes relacionados.</p></div>';
    }

    let html = '<div class="container-relacionados">';

    relations.forEach(grupo => {
        const nomeRelacao = MAPA_RELACAO[grupo.relation] || grupo.relation;
        
        const itensHTML = grupo.entry.map(item => {
            const isAnime = item.type === 'anime';
            if (isAnime) {
                return `
                    <div class="item-relacionado link-anime" onclick="abrirModal(${item.mal_id})" title="Ver detalhes">
                        <span class="tag-midia">ANIME</span>
                        <span>${item.name}</span>
                    </div>`;
            } else {
                return `
                    <a href="${item.url}" target="_blank" class="item-relacionado item-externo">
                        <span class="tag-midia">${item.type.toUpperCase()}</span>
                        <span>${item.name}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    </a>`;
            }
        }).join('');

        html += `
            <details class="grupo-colapsavel">
                <summary>${nomeRelacao} (${grupo.entry.length})</summary>
                <div class="conteudo-colapsavel lista-relacoes">
                    ${itensHTML}
                </div>
            </details>`;
    });

    html += '</div>';
    return html;
}

// --- ABA DE STREAMING ---
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

// --- ORQUESTRADOR DO CONTEÚDO DO MODAL ---
function renderizarConteudoModal(anime, sinopse, links, isSaved) {
    const generos = traduzirListaGeneros(anime.genres);
    const tipo = MAPA_TIPOS_MIDIA[anime.type] || anime.type || 'N/A';
    
    const status = MAPA_STATUS[anime.status] || anime.status;
    const rating = MAPA_RATING[anime.rating] || anime.rating || 'N/A';
    const season = anime.season ? MAPA_SEASONS[anime.season] : '';
    const seasonYear = anime.year || '';
    const temporadaFormatada = (season && seasonYear) ? `${season} de ${seasonYear}` : 'N/A';

    const dataInicio = anime.aired?.from ? formatarDataCompleta(anime.aired.from) : '?';
    const dataFim = anime.aired?.to ? formatarDataCompleta(anime.aired.to) : '?';
    const periodoExibicao = (anime.status === 'Currently Airing') 
        ? `De ${dataInicio} (Em andamento)`
        : (dataInicio !== '?' && dataFim !== '?') ? `${dataInicio} até ${dataFim}` : dataInicio;

    const estudios = formatarListaSimples(anime.studios, 2);
    const produtores = formatarListaSimples(anime.producers, 2);
    const licenciadores = formatarListaSimples(anime.licensors, 2);

    let duracaoRaw = anime.duration || 'N/A';

    let duracaoFormatada = duracaoRaw
    .replace(/per ep/g, 'por ep')
    .replace(/min/g, 'min')
    .replace(/sec/g, 'seg')
    .replace(/hr/g, 'h')
    .replace(/(\d+)\s+(min|seg|h)/g, '$1$2');

    let tempoTotalHTML = '';

    if (anime.episodes > 1 && anime.duration) {
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
                     <p><strong>Episódios:</strong> ${anime.episodes || 'N/A'}</p>
                     <p><strong>Duração:</strong> ${duracaoFormatada}${tempoTotalHTML}</p>
                     <p><strong>Temporada:</strong> ${temporadaFormatada}</p>
                     <p><strong>Exibição:</strong> ${periodoExibicao}</p>
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

// --- BOTÕES DE AÇÃO DO MODAL ---
function gerarBotoesAcaoModal(anime, isSaved) {
    if (isSaved) {
        return `
            <div class="modal-actions-row">
                <button onclick="concluirAnimeRapido(${anime.mal_id})" class="btn-modal-action btn-modal-concluir" title="Marcar como Concluído">
                    ✅ Concluído
                </button>
                <button onclick="removerDoCatalogo(${anime.mal_id})" class="btn-modal-action btn-modal-excluir" title="Remover do Catálogo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>`;
    } 
    const tituloEncoded = encodeURIComponent(anime.title_english || anime.title).replace(/'/g, "%27");
    const poster = anime.images?.jpg?.image_url || CONFIG.PLACEHOLDER_IMAGE;
    const ano = anime.year || anime.aired?.prop?.from?.year || '----';
    return `
        <div class="modal-actions-row">
            <button 
                onclick="adicionarRapido(${anime.mal_id}, '${tituloEncoded}', '${poster}', ${anime.episodes || 0}, '${anime.type}', '${ano}')"
                class="btn-modal-action btn-destaque-modal" 
                title="Adicionar a Quero Ver"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Adicionar
            </button>
        </div>`;
}