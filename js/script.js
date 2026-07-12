// ========================================================
// CATÁLOGO DE ANIMES PESSOAL
// ========================================================
// Estrutura:
// 1. Estado da Aplicação
// 2. Cards
// 3. Busca e API
// 4. Modo de Visualização
// 5. PWA & Service Worker
// 6. Event Listeners
// 7. Inicialização
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
// 2. CARDS
// ========================================================

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

    const fragmento = document.createDocumentFragment();

    for (const savedData of animesArray) {
        const card = renderizarCardAnime({
            mal_id: savedData.mal_id,
            title: savedData.title,
            images: { jpg: { image_url: savedData.poster } },
            type: savedData.type,
            year: savedData.year,
            status: savedData.statusLancamento
        }, true, savedData, true);

        if (card) fragmento.appendChild(card);
    }

    DOM.cards.lista.appendChild(fragmento);
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

// ========================================================
// 3. BUSCA E API
// ========================================================

async function buscarAnimes(query, page = 1) {
    if (searchController) searchController.abort();

    searchController = new AbortController();

    showGlobalLoading(`Buscando animes...`);
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
        const data = await apiBuscarAnimes(query, page, searchController.signal);

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
        if (error.name === 'AbortError') {
            console.log('Busca anterior interrompida corretamente.');
            return; 
        }
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
// 5. MODO DE VISUALIZAÇÃO
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
// 6. PWA & SERVICE WORKER
// ========================================================

function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {

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
// 7. EVENT LISTENERS
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

    // Mobile Cards
    DOM.cards.lista?.addEventListener('click', (e) => {
    if (window.innerWidth > 768) return;

    const cardClicado = e.target.closest('.card-anime');
    if (!cardClicado) return;

    if (e.target.closest('button') || e.target.closest('input')) return;

    const estavaAtivo = cardClicado.classList.contains('active-mobile');
    document.querySelectorAll('.active-mobile').forEach(c => c.classList.remove('active-mobile'));

    if (!estavaAtivo) {
        cardClicado.classList.add('active-mobile');
    }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.card-anime')) {
            document.querySelectorAll('.active-mobile').forEach(card => card.classList.remove('active-mobile'));
        }
    });

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

    // Calendário
    const btnCalendario = document.getElementById('btn-calendario');
    if (btnCalendario) {
        btnCalendario.addEventListener('click', () => {
            carregarCalendarioSemanal(); 
        });
    } else {
        console.error("❌ Botão de calendário não encontrado no HTML!");
    }

    // E para fechar o novo modal:
    DOM.modais.calendarioFecharBtn?.addEventListener('click', () => {
        DOM.modais.calendario.close();
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

    // Salvamento antes de sair
    window.addEventListener('beforeunload', () => {
        if (typeof salvarCatalogoImediato === 'function') {
            salvarCatalogoImediato();
        }
    });

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
// 8. INICIALIZAÇÃO
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
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

    setTimeout(sincronizacaoInteligente, 5000);
});