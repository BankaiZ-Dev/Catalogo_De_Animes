// ========================================================
// REFERÊNCIAS CENTRALIZADAS DO DOM
// ========================================================

// Atalhos para diminuir o tamanho do código
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelector(sel);
const $all = (sel) => document.querySelectorAll(sel);

const DOM = {
    // ========================================================
    // CARDS & LISTA
    // ========================================================
    cards: {
        lista: $$('.lista-cards'),
        container: $$('.container-catalogo')
    },

    // ========================================================
    // BUSCA & FILTROS
    // ========================================================
    busca: {
        campo: $('campo-busca'),
        botaoBuscar: $('btn-buscar-lupa'),
        form: $$('.busca-input-container'),
        resultados: $('resultados-busca-api'),
        botaoVoltar: $('btn-voltar-catalogo')
    },

    // ========================================================
    // FILTROS & ORDENAÇÃO
    // ========================================================
    filtros: {
        status: $('filtro-status'),
        ordenacao: $('ordenacao-catalogo')
    },

    // ========================================================
    // PAGINAÇÃO
    // ========================================================
    paginacao: {
        container: $('paginacao-container'),
        botaoAnterior: $('btn-anterior'),
        botaoProxima: $('btn-proxima'),
        numerosContainer: $('numeros-paginacao')
    },

    // ========================================================
    // LOADING & NOTIFICAÇÕES
    // ========================================================
    loading: {
        overlay: $('global-loading-overlay'),
        texto: $$('#global-loading-overlay .loading-text')
    },

    notificacoes: {
        toastContainer: $('toast-container'),
        pwaUpdateToast: $('update-toast'),
        pwaUpdateBtnAgora: $('update-btn-agora'),
        pwaUpdateBtnDepois: $('update-btn-depois')
    },

    // ========================================================
    // AÇÕES GLOBAIS (Header)
    // ========================================================
    acoesGlobais: {
        botaoDarkMode: $('dark-mode-icon-btn'),
        botaoExportar: $('btn-exportar'),
        botaoImportar: $('btn-importar'),
        inputImportar: $('input-importar'),
        botaoStats: $('btn-stats'),
        botaoRoleta: $('btn-roleta'),
        botaoTopo: $('btn-topo')
    },

    // ========================================================
    // MODO DE VISUALIZAÇÃO
    // ========================================================
    visualizacao: {
        botoes: $all('.view-btn')
    },

    // ========================================================
    // MODAIS
    // ========================================================
    modais: {
        // Modal de Detalhes
        anime: $('anime-modal'),
        animeInfo: $('modal-info'),
        animeFecharBtn: $('fechar-modal-detalhes'),

        // Modal de Estatísticas
        stats: $('stats-modal'),
        statsFecharBtn: $('fechar-stats')
    },

    // ========================================================
    // ESTATÍSTICAS (Valores de texto)
    // ========================================================
    statsValores: {
        totalAnimes: $('stat-total-animes'),
        totalEpisodios: $('stat-total-eps'),
        tempoTotal: $('stat-tempo-total'),
        concluidos: $('stat-concluidos')
    }
};

// ========================================================
// HELPER PARA PEGAR ELEMENTOS DINÂMICOS
// ========================================================

function getCardAnime(malId) {
    return $$(`.card-anime[data-mal-id="${malId}"]`);
}

function getInputEpisodios(malId) {
    return $(`episode-input-${malId}`);
}

function getTextoProgresso(malId) {
    return $(`ep-atual-${malId}`);
}

function getBarraProgresso(malId) {
    return $(`bar-prog-${malId}`);
}