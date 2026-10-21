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
// GERENCIADOR DE DADOS, MÉTRICAS E BACKUP LOCAL
// ========================================================

function abrirModalGerenciadorDados() {
    const modal = document.getElementById('modal-gerenciador-dados');
    if (!modal) return;

    const dropdown = document.getElementById('dropdown-opcoes');
    if (dropdown) {
        dropdown.classList.remove('ativo', 'aberto');
        dropdown.style.display = '';
    }

    atualizarMetricasArmazenamento();
    atualizarStatusNuvemUI();
    
    const inputConfirmacao = document.getElementById('input-confirmar-reset');
    const btnReset = document.getElementById('btn-confirmar-reset-total');
    if (inputConfirmacao) inputConfirmacao.value = '';
    if (btnReset) btnReset.disabled = true;

    modal.showModal();
}

function fecharModalGerenciadorDados() {
    const modal = document.getElementById('modal-gerenciador-dados');
    if (modal) modal.close();
}

async function atualizarMetricasArmazenamento() {
    const totalAnimes = Object.keys(catalogoPessoal || {}).length;
    const elTotal = document.getElementById('metrica-total-animes');
    if (elTotal) elTotal.textContent = totalAnimes;

    const stringJson = JSON.stringify(catalogoPessoal || {});
    const bytesTexto = new Blob([stringJson]).size;
    const kbTexto = (bytesTexto / 1024).toFixed(1);
    const elDados = document.getElementById('metrica-tamanho-dados');
    if (elDados) elDados.textContent = `${kbTexto} KB`;

    const elCache = document.getElementById('metrica-tamanho-cache');
    if (elCache) {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimativa = await navigator.storage.estimate();
                const bytes = estimativa.usage || 0;
                
                if (bytes >= 1024 * 1024 * 1024) {
                    const usoEmGB = (bytes / (1024 * 1024 * 1024)).toFixed(2);
                    elCache.textContent = `${usoEmGB} GB`;
                } else {
                    const usoEmMB = (bytes / (1024 * 1024)).toFixed(1);
                    elCache.textContent = `${usoEmMB} MB`;
                }
            } catch (e) {
                elCache.textContent = 'Indisponível';
            }
        } else {
            elCache.textContent = 'N/A';
        }
    }
}

function verificarTextoConfirmacaoReset(valor) {
    const btnReset = document.getElementById('btn-confirmar-reset-total');
    if (!btnReset) return;

    btnReset.disabled = valor.trim().toUpperCase() !== 'DELETAR';
}

async function executarLimpezaTotalCatalogo() {
    const inputConfirmacao = document.getElementById('input-confirmar-reset');
    if (inputConfirmacao?.value.trim().toUpperCase() !== 'DELETAR') return;

    try {
        catalogoPessoal = {};
        localStorage.removeItem(STORAGE_KEYS.CATALOGO);

        if ('caches' in window) {
            const chavesCache = await caches.keys();
            await Promise.all(chavesCache.map(nome => caches.delete(nome)));
        }

        fecharModalGerenciadorDados();
        showToast('🗑️ Todos os dados e caches foram limpos com sucesso!', 'success');

        setTimeout(() => {
            window.location.reload();
        }, 1000);

    } catch (erro) {
        console.error('[Limpeza] Falha ao limpar armazenamento:', erro);
        showToast('Erro ao concluir limpeza completa.', 'error');
    }
}

function exportarBackupCatalogo() {
    if (Object.keys(catalogoPessoal).length === 0) {
        return showToast("Catálogo vazio!", "info");
    }

    const dadosJSON = JSON.stringify(catalogoPessoal, null, 2);
    const blob = new Blob([dadosJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const dataHoje = new Date().toISOString().slice(0, 10);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_animes_${dataHoje}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast("💾 Backup baixado com sucesso!", "success");
}

function importarBackupCatalogo(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
                throw new Error('Formato inválido');
            }

            Object.keys(dados).forEach(malId => {
                const anime = dados[malId];
                
                if (!anime.hasOwnProperty('favorite')) anime.favorite = false;
                if (!anime.hasOwnProperty('customTags')) anime.customTags = [];
                if (!anime.hasOwnProperty('year') || anime.year === undefined) anime.year = '----';
                if (!anime.hasOwnProperty('type')) anime.type = 'TV';
            });

            catalogoPessoal = dados;
            salvarCatalogoImediato();
            
            fecharModalGerenciadorDados();
            showToast(`✅ Backup restaurado (${Object.keys(dados).length} animes)!`, "success");

            if (typeof carregarAnimesSalvos === 'function') {
                carregarAnimesSalvos();
            } else {
                setTimeout(() => window.location.reload(), 800);
            }

        } catch (error) {
            console.error('[Backup] Erro ao importar:', error);
            showToast("❌ Arquivo inválido. Certifique-se de escolher um arquivo .json", "error");
        }
    };
    leitor.readAsText(arquivo);
    event.target.value = '';
}

const exportarBackup = exportarBackupCatalogo;
const importarBackup = importarBackupCatalogo;

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
        console.log(`[Sync] ✅ Rodada #${rodadaSyncAtual}: Catálogo 100% atualizado. Próxima checagem em 5 minutos.`);
        if (typeof agendarSincronizacao === 'function') agendarSincronizacao(5 * 60 * 1000);
        return;
    }

    console.groupCollapsed(`[Sync] 📊 Rodada #${rodadaSyncAtual} — Fila: ${filaTotal.length} elegíveis (${filaQuente.length} 🔥 Quente | ${filaFria.length} ❄️ Fria)`);
    console.table(filaTotal.map((a, idx) => ({
        Posição: `#${idx + 1}`,
        Prioridade: filaQuente.includes(a) ? '🔥 Quente (12h)' : '❄️ Fria (7d)',
        Título: a.title,
        Status: a.statusLancamento || 'Unknown',
        Eps: `${a.episode}/${a.maxEpisodes || '?'}`,
        ÚltimoSync: a.lastSync ? new Date(a.lastSync).toLocaleTimeString('pt-BR') : 'Nunca verificado'
    })));
    console.groupEnd();

    const animesRodada = filaTotal.slice(0, 10);
    const mudancasQuentes = [];
    const mudancasFrias = [];

    for (let i = 0; i < animesRodada.length; i++) {
        if (!navigator.onLine) break;

        const anime = animesRodada[i];
        const ehQuente = filaQuente.includes(anime);
        const posicaoFila = i + 1;

        try {
            await new Promise(r => setTimeout(r, 3500));

            console.log(`[Sync] [${posicaoFila}/10] Consultando API: "${anime.title}"...`);
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

                console.log(`[Sync] ✅ Atualizado [${posicaoFila}/10] (${ehQuente ? '🔥' : '❄️'}): "${anime.title}"`);
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
        enviarCatalogoParaNuvem(true);
    } else {
        console.log(`[Sync] 💤 Rodada #${rodadaSyncAtual} concluída sem novidades.`);
    }

    if (typeof agendarSincronizacao === 'function') {
        console.log(`[Sync] ⏱️ Próxima rodada agendada para daqui a 5 minutos...`);
        agendarSincronizacao(5 * 60 * 1000);
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

// ========================================================
// SINCRONIZAÇÃO EM NUVEM (GOOGLE PLANILHAS API)
// ========================================================

const CHAVE_SHEETS_URL = 'sheets_api_url';
const CHAVE_ULTIMO_SYNC_NUVEM = 'sheets_ultimo_sync';

function obterUrlSheets() {
    return localStorage.getItem(CHAVE_SHEETS_URL) || '';
}

function salvarConfiguracaoNuvem() {
    const input = document.getElementById('input-sheets-url');
    if (!input) return;

    const url = input.value.trim();
    if (url && !url.includes('/exec')) {
        return showToast('⚠️ A URL deve terminar com /exec', 'info');
    }

    localStorage.setItem(CHAVE_SHEETS_URL, url);
    atualizarStatusNuvemUI();
    showToast('Configuração de nuvem salva!', 'success');
}

function atualizarStatusNuvemUI() {
    const url = obterUrlSheets();
    const input = document.getElementById('input-sheets-url');
    const elStatus = document.getElementById('texto-status-nuvem');

    if (input && url) input.value = url;

    if (elStatus) {
        if (!url) {
            elStatus.textContent = 'Não configurado';
            elStatus.style.color = 'var(--cor-texto-secundario)';
        } else {
            const ultimoEnvio = localStorage.getItem(CHAVE_ULTIMO_SYNC_NUVEM);
            if (ultimoEnvio) {
                const dataFormatada = new Date(ultimoEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                elStatus.textContent = `Conectado (Último envio: ${dataFormatada})`;
            } else {
                elStatus.textContent = 'Pronto para sincronizar';
            }
            elStatus.style.color = 'var(--status-concluido)';
        }
    }
}

async function enviarCatalogoParaNuvem(silencioso = false) {
    const url = obterUrlSheets();
    if (!url) return;

    try {
        if (!silencioso) showToast('Enviando catálogo para a planilha...', 'info');

        const resposta = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ catalogo: catalogoPessoal })
        });

        const resultado = await resposta.json();

        if (resultado.sucesso) {
            const agora = new Date().toISOString();
            localStorage.setItem(CHAVE_ULTIMO_SYNC_NUVEM, agora);
            atualizarStatusNuvemUI();

            if (!silencioso) {
                showToast(`☁️ Nuvem atualizada! (${resultado.total} animes salvos)`, 'success');
            } else {
                console.log(`[Nuvem] ✅ Catálogo atualizado na planilha automaticamente: ${resultado.total} itens.`);
            }
        } else {
            throw new Error(resultado.erro || 'Falha na resposta do script');
        }
    } catch (erro) {
        console.error('[Nuvem] Falha ao enviar para Google Sheets:', erro);
        if (!silencioso) {
            showToast('Erro ao sincronizar com a planilha.', 'error');
        }
    }
}

function enviarCatalogoParaNuvemManual() {
    if (!obterUrlSheets()) {
        return showToast('Configure a URL da planilha primeiro.', 'info');
    }
    enviarCatalogoParaNuvem(false);
}

async function baixarCatalogoDaNuvem() {
    const url = obterUrlSheets();
    if (!url) {
        return showToast('Configure a URL da planilha primeiro.', 'info');
    }

    try {
        showToast('Consultando planilha no Google Drive...', 'info');

        const resposta = await fetch(url);
        const resultado = await resposta.json();

        if (!resultado.sucesso || !resultado.catalogo) {
            throw new Error(resultado.erro || 'Formato de resposta inválido');
        }

        const totalRecebido = Object.keys(resultado.catalogo).length;
        if (totalRecebido === 0) {
            return showToast('A planilha está vazia no momento.', 'info');
        }

        Object.keys(resultado.catalogo).forEach(malId => {
            const anime = resultado.catalogo[malId];
            if (!anime.hasOwnProperty('favorite')) anime.favorite = false;
            if (!anime.hasOwnProperty('customTags')) anime.customTags = [];
            if (!anime.hasOwnProperty('year') || !anime.year) anime.year = '----';
            if (!anime.hasOwnProperty('type')) anime.type = 'TV';

            if (!anime.dateAdded && !anime.addedAt) {
                anime.dateAdded = anime.lastModified || new Date().toISOString();
                anime.addedAt = anime.dateAdded;
            }
        });

        catalogoPessoal = resultado.catalogo;
        salvarCatalogoImediato();
        atualizarMetricasArmazenamento();
        atualizarStatusNuvemUI();

        showToast(`✅ Catálogo baixado com sucesso (${totalRecebido} animes)!`, 'success');

        if (typeof carregarAnimesSalvos === 'function') {
            carregarAnimesSalvos();
        } else {
            setTimeout(() => window.location.reload(), 1000);
        }

    } catch (erro) {
        console.error('[Nuvem] Erro ao puxar dados da planilha:', erro);
        showToast('Erro ao baixar dados da nuvem. Verifique a URL.', 'error');
    }
}