// ========================================================
// DOM.JS - REFERÊNCIAS CENTRALIZADAS DO DOM
// ========================================================

const DOM = {
    // ========================================================
    // CARDS & LISTA
    // ========================================================
    cards: {
        lista: document.querySelector('.lista-cards'),
        container: document.querySelector('.container-catalogo')
    },

    // ========================================================
    // BUSCA & FILTROS
    // ========================================================
    busca: {
        campo: document.getElementById('campo-busca'),
        botaoLimpar: document.getElementById('limpar-busca-btn'),
        resultados: document.getElementById('resultados-busca-api'),
        botaoVoltar: document.getElementById('btn-voltar-catalogo')
    },

    // ========================================================
    // FILTROS & ORDENAÇÃO
    // ========================================================
    filtros: {
        status: document.getElementById('filtro-status'),
        ordenacao: document.getElementById('ordenacao-catalogo')
    },

    // ========================================================
    // PAGINAÇÃO
    // ========================================================
    paginacao: {
        container: document.getElementById('paginacao-container'),
        botaoAnterior: document.getElementById('btn-anterior'),
        botaoProxima: document.getElementById('btn-proxima'),
        numerosContainer: document.getElementById('numeros-paginacao')
    },

    // ========================================================
    // LOADING & NOTIFICAÇÕES
    // ========================================================
    loading: {
        overlay: document.getElementById('global-loading-overlay'),
        texto: document.querySelector('#global-loading-overlay .loading-text')
    },

    notificacoes: {
        toastContainer: document.getElementById('toast-container'),
        pwaUpdateToast: document.getElementById('update-toast'),
        pwaUpdateBtnAgora: document.getElementById('update-btn-agora'),
        pwaUpdateBtnDepois: document.getElementById('update-btn-depois')
    },

    // ========================================================
    // AÇÕES GLOBAIS (Header)
    // ========================================================
    acoesGlobais: {
        botaoDarkMode: document.getElementById('dark-mode-icon-btn'),
        botaoExportar: document.getElementById('btn-exportar'),
        botaoImportar: document.getElementById('btn-importar'),
        inputImportar: document.getElementById('input-importar'),
        botaoStats: document.getElementById('btn-stats'),
        botaoRoleta: document.getElementById('btn-roleta')
    },

    // ========================================================
    // MODO DE VISUALIZAÇÃO
    // ========================================================
    visualizacao: {
        botoes: document.querySelectorAll('.view-btn')
    },

    // ========================================================
    // MODAIS
    // ========================================================
    modais: {
        // Modal de Detalhes
        anime: document.getElementById('anime-modal'),
        animeInfo: document.getElementById('modal-info'),
        animeFecharBtn: document.getElementById('fechar-modal-detalhes'),

        // Modal de Estatísticas
        stats: document.getElementById('stats-modal'),
        statsFecharBtn: document.getElementById('fechar-stats')
    },

    // ========================================================
    // ESTATÍSTICAS (Valores de texto)
    // ========================================================
    statsValores: {
        totalAnimes: document.getElementById('stat-total-animes'),
        totalEpisodios: document.getElementById('stat-total-eps'),
        tempoTotal: document.getElementById('stat-tempo-total'),
        concluidos: document.getElementById('stat-concluidos')
    }
};

// ========================================================
// HELPER PARA PEGAR ELEMENTOS DINÂMICOS
// ========================================================

function getCardAnime(malId) {
    return document.querySelector(`.card-anime[data-mal-id="${malId}"]`);
}

function getInputEpisodios(malId) {
    return document.getElementById(`episode-input-${malId}`);
}

function getTextoProgresso(malId) {
    return document.getElementById(`ep-atual-${malId}`);
}

function getBarraProgresso(malId) {
    return document.getElementById(`bar-prog-${malId}`);
}