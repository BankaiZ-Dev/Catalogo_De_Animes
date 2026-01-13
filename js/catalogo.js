// ========================================================
// CATÁLOGO CRUD
// Gerencia adição, remoção e atualização de animes no catálogo
// ========================================================

function fabricarAnimeSalvo(malId, titulo, poster, maxEpisodes, type, year, status = 'Quero Ver') {
    return {
        mal_id: parseInt(malId),
        title: titulo,
        poster: poster,
        status: status,
        episode: 0,
        maxEpisodes: parseInt(maxEpisodes) || 0,
        dateAdded: new Date().toISOString(),
        type: type,
        year: year,
        favorite: false
    };
}

function salvarNovoAnimeNoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial, type, year) {
    const novoAnime = fabricarAnimeSalvo(malId, titulo, posterUrl, maxEpisodes, type, year, statusInicial);
    
    if (statusInicial === 'Concluído' && novoAnime.maxEpisodes) {
        novoAnime.episode = novoAnime.maxEpisodes;
    }

    catalogoPessoal[malId] = novoAnime;
    salvarCatalogo();
}

function atualizarEpisodioEStatus(malId, change) {
    if (!catalogoPessoal.hasOwnProperty(malId)) return { statusChanged: false, savedData: null };
    
    const savedData = catalogoPessoal[malId];
    const statusBefore = savedData.status;

    let newValue = savedData.episode + change;
    if (newValue < 0) newValue = 0;
    savedData.episode = newValue;

    if (savedData.episode === 0) savedData.status = 'Quero Ver';
    else if (savedData.maxEpisodes && savedData.episode >= savedData.maxEpisodes) {
        savedData.status = 'Concluído';
        savedData.episode = savedData.maxEpisodes;
    } else if (savedData.episode > 0) {
        savedData.status = 'Em Andamento';
    }

    salvarCatalogo();

    return { 
        statusChanged: savedData.status !== statusBefore,
        savedData: savedData,
        statusNovo: savedData.status
    };
}

function adicionarAoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial = 'Quero Ver', type = 'TV', year = '----') {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        showToast('Este anime já está no seu catálogo!', 'info');
        return;
    }

    salvarNovoAnimeNoCatalogo(malId, titulo, posterUrl, maxEpisodes, statusInicial, type, year);

    atualizarCardNaTela(malId, titulo, posterUrl, maxEpisodes, type, year);

    showToast(`Anime adicionado como "${statusInicial}"!`, 'info');
}

function adicionarRapido(malId, tituloEncoded, poster, episodes, type, year) {
    const titulo = decodeURIComponent(tituloEncoded);
    
    adicionarAoCatalogo(malId, titulo, poster, episodes, 'Quero Ver', type, year);
    
    const card = getCardAnime(malId);
    if (card) {
        const savedData = catalogoPessoal[malId];
        const newCard = renderizarCardAnime({
            mal_id: malId,
            title: titulo,
            images: { jpg: { image_url: poster } },
            type: type,
            year: year
        }, true, savedData, true);
        
        card.replaceWith(newCard);
    }

    const modalAcoes = document.querySelector('.modal-actions-row');
    const modalAberto = DOM.modais.anime.hasAttribute('open');

    if (modalAberto && modalAcoes) {
        const animeFake = {
            mal_id: malId,
            title: titulo,
            title_english: titulo,
            images: { jpg: { image_url: poster } },
            episodes: episodes,
            type: type,
            year: year
        };

        modalAcoes.outerHTML = gerarBotoesAcaoModal(animeFake, true);
    }
}

function removerDoCatalogo(malId) {
    if (!confirm("Tem certeza que deseja remover este anime? Todo o progresso será perdido.")) {
        return;
    }

    if (catalogoPessoal.hasOwnProperty(malId)) {
        const animeTitulo = catalogoPessoal[malId].title;
        
        const dadosParaReset = {
            mal_id: malId,
            title: catalogoPessoal[malId].title,
            images: { jpg: { image_url: catalogoPessoal[malId].poster } },
            episodes: catalogoPessoal[malId].maxEpisodes,
            type: catalogoPessoal[malId].type,
            year: catalogoPessoal[malId].year
        };

        delete catalogoPessoal[malId];
        salvarCatalogo();

        const card = getCardAnime(malId);
        const isSearchMode = DOM.busca.campo.value.trim().length > 0 || (DOM.busca.resultados && !DOM.busca.resultados.classList.contains('oculto'));

        if (isSearchMode) {
            if (card) {
                const novoCardElement = renderizarCardAnime(dadosParaReset, false, {}, true);
                card.replaceWith(novoCardElement);
            }
        } else {
        if (card) {
            card.classList.add('card-animacao-saida');
            setTimeout(() => card.remove(), 300);
        }
        if (Object.keys(catalogoPessoal).length === 0) {
            setTimeout(() => carregarAnimesSalvos(), 300);
        }
    }

        showToast(`${animeTitulo} Removido do catálogo.`, 'error');
        fecharModal();
    }
}

function atualizarStatusAnime(malId, novoStatus) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        const anime = catalogoPessoal[malId];
        const statusBefore = anime.status;
        
        anime.status = novoStatus;
        if (novoStatus === 'Concluído' && anime.maxEpisodes) {
             anime.episode = anime.maxEpisodes;
        }
        salvarCatalogo();

        const statusChanged = (anime.status !== statusBefore);
        const savedData = anime;
        atualizarElementosDoCard(malId, savedData, statusChanged); 
        
        showToast(`Status de ${anime.title} atualizado para: ${novoStatus}`, 'info');
        fecharModal();
    }
}

function quickUpdate(malId, change) {
    const resultado = atualizarEpisodioEStatus(malId, change);

    if (!resultado.savedData) return;

    atualizarElementosDoCard(malId, resultado.savedData, resultado.statusChanged); 

    if (resultado.statusChanged) {
        let tipoToast = 'info';
        if (resultado.statusNovo === 'Concluído') tipoToast = 'success';
        else if (resultado.statusNovo === 'Em Andamento') tipoToast = 'warning';
        showToast(`Status atualizado para: ${resultado.statusNovo}`, tipoToast);
    }
}

function atualizarEpisodio(malId, novoEpisodio) {
    const newEpisodeInt = parseInt(novoEpisodio);
    if (!catalogoPessoal.hasOwnProperty(malId) || isNaN(newEpisodeInt) || newEpisodeInt < 0) return;
    quickUpdate(malId, newEpisodeInt - catalogoPessoal[malId].episode);
}

function incrementarEpisodio(malId) {
    quickUpdate(malId, 1);
}

function decrementarEpisodio(malId) {
    quickUpdate(malId, -1);
}

function concluirAnimeRapido(malId) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        const anime = catalogoPessoal[malId];

        if (anime.status === 'Concluído') {
            showToast('Este anime já está marcado como concluído! 😎', 'info');
            return;
        }

        const statusAnterior = anime.status; 
        
        if (anime.maxEpisodes) {
            anime.episode = anime.maxEpisodes;
        }
        anime.status = 'Concluído';
        
        salvarCatalogo(); 
        
        const statusMudou = (statusAnterior !== 'Concluído');
        atualizarElementosDoCard(malId, anime, statusMudou);

        showToast('Anime marcado como Concluído! 🎉', 'success');
        fecharModal();
    }
}

function toggleFavorite(malId) {
    if (catalogoPessoal.hasOwnProperty(malId)) {
        catalogoPessoal[malId].favorite = !catalogoPessoal[malId].favorite;
        const isFavorite = catalogoPessoal[malId].favorite;
        salvarCatalogo();

        const card = getCardAnime(malId);
        if (!card) return;

        const btn = card.querySelector('.btn-favorite');
        if (btn) {
            btn.classList.toggle('active', isFavorite);
            btn.title = isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
        }

        let badge = card.querySelector('.favorite-badge');
        
        if (isFavorite && !badge) {
            card.insertAdjacentHTML('afterbegin', '<div class="favorite-badge" title="Favorito">⭐</div>');
            const novoBadge = card.querySelector('.favorite-badge');
            if (novoBadge) {
                novoBadge.classList.add('animar-entrada');
            }
        
        } else if (!isFavorite && badge) {
            badge.classList.remove('animar-entrada');
            badge.classList.add('badge-saindo');
            
            setTimeout(() => {
                if (badge.parentNode) badge.remove();
            }, 300);
        }

        const deveSair = DOM.filtros.status?.value === 'favoritos' && !isFavorite;
        if (deveSair) {
            card.classList.add('card-animacao-saida');

            setTimeout(() => {
                card.classList.add('oculto');
                card.classList.remove('card-animacao-saida');
            }, 300);
        }

        showToast(
            isFavorite ? '⭐ Adicionado aos favoritos!' : '❌ Removido dos favoritos',
            isFavorite ? 'fav-add' : 'fav-remove'
        );
    }
}