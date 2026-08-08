// ========================================================
// CALENDÁRIO SEMANAL DE LANÇAMENTOS
// ========================================================

let cacheCalendario = null;

function limparCacheCalendario() {
    cacheCalendario = null;
}

async function carregarCalendarioSemanal() {
    if (cacheCalendario) {
        renderizarCalendario(cacheCalendario);
        return; 
    }
        
    showGlobalLoading("Carregando calendário...");

    try {
        const dados = await apiObterCalendarioSemanal();
        
        if (!dados || !dados.data) {
            throw new Error("A API retornou dados vazios.");
        }

        cacheCalendario = agruparAnimesPorDia(dados.data);
        renderizarCalendario(cacheCalendario);
        
        hideGlobalLoading();
    } catch (erro) {
        console.error("❌ ERRO NO CALENDÁRIO:", erro);
        hideGlobalLoading(); 
        showToast("Erro ao carregar: " + erro.message, "error");
    }
}

function agruparAnimesPorDia(animes) {
    const agrupado = {};
    DIAS_SEMANA_PT.forEach(dia => agrupado[dia] = []);

    const animesUnicos = [];
    const idsProcessados = new Set();

    animes.forEach(anime => {
        if (!idsProcessados.has(anime.mal_id)) {
            animesUnicos.push(anime);
            idsProcessados.add(anime.mal_id);
        }
    });

    const listaCatalogo = Object.values(catalogoPessoal);

    animesUnicos.forEach(anime => {
        if (!anime.broadcast || !anime.broadcast.day) return;

        const idApi = String(anime.mal_id);
        const animeSalvo = listaCatalogo.find(item => String(item.mal_id) === idApi);

        if (!animeSalvo) return; 

        const statusNormalizado = (animeSalvo.status || '').trim().toLowerCase();
        if (statusNormalizado !== 'quero ver' && statusNormalizado !== 'em andamento') return;

        const horarioConvertido = converterHorarioJapaoParaBrasil(anime.broadcast);
        
        if (horarioConvertido) {
            agrupado[horarioConvertido.nomeDiaPt].push(anime);
        }
    });
    return agrupado;
}

function renderizarCalendario(calendarioAgrupado) {
    const container = DOM.modais.calendarioConteudo; 
    container.innerHTML = ''; 
    
    let totalExibido = 0;
    const boardCalendario = document.createElement('div');
    boardCalendario.className = 'calendario-board';

    DIAS_SEMANA_PT.forEach(dia => {
        const animesDoDia = calendarioAgrupado[dia] || [];
        if (animesDoDia.length > 0) {
            totalExibido += animesDoDia.length;
            const blocoDia = document.createElement('div');
            blocoDia.className = 'calendario-dia';
            blocoDia.innerHTML = `<h3>📅 ${dia}</h3>`;
            const grid = document.createElement('div');
            grid.className = 'calendario-grid';
            
            animesDoDia.forEach(anime => {
                grid.innerHTML += `
                    <div class="mini-card-anime" onclick="abrirModal(${anime.mal_id})" title="Clique para ver detalhes">
                        <div class="mini-poster-wrapper">
                            <img src="${anime.images.jpg.image_url}" alt="${anime.title}" loading="lazy">
                        </div>
                        <div class="mini-card-info"><p>${anime.title}</p></div>
                    </div>`;
            });
            blocoDia.appendChild(grid);
            boardCalendario.appendChild(blocoDia);
        }
    });

    if (totalExibido === 0) {
        container.innerHTML = `<div class="calendario-vazio"><h3>Nenhum lançamento esta semana!</h3></div>`;
    } else {
        container.appendChild(boardCalendario);
    }

    DOM.modais.calendario.showModal();
}