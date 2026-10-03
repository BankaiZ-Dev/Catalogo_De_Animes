// ========================================================
// CARREGAR E SALVAR CATÁLOGO
// ========================================================

let catalogoPessoal = {};
let rodadaSyncAtual = 0;

function carregarCatalogo() { 
    const data = localStorage.getItem(STORAGE_KEYS.CATALOGO); 
    if (data) {
        catalogoPessoal = JSON.parse(data);
        Object.keys(catalogoPessoal).forEach(malId => {
            if (!catalogoPessoal[malId].hasOwnProperty('favorite')) {
                catalogoPessoal[malId].favorite = false;
            }
            if (!catalogoPessoal[malId].hasOwnProperty('customTags')) {
                catalogoPessoal[malId].customTags = [];
            }
        });
        salvarCatalogo();
    }
}

function salvarCatalogoImediato() {
    localStorage.setItem(STORAGE_KEYS.CATALOGO, JSON.stringify(catalogoPessoal));
}

const salvarCatalogo = debounce(() => {
    salvarCatalogoImediato();
}, 500);

// ========================================================
// MODO DE VISUALIZAÇÃO
// ========================================================

function salvarModoVisualizacao(mode) {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
}

function carregarModoVisualizacao() {
    return localStorage.getItem(STORAGE_KEYS.VIEW_MODE) || 'grid';
}

// ========================================================
// BACKUP - IMPORTAR/EXPORTAR
// ========================================================

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
    leitor.onload = async function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (typeof dados !== 'object') throw new Error();

            const confirmou = await confirmarAcao(
                "Isso substituirá todo o seu catálogo atual pelos dados do arquivo. Deseja continuar?",
                "Restaurar Backup",
                "Restaurar",
                true
            );

            if (confirmou) {
                Object.keys(dados).forEach(malId => {
                    const anime = dados[malId];
                    
                    if (!anime.hasOwnProperty('favorite')) {
                        anime.favorite = false;
                    }

                    if (!anime.hasOwnProperty('customTags')) {
                        anime.customTags = [];
                    }

                    if (!anime.hasOwnProperty('year') || anime.year === undefined) {
                        anime.year = '----';
                    }

                    if (!anime.hasOwnProperty('type')) {
                        anime.type = 'TV';
                    }
                });

                catalogoPessoal = dados;
                salvarCatalogoImediato();
                carregarAnimesSalvos();
                
                showToast("Restaurado com sucesso!", "success");
            }
        } catch (error) {
            showToast("Arquivo inválido.", "error");
        }
    };
    leitor.readAsText(arquivo);
    event.target.value = '';
}

// ========================================================
// FUNÇÕES DE SINCRONIZAÇÃO DE DADOS
// ========================================================

function traduzirStatusLancamento(statusEn) {
    const mapa = {
        'Finished Airing': 'Concluído',
        'Currently Airing': 'Em Exibição',
        'Not yet aired': 'Em Breve',
        'Unknown': 'Desconhecido'
    };
    return mapa[statusEn] || statusEn || 'Desconhecido';
}

function verificarAtualizacaoAno(malId, anoApi) {
    const anime = catalogoPessoal[malId];
    if (anime && (anime.year === '----' || !anime.year) && anoApi) {
        anime.year = anoApi;
        console.log(`[Sync] Ano atualizado: ${anime.title} -> ${anoApi}`);
        return true;
    }
    return false;
}

function verificarAtualizacaoEpisodios(malId, totalEpsApi) {
    const anime = catalogoPessoal[malId];
    if (anime && totalEpsApi && totalEpsApi > 0 && anime.maxEpisodes !== totalEpsApi) {
        anime.maxEpisodes = totalEpsApi;
        if (anime.episode >= anime.maxEpisodes && anime.status !== 'Concluído') {
            anime.status = 'Concluído';
            anime.episode = anime.maxEpisodes;
        }
        return true;
    }
    return false;
}

function verificarAtualizacaoLancamento(malId, statusApi) {
    const anime = catalogoPessoal[malId];
    if (anime && statusApi && anime.statusLancamento !== statusApi) {
        anime.statusLancamento = statusApi;
        console.log(`[Sync] Status de Lançamento atualizado: ${anime.title} -> ${statusApi}`);
        return true;
    }
    return false;
}

function verificarAtualizacaoTipo(malId, tipoApi) {
    const anime = catalogoPessoal[malId];
    if (anime && tipoApi && tipoApi !== 'Unknown' && anime.type !== tipoApi) {
        anime.type = tipoApi;
        console.log(`[Sync] Formato atualizado: ${anime.title} -> ${tipoApi}`);
        return true;
    }
    return false;
}

function verificarAtualizacaoTitulo(malId, dadosNovos) {
    const anime = catalogoPessoal[malId];
    if (!anime || !dadosNovos) return false;

    if (dadosNovos.title_english && anime.title !== dadosNovos.title_english && (anime.title === dadosNovos.title || !anime.title)) {
        console.log(`[Sync] Título atualizado: "${anime.title}" -> "${dadosNovos.title_english}"`);
        anime.title = dadosNovos.title_english;
        return true;
    }
    return false;
}

async function apagarImagemDoCache(url) {
    if (!url || url.includes('placehold.co') || !('caches' in window)) return;
    try {
        const imageCache = await caches.open('anime-images-cache');
        await imageCache.delete(url);
    } catch (e) {
        console.warn('[Cache] Falha ao remover imagem antiga:', e);
    }
}

function verificarAtualizacaoPosters(malId, dadosNovos) {
    const anime = catalogoPessoal[malId];
    if (!anime || !dadosNovos?.images?.jpg) return false;

    const novoPoster = dadosNovos.images.jpg.image_url;
    const novoLargePoster = dadosNovos.images.jpg.large_image_url || novoPoster;
    let alterou = false;

    if (novoPoster && anime.poster && anime.poster !== novoPoster) {
        apagarImagemDoCache(anime.poster);
        anime.poster = novoPoster;
        alterou = true;
    } else if (novoPoster && (!anime.poster || anime.poster.includes('placehold.co'))) {
        anime.poster = novoPoster;
        alterou = true;
    }

    if (novoLargePoster && anime.largePoster && anime.largePoster !== novoLargePoster) {
        apagarImagemDoCache(anime.largePoster);
        anime.largePoster = novoLargePoster;
        alterou = true;
    } else if (novoLargePoster && (!anime.largePoster || anime.largePoster.includes('placehold.co'))) {
        anime.largePoster = novoLargePoster;
        alterou = true;
    }

    if (alterou) {
        console.log(`[Sync] Pôster atualizado e cache antigo descartado: ${anime.title}`);
    }

    return alterou;
}

// ========================================================
// ORQUESTRADOR DE METADADOS COMPLETOS
// ========================================================

function verificarAtualizacaoMetadadosCompletos(malId, dadosNovos) {
    const anime = catalogoPessoal[malId];
    if (!anime || !dadosNovos) return [];

    const alteracoes = [];

    if (verificarAtualizacaoLancamento(malId, dadosNovos.status)) {
        alteracoes.push(`Status: ${traduzirStatusLancamento(anime.statusLancamento)}`);
    }

    if (verificarAtualizacaoEpisodios(malId, dadosNovos.episodes)) {
        alteracoes.push(`Episódios: ${anime.maxEpisodes}`);
    }

    const anoAPI = dadosNovos.year || dadosNovos.aired?.prop?.from?.year;
    if (verificarAtualizacaoAno(malId, anoAPI)) {
        alteracoes.push(`Ano: ${anime.year}`);
    }

    if (verificarAtualizacaoTipo(malId, dadosNovos.type)) {
        const nomeTipo = (typeof MAPA_TIPOS_MIDIA !== 'undefined' && MAPA_TIPOS_MIDIA[anime.type]) || anime.type;
        alteracoes.push(`Formato: ${nomeTipo}`);
    }

    if (verificarAtualizacaoTitulo(malId, dadosNovos)) {
        alteracoes.push(`Título: ${anime.title}`);
    }

    if (verificarAtualizacaoPosters(malId, dadosNovos)) {
        alteracoes.push('Capa Atualizada');
    }

    if ((!anime.synopsis || anime.synopsis.length < 10) && dadosNovos.synopsis) {
        anime.synopsis = dadosNovos.synopsis;
        alteracoes.push('Sinopse Atualizada');
    }

    if (dadosNovos.duration && anime.duration !== dadosNovos.duration) {
        anime.duration = dadosNovos.duration;
    }

    if (dadosNovos.aired) anime.aired = dadosNovos.aired;
    if (dadosNovos.season) anime.season = dadosNovos.season;
    if (dadosNovos.genres && dadosNovos.genres.length > 0) {
        anime.genres = dadosNovos.genres.map(g => g.name);
    }
    if (dadosNovos.studios && dadosNovos.studios.length > 0) {
        anime.studios = dadosNovos.studios.map(s => s.name);
    }

    return alteracoes;
}

// ========================================================
// SINCRONIZAÇÃO INTELIGENTE ROTATIVA
// ========================================================

async function sincronizacaoInteligente() {
    if (!navigator.onLine) {
        if (typeof agendarSincronizacao === 'function') agendarSincronizacao(60000);
        return;
    }

    rodadaSyncAtual++;

    const agora = Date.now();
    const INTERVALO_QUENTE_MS = 12 * 60 * 60 * 1000;
    const INTERVALO_FRIO_MS   = 7 * 24 * 60 * 60 * 1000;

    const todosAnimes = Object.values(catalogoPessoal);

    const filaQuente = todosAnimes.filter(anime => {
        const faltaEpisodios = (!anime.maxEpisodes || anime.maxEpisodes === 0);
        const faltaAno       = (anime.year === '----' || !anime.year);
        const faltaStatus    = (!anime.statusLancamento || anime.statusLancamento === 'Unknown');
        const emExibicao     = (anime.statusLancamento === 'Currently Airing');
        const emBreve        = (anime.statusLancamento === 'Not yet aired');

        const precisaChecagem = faltaEpisodios || faltaAno || faltaStatus || emExibicao || emBreve;
        if (!precisaChecagem) return false;

        if (anime.lastSync && (agora - new Date(anime.lastSync).getTime() < INTERVALO_QUENTE_MS)) {
            return false;
        }
        return true;
    });

    const filaFria = todosAnimes.filter(anime => {
        const jaConcluido = (anime.statusLancamento === 'Finished Airing' && anime.maxEpisodes > 0);
        if (!jaConcluido) return false;

        if (!anime.lastSync) return true;
        return (agora - new Date(anime.lastSync).getTime() > INTERVALO_FRIO_MS);
    });

    const ordenarPorTempo = (a, b) => {
        if (!a.lastSync && b.lastSync) return -1;
        if (a.lastSync && !b.lastSync) return 1;
        if (!a.lastSync && !b.lastSync) return 0;
        return new Date(a.lastSync) - new Date(b.lastSync);
    };

    filaQuente.sort(ordenarPorTempo);
    filaFria.sort(ordenarPorTempo);

    const filaTotal = [...filaQuente, ...filaFria];

    if (filaTotal.length === 0) {
        console.log(`[Sync] ✅ Rodada #${rodadaSyncAtual}: Catálogo 100% atualizado. Próxima checagem em 3 minutos.`);
        if (typeof agendarSincronizacao === 'function') agendarSincronizacao(3 * 60 * 1000);
        return;
    }

    console.group(`[Sync] 📊 Rodada #${rodadaSyncAtual} — Fila: ${filaTotal.length} elegíveis (${filaQuente.length} 🔥 Quente | ${filaFria.length} ❄️ Fria)`);
    console.table(filaTotal.map((a, idx) => ({
        Posição: `#${idx + 1}`,
        Prioridade: filaQuente.includes(a) ? '🔥 Quente (12h)' : '❄️ Fria (7d)',
        Título: a.title,
        Status: a.statusLancamento || 'Unknown',
        Eps: `${a.episode}/${a.maxEpisodes || '?'}`,
        ÚltimoSync: a.lastSync ? new Date(a.lastSync).toLocaleTimeString('pt-BR') : 'Nunca verificado'
    })));
    console.groupEnd();

    const animesRodada = filaTotal.slice(0, 5);
    const mudancasQuentes = [];
    const mudancasFrias = [];

    for (let i = 0; i < animesRodada.length; i++) {
        if (!navigator.onLine) break;

        const anime = animesRodada[i];
        const ehQuente = filaQuente.includes(anime);
        const posicaoFila = i + 1;

        try {
            await new Promise(r => setTimeout(r, 3500));

            console.log(`[Sync] [${posicaoFila}/5] Consultando API: "${anime.title}"...`);
            const json = await apiObterDetalhesFull(anime.mal_id);
            const dadosNovos = json?.data;

            anime.lastSync = new Date().toISOString();

            if (!dadosNovos) {
                salvarCatalogoImediato();
                continue;
            }

            const alteracoes = verificarAtualizacaoMetadadosCompletos(anime.mal_id, dadosNovos);

            if (alteracoes.length > 0) {
                salvarCatalogoImediato();
                atualizarCardNaTela(
                    anime.mal_id, 
                    anime.title, 
                    anime.poster, 
                    anime.maxEpisodes, 
                    anime.type, 
                    anime.year, 
                    anime.statusLancamento
                );

                const itemHtml = `
                    <div class="toast-sync-item">
                        <span class="toast-sync-nome">${anime.title}</span>
                        <span class="toast-sync-detalhe">${alteracoes.join(' • ')}</span>
                    </div>`;

                if (ehQuente) {
                    mudancasQuentes.push(itemHtml);
                } else {
                    mudancasFrias.push(itemHtml);
                }

                console.log(`[Sync] ✅ Atualizado [${posicaoFila}/5] (${ehQuente ? '🔥' : '❄️'}): "${anime.title}"`);
            } else {
                salvarCatalogoImediato();
                console.log(`[Sync] ℹ️ Sem novidades para: "${anime.title}"`);
            }

        } catch (erro) {
            console.error(`[Sync] ❌ Falha ao verificar "${anime.title}":`, erro);
            anime.lastSync = new Date().toISOString();
            salvarCatalogoImediato();
        }
    }

    const temMudancas = mudancasQuentes.length > 0 || mudancasFrias.length > 0;

    if (temMudancas) {
        let conteudoHtml = `
            <div class="toast-sync-container">
                <div class="toast-sync-topo">
                    <span class="toast-sync-titulo">🔄 Atualizações Encontradas</span>
                    <span class="toast-sync-badge">Rodada #${rodadaSyncAtual}</span>
                </div>`;

        if (mudancasQuentes.length > 0) {
            conteudoHtml += `
                <div class="toast-sync-bloco">
                    <span class="toast-sync-secao-quente">🔥 Em Acompanhamento</span>
                    ${mudancasQuentes.join('')}
                </div>`;
        }

        if (mudancasFrias.length > 0) {
            conteudoHtml += `
                <div class="toast-sync-bloco">
                    <span class="toast-sync-secao-fria">❄️ Revisão Semanal</span>
                    ${mudancasFrias.join('')}
                </div>`;
        }

        conteudoHtml += `</div>`;

        showToast(conteudoHtml, 'success', 15000);
    } else {
        console.log(`[Sync] 💤 Rodada #${rodadaSyncAtual} concluída sem novidades.`);
    }

    if (typeof agendarSincronizacao === 'function') {
        console.log(`[Sync] ⏱️ Próxima rodada agendada para daqui a 3 minutos...`);
        agendarSincronizacao(3 * 60 * 1000);
    }
}

// ========================================================
// SALVAMENTO DAS NOTAS
// ========================================================

const salvarNotaLocal = debounce((malId, textoNota) => {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        catalogoPessoal[malId].notes = textoNota;
        salvarCatalogo();
    }
}, 500);

async function precarregarImagensSegundoPlano() {
    if (!navigator.onLine || !('caches' in window)) return;

    const animes = Object.values(catalogoPessoal);
    if (animes.length === 0) return;

    try {
        const imageCache = await caches.open('anime-images-cache');
        const urlsParaVerificar = [];

        animes.forEach(anime => {
            if (anime.poster && !anime.poster.includes('placehold.co')) {
                urlsParaVerificar.push(anime.poster);
            }
            if (anime.largePoster && !anime.largePoster.includes('placehold.co')) {
                urlsParaVerificar.push(anime.largePoster);
            }
        });

        const urlsUnicas = [...new Set(urlsParaVerificar)];
        let baixadasAgora = 0;
        let jaExistentes = 0;

        console.log(`[Cache] Analisando ${urlsUnicas.length} pôsteres do catálogo...`);

        for (let i = 0; i < urlsUnicas.length; i++) {
            if (!navigator.onLine) {
                console.warn('[Cache] Conexão perdida. Pausando pré-carregamento.');
                break;
            }

            const url = urlsUnicas[i];
            const jaSalvo = await imageCache.match(url);
            
            if (jaSalvo) {
                jaExistentes++;
            } else {
                await new Promise((resolve) => {
                    const img = new Image();
                    img.src = url;
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });

                baixadasAgora++;
                if (baixadasAgora % 15 === 0) {
                    console.log(`[Cache] Progresso: ${baixadasAgora} novas imagens salvas no disco...`);
                }

                await new Promise(r => setTimeout(r, 200));
            }
        }
        
        console.log(`[Cache] Concluído! ${jaExistentes} já estavam no cache, ${baixadasAgora} foram baixadas agora.`);
    } catch (erro) {
        console.warn('[Cache] Falha na rotina de pré-carregamento:', erro);
    }
}

async function limparImagensOrfasDoCache() {
    if (!('caches' in window)) return;

    try {
        const imageCache = await caches.open('anime-images-cache');
        const requisicoesSalvas = await imageCache.keys();

        const urlsAtivas = new Set();
        Object.values(catalogoPessoal).forEach(anime => {
            if (anime.poster) urlsAtivas.add(anime.poster);
            if (anime.largePoster) urlsAtivas.add(anime.largePoster);
        });

        let apagadas = 0;
        for (const req of requisicoesSalvas) {
            if (!urlsAtivas.has(req.url)) {
                await imageCache.delete(req);
                apagadas++;
            }
        }

        if (apagadas > 0) {
            console.log(`[Cache] 🧹 Faxina concluída: ${apagadas} imagem(ns) órfã(s) removida(s) do disco.`);
        }
    } catch (erro) {
        console.warn('[Cache] Erro durante a limpeza de imagens órfãs:', erro);
    }
}