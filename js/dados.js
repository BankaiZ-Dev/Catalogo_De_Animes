// ========================================================
// Responsável por: Constantes, Configurações e Mapas
// ========================================================

// 1. CONFIGURAÇÕES GLOBAIS
const CONFIG = {
    PLACEHOLDER_IMAGE: "https://placehold.co/170x260?text=Sem+Poster",
    JIKAN_API_URL: 'https://api.jikan.moe/v4/anime',
    ANIME_LIMIT_PER_PAGE: 9
};

const STORAGE_KEYS = {
    CATALOGO: 'meu_catalogo_animes_v2',
    DARK_MODE: 'dark_mode_ativado',
    VIEW_MODE: 'view_mode_preferido'
};

// 2. MAPAS DE TRADUÇÃO E LISTAS
const MAPA_GENEROS = {
    "Action": "Ação", "Adventure": "Aventura", "Avant Garde": "Vanguarda", "Award Winning": "Premiado",
    "Boys Love": "Boys Love (BL)", "Comedy": "Comédia", "Drama": "Drama", "Fantasy": "Fantasia",
    "Girls Love": "Girls Love (GL)", "Gourmet": "Gourmet", "Horror": "Terror", "Mystery": "Mistério",
    "Romance": "Romance", "Sci-Fi": "Ficção Científica", "Slice of Life": "Cotidiano", "Sports": "Esportes",
    "Supernatural": "Sobrenatural", "Suspense": "Suspense", "Ecchi": "Ecchi", "Erotica": "Erótico",
    "Hentai": "Hentai", "Adult Cast": "Elenco Adulto", "Anthropomorphic": "Antropomórfico", "CGDCT": "Garotas Fofas",
    "Childcare": "Cuidado Infantil", "Combat Sports": "Esportes de Combate", "Delinquents": "Delinquentes",
    "Detective": "Detetive", "Educational": "Educacional", "Gag Humor": "Humor Gag", "Gore": "Gore",
    "Harem": "Harém", "High Stakes Game": "Jogos de Apostas", "Historical": "Histórico",
    "Idols (Female)": "Idols (Feminino)", "Idols (Male)": "Idols (Masculino)", "Isekai": "Isekai",
    "Iyashikei": "Iyashikei", "Love Polygon": "Triângulo Amoroso", "Magical Sex Shift": "Mudança de Sexo",
    "Mahou Shoujo": "Garota Mágica", "Martial Arts": "Artes Marciais", "Mecha": "Mecha", "Medical": "Médico",
    "Military": "Militar", "Music": "Música", "Mythology": "Mitologia", "Organized Crime": "Crime Organizado",
    "Otaku Culture": "Cultura Otaku", "Parody": "Paródia", "Performing Arts": "Artes Performáticas",
    "Pets": "Pets", "Psychological": "Psicológico", "Racing": "Corrida", "Reincarnation": "Reencarnação",
    "Reverse Harem": "Harém Reverso", "Romantic Subtext": "Subtexto Romântico", "Samurai": "Samurai",
    "School": "Escolar", "Showbiz": "Showbiz", "Space": "Espaço", "Strategy Game": "Jogos de Estratégia",
    "Super Power": "Super Poderes", "Survival": "Sobrevivência", "Team Sports": "Esportes de Equipe",
    "Time Travel": "Viagem no Tempo", "Vampire": "Vampiros", "Video Game": "Games", "Visual Arts": "Artes Visuais",
    "Workplace": "Trabalho", "Josei": "Josei", "Kids": "Infantil", "Seinen": "Seinen", "Shoujo": "Shoujo",
    "Shounen": "Shounen"
};

const MAPA_TIPOS_MIDIA = {
    "TV": "Série (TV)", "Movie": "Filme", "OVA": "OVA", "Special": "Especial",
    "ONA": "Web (ONA)", "Music": "Musical", "Unknown": "Desconhecido", "TV Special": "Especial de TV"
};

const PLATAFORMAS_STREAMING = {
    crunchyroll: {
        nome: 'Crunchyroll',
        baseUrl: 'https://www.crunchyroll.com/search?q=',
        icon: 'https://www.google.com/s2/favicons?domain=crunchyroll.com&sz=128',
        cor: '#f47521'
    },
    netflix: {
        nome: 'Netflix',
        baseUrl: 'https://www.netflix.com/search?q=',
        icon: 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128',
        cor: '#e50914'
    },
    prime: {
        nome: 'Prime Video',
        baseUrl: 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
        icon: 'https://www.google.com/s2/favicons?domain=primevideo.com&sz=128',
        cor: '#00a8e1'
    },
    hbomax: {
        nome: 'HBO Max',
        baseUrl: 'https://max.com/search?q=',
        icon: 'https://www.google.com/s2/favicons?domain=max.com&sz=128',
        cor: '#000000ff'
    },
    disney: {
        nome: 'Disney+',
        baseUrl: 'https://www.disneyplus.com/search?q=',
        icon: 'https://www.google.com/s2/favicons?domain=disneyplus.com&sz=128',
        cor: '#113dcfcc'
    },
};