// ========================================================
// MODAL - Detalhes, Ações e Estatísticas
// ========================================================

// --- 1. CONTROLE PRINCIPAL ---
async function abrirModal(malId) {
    const modalInfo = DOM.modais.animeInfo;
    const animeModal = DOM.modais.anime;
    
    const isSaved = catalogoPessoal.hasOwnProperty(malId);
    const savedData = isSaved ? catalogoPessoal[malId] : null;

    if (isSaved && savedData && savedData.synopsis) {
        if (animeModal) {
            animeModal.showModal();
            animeModal.scrollTop = 0;
        }
        document.body.style.overflow = 'hidden';

        const animeLocal = {
            mal_id: savedData.mal_id,
            title: savedData.title,
            title_english: savedData.title,
            images: { 
                jpg: { 
                    image_url: savedData.poster,
                    large_image_url: savedData.largePoster || savedData.poster
                } 
            },
            synopsis: savedData.synopsis,
            type: savedData.type,
            year: savedData.year,
            episodes: savedData.maxEpisodes,
            status: savedData.statusLancamento,
            genres: savedData.genres || [],
            studios: savedData.studios || [],
            producers: savedData.producers || [],
            licensors: savedData.licensors || [],
            rating: savedData.rating || 'N/A',
            season: savedData.season || '',
            aired: savedData.aired || {},
            duration: savedData.duration || 'N/A',
            trailer: null,
            theme: null,
            relations: [],
            streaming: []
        };

        const linksIniciais = [];
        modalInfo.innerHTML = renderizarConteudoModal(animeLocal, savedData.synopsis, linksIniciais, true);
        
        atualizarDatalistTags();

        if (navigator.onLine) {
            carregarAbasDinamicasBackground(malId, animeLocal);
        }
        return;
    }

    if (modalInfo) modalInfo.innerHTML = `
        <div class="modal-loading-container">
            <div class="spinner modal-spinner-margin"></div>
            <p class="loading-text modal-loading-text-content">Carregando detalhes...</p>
        </div>`;
    
    if (animeModal) {
        animeModal.showModal();
        animeModal.scrollTop = 0;
    }

    document.body.style.overflow = 'hidden';

    try {
        const data = await apiObterDetalhesFull(malId);
        const anime = data.data;

        const [sinopseTraduzida, linksStreaming] = await Promise.all([
            apiTraduzirTexto(anime.synopsis),
            obterLinksStreaming(anime)
        ]);

        if (isSaved) {
            catalogoPessoal[malId].synopsis = sinopseTraduzida;
            catalogoPessoal[malId].largePoster = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
            catalogoPessoal[malId].genres = anime.genres;
            catalogoPessoal[malId].studios = anime.studios;
            catalogoPessoal[malId].producers = anime.producers;
            catalogoPessoal[malId].licensors = anime.licensors;
            catalogoPessoal[malId].rating = anime.rating;
            catalogoPessoal[malId].season = anime.season;
            catalogoPessoal[malId].aired = anime.aired;
            catalogoPessoal[malId].duration = anime.duration;
            salvarCatalogoImediato();
        }

        modalInfo.innerHTML = renderizarConteudoModal(anime, sinopseTraduzida, linksStreaming, isSaved);
        
        if (isSaved) atualizarDatalistTags();

    } catch (error) {
        console.error(error);
        if (modalInfo) modalInfo.innerHTML = '<p class="mensagem-erro-modal">Não foi possível carregar os detalhes.</p>';
    }
}

async function carregarAbasDinamicasBackground(malId, animeLocal) {
    try {
        const data = await apiObterDetalhesFull(malId);
        const anime = data.data;
        const linksStreaming = await obterLinksStreaming(anime);

        animeLocal.trailer = anime.trailer;
        animeLocal.theme = anime.theme;
        animeLocal.relations = anime.relations;
        animeLocal.streaming = anime.streaming;

        const modalInfo = DOM.modais.animeInfo;
        const modalAberto = DOM.modais.anime.hasAttribute('open');

        if (modalAberto && modalInfo) {
            const abaAtiva = modalInfo.querySelector('.tab-content.ativo')?.id || 'sinopse';
            
            const containerMusicas = modalInfo.querySelector('#musicas');
            const containerRelacionados = modalInfo.querySelector('#relacionados');
            const containerStreaming = modalInfo.querySelector('#streaming');
            const containerTrailer = modalInfo.querySelector('#trailer');

            if (containerMusicas) containerMusicas.innerHTML = renderizarAbaMusicas(anime.theme);
            if (containerRelacionados) containerRelacionados.innerHTML = renderizarAbaRelacionados(anime.relations);
            if (containerStreaming) containerStreaming.innerHTML = renderizarAbaStreaming(linksStreaming);
            
            if (containerTrailer && anime.trailer?.embed_url) {
                const trailerUrl = anime.trailer.embed_url.replace(/[?&]autoplay=1/gi, '') + '&rel=0';
                containerTrailer.innerHTML = `<div class="modal-trailer-container"><iframe src="${trailerUrl}" frameborder="0" allowfullscreen></iframe></div>`;
            }
        }
    } catch (e) {
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

    document.body.style.overflow = '';
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
                onclick="adicionarRapido(${anime.mal_id}, '${tituloEncoded}', '${poster}', ${anime.episodes || 0}, '${anime.type}', '${ano}', '${anime.status}')"
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
    let totalAndamento = 0;
    let totalQueroVer = 0;
    
    animes.forEach(anime => {
        totalEps += parseInt(anime.episode) || 0;
        
        if (anime.status === 'Concluído') {
            totalConcluidos++;
        } else if (anime.status === 'Em Andamento') {
            totalAndamento++;
        } else if (anime.status === 'Quero Ver') {
            totalQueroVer++;
        }
    });
    
    const minutos = totalEps * 24;
    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    
    DOM.statsValores.totalAnimes.textContent = totalAnimes;
    DOM.statsValores.totalEpisodios.textContent = totalEps;
    DOM.statsValores.tempoTotal.textContent = (dias > 0 ? `${dias}d ` : '') + `${horas}h`;
    DOM.statsValores.concluidos.textContent = totalConcluidos;
    DOM.statsValores.andamento.textContent = totalAndamento;
    DOM.statsValores.queroVer.textContent = totalQueroVer;
    
    DOM.modais.stats?.showModal();
}

// --- 4. ROLETA INTELIGENTE ---
function abrirModalRoleta() {
    const modal = document.getElementById('roleta-modal');
    if (!modal) return;
    
    if (typeof atualizarDatalistTags === 'function') atualizarDatalistTags(); 
    irParaEtapaRoleta('config');
    
    document.body.style.overflow = 'hidden'; 
    
    modal.showModal();
}

function fecharModalRoleta() {
    const modal = document.getElementById('roleta-modal');
    if (modal) modal.close();
}

function irParaEtapaRoleta(etapa) {
    document.querySelectorAll('.roleta-step').forEach(step => {
        step.classList.remove('ativo');
        step.classList.add('oculto');
    });
    
    const etapaAlvo = document.getElementById(`roleta-step-${etapa}`);
    if (etapaAlvo) {
        etapaAlvo.classList.remove('oculto');
        etapaAlvo.classList.add('ativo');
    }
}

function executarFiltroRoleta() {
    const status = document.querySelector('input[name="rol-status"]:checked').value;
    const tipo = document.querySelector('input[name="rol-tipo"]:checked').value;
    const eps = document.querySelector('input[name="rol-eps"]:checked').value;
    const ano = document.querySelector('input[name="rol-ano"]:checked').value;
    const fav = document.getElementById('rol-fav').checked;
    const tag = document.getElementById('rol-tag').value.trim().toLowerCase();

    let animes = Object.values(catalogoPessoal);

    if (status !== 'todos') animes = animes.filter(a => a.status === status);
    
    if (tipo !== 'todos') animes = animes.filter(a => a.type === tipo);
    
    if (eps !== 'todos') {
        animes = animes.filter(a => {
            const ep = a.maxEpisodes || 0;
            if (eps === 'curto') return ep >= 1 && ep <= 13;
            if (eps === 'medio') return ep >= 14 && ep <= 26;
            if (eps === 'longo') return ep >= 27 && ep <= 50;
            if (eps === 'epico') return ep >= 51;
            return false;
        });
    }

    if (ano !== 'todos') {
        animes = animes.filter(a => {
            const y = parseInt(a.year) || 0;
            if (y === 0) return false; 
            if (ano === 'classico') return y <= 1999;
            if (ano === '2000') return y >= 2000 && y <= 2009;
            if (ano === '2010') return y >= 2010 && y <= 2019;
            if (ano === 'atual') return y >= 2020;
            return false;
        });
    }

    if (fav) animes = animes.filter(a => a.favorite === true);
    if (tag) animes = animes.filter(a => a.customTags && a.customTags.includes(tag));

    return { resultados: animes, filtrosUsados: { status, tipo, eps, ano, fav, tag } };
}

function gerarPillsDeMatch(filtros, anime) {
    let html = '';
    
    if (filtros.status !== 'todos') html += `<span class="match-pill"><i class="emoji-fix">✔️</i> ${anime.status}</span>`;
    
    if (filtros.tipo !== 'todos') {
        const nomeTipo = MAPA_TIPOS_MIDIA[anime.type] || anime.type || 'N/A';
        html += `<span class="match-pill"><i class="emoji-fix">✔️</i> ${nomeTipo}</span>`;
    }
    
    if (filtros.eps !== 'todos') html += `<span class="match-pill"><i class="emoji-fix">✔️</i> ${anime.maxEpisodes || '?'} Eps</span>`;
    
    if (filtros.ano !== 'todos') html += `<span class="match-pill"><i class="emoji-fix">✔️</i> Lançado em ${anime.year}</span>`;
    
    if (filtros.fav) html += `<span class="match-pill"><i class="emoji-fix">✔️</i> ⭐ Favorito</span>`;
    
    if (filtros.tag) html += `<span class="match-pill"><i class="emoji-fix">✔️</i> #${filtros.tag}</span>`;

    if (html === '') html = `<span class="match-pill"><i class="emoji-fix">🎲</i> Sorteio 100% Aleatório</span>`;

    return html;
}

function processarSorteioRoleta() {
    const { resultados, filtrosUsados } = executarFiltroRoleta();
    
    if (resultados.length === 0) {
        showToast("🕵️‍♂️ Nenhum anime sobreviveu a essa combinação! Flexibilize os filtros.", "warning");
        return;
    }
    
    irParaEtapaRoleta('animacao');
    
    setTimeout(() => {
        const index = Math.floor(Math.random() * resultados.length);
        const animeSorteado = resultados[index];
        
        const posterEl = document.getElementById('rol-res-poster');
        posterEl.src = animeSorteado.largePoster || animeSorteado.poster || CONFIG.PLACEHOLDER_IMAGE;
        document.getElementById('rol-res-titulo').textContent = animeSorteado.title;
        document.getElementById('rol-res-matches').innerHTML = gerarPillsDeMatch(filtrosUsados, animeSorteado);
        
        const btnDetalhes = document.getElementById('btn-rol-ver-detalhes');
        btnDetalhes.onclick = () => {
            fecharModalRoleta();
            abrirModal(animeSorteado.mal_id);
        };
        
        irParaEtapaRoleta('resultado');
    }, 1500);
}

async function animacaoSurpresaRoleta() {
    const todos = Object.values(catalogoPessoal);
    if(todos.length === 0) {
        showToast("Seu catálogo está vazio!", "info");
        return;
    }

    const modal = document.getElementById('roleta-modal');
        if (modal) modal.scrollTo({ top: 0, behavior: 'smooth' });
    
    const btnSurpresa = document.getElementById('btn-rol-surpresa');
    const btnGirar = document.getElementById('btn-rol-girar');
    btnSurpresa.disabled = true;
    btnGirar.disabled = true;
    btnSurpresa.style.opacity = '0.5';

    const escolhido = todos[Math.floor(Math.random() * todos.length)];
    
    const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const tempoPasso = 500;
    
    const mapStatus = { 'Quero Ver': 'qv', 'Em Andamento': 'ea', 'Concluído': 'co' };
    if(mapStatus[escolhido.status]) document.getElementById('rol-st-' + mapStatus[escolhido.status]).checked = true;
    else document.getElementById('rol-st-qq').checked = true;
    await esperar(tempoPasso);
    
    const mapTipo = { 'TV': 'tv', 'Movie': 'mv', 'OVA': 'ov', 'ONA': 'ona', 'Special': 'sp', 'TV Special': 'tvsp', 'Music': 'mu' };
    if(mapTipo[escolhido.type]) document.getElementById('rol-tp-' + mapTipo[escolhido.type]).checked = true;
    else document.getElementById('rol-tp-qq').checked = true;
    await esperar(tempoPasso);
    
    const ep = escolhido.maxEpisodes || 0;
    if (ep >= 1 && ep <= 13) document.getElementById('rol-ep-curto').checked = true;
    else if (ep >= 14 && ep <= 26) document.getElementById('rol-ep-medio').checked = true;
    else if (ep >= 27 && ep <= 50) document.getElementById('rol-ep-longo').checked = true;
    else if (ep >= 51) document.getElementById('rol-ep-epico').checked = true;
    else document.getElementById('rol-ep-qq').checked = true;
    await esperar(tempoPasso);
    
    const y = parseInt(escolhido.year) || 0;
    if (y > 0 && y <= 1999) document.getElementById('rol-an-classico').checked = true;
    else if (y >= 2000 && y <= 2009) document.getElementById('rol-an-2000').checked = true;
    else if (y >= 2010 && y <= 2019) document.getElementById('rol-an-2010').checked = true;
    else if (y >= 2020) document.getElementById('rol-an-atual').checked = true;
    else document.getElementById('rol-an-qq').checked = true;
    await esperar(tempoPasso);

    document.getElementById('rol-fav').checked = escolhido.favorite;
    const tagInput = document.getElementById('rol-tag');
    if (escolhido.customTags && escolhido.customTags.length > 0) {
        tagInput.value = escolhido.customTags[Math.floor(Math.random() * escolhido.customTags.length)];
    } else {
        tagInput.value = '';
    }
    
    await esperar(600);

    btnSurpresa.disabled = false;
    btnGirar.disabled = false;
    btnSurpresa.style.opacity = '1';
    processarSorteioRoleta();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fechar-roleta')?.addEventListener('click', fecharModalRoleta);
    document.getElementById('btn-rol-girar')?.addEventListener('click', processarSorteioRoleta);
    document.getElementById('btn-rol-surpresa')?.addEventListener('click', animacaoSurpresaRoleta);
    document.getElementById('btn-rol-reroll')?.addEventListener('click', processarSorteioRoleta);
    document.getElementById('btn-rol-voltar')?.addEventListener('click', () => irParaEtapaRoleta('config'));
});