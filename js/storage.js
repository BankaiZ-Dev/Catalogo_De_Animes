// ========================================================
// STORAGE & BACKUP
// Gerencia persistência de dados no localStorage
// ========================================================

// ========================================================
// CARREGAR E SALVAR CATÁLOGO
// ========================================================

let catalogoPessoal = {};

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
// MODO ESCURO
// ========================================================

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, isDarkMode ? 'true' : 'false');
}

function aplicarModoEscuroInicial() {
    const isDarkMode = localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
    if (isDarkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
}

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
    leitor.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (typeof dados !== 'object') throw new Error();
            if (confirm("Isso substituirá seu catálogo atual, quer continuar?")) {
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
    if (anime && (!anime.maxEpisodes || anime.maxEpisodes === 0) && totalEpsApi > 0) {
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
    if (anime && (!anime.statusLancamento || anime.statusLancamento === 'Unknown') && statusApi) {
        anime.statusLancamento = statusApi;
        console.log(`[Sync] Status de Lançamento atualizado: ${anime.title} -> ${statusApi}`);
        return true;
    }
    return false;
}

async function sincronizacaoInteligente() {
    if (!navigator.onLine) return;

    const filaPendentes = Object.values(catalogoPessoal).filter(anime => {
        const faltaEpisodios = (!anime.maxEpisodes || anime.maxEpisodes === 0);
        const faltaAno = (anime.year === '----' || !anime.year);
        const faltaStatus = (!anime.statusLancamento || anime.statusLancamento === 'Unknown');
        return faltaEpisodios || faltaAno || faltaStatus;
    });
    if (filaPendentes.length === 0) return;

    for (const anime of filaPendentes.slice(0, 5)) {
        try {
            await new Promise(r => setTimeout(r, 3500));

            const json = await apiObterDadosSimples(anime.mal_id);
            const dadosNovos = json.data;

            let houveMudanca = false;

            if (verificarAtualizacaoAno(anime.mal_id, dadosNovos.year || dadosNovos.aired?.prop?.from?.year)) houveMudanca = true;
            if (verificarAtualizacaoEpisodios(anime.mal_id, dadosNovos.episodes)) houveMudanca = true;
            if (verificarAtualizacaoLancamento(anime.mal_id, dadosNovos.status)) houveMudanca = true;

            if (houveMudanca) {
                salvarCatalogoImediato();
                atualizarCardNaTela(anime.mal_id, anime.title, anime.poster, anime.maxEpisodes, anime.type, anime.year, anime.statusLancamento);
            }
        } catch (erro) { console.error(`[Sync] Falha ao atualizar ${anime.title}:`, erro); }
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