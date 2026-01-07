// ========================================================
// MODAL - Detalhes, Ações e Estatísticas
// ========================================================

// --- 1. CONTROLE PRINCIPAL ---
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

// --- 2. COMPONENTES VISUAIS DO MODAL ---
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

// --- 3. MODAL DE ESTATÍSTICAS ---
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