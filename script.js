/**
 * Buscador Universal - Vanilla JS
 * Com scroll infinito e layout masonry
 */

document.addEventListener('DOMContentLoaded', () => {
  initYear();
  initSearchApp();
});

/* ==========================================
   STATE & DOM ELEMENTS
   ========================================== */
const state = {
  currentTab: 'images',
  query: '',
  isLoading: false,
  currentPage: 1,
  hasMore: true,
  isLoadingMore: false
};

function getDom() {
  return {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    btnText: document.querySelector('.btn-text'),
    loader: document.querySelector('.loader'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    resultsContainer: document.getElementById('resultsContainer')
  };
}

function initSearchApp() {
  const dom = getDom();

  // Tabs Events
  dom.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dom.tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentTab = btn.dataset.tab;

      if (dom.searchInput.value.trim().length >= 2) {
        resetAndSearch();
      } else {
        renderEmptyState();
      }
    });
  });

  // Search Events
  dom.searchBtn.addEventListener('click', resetAndSearch);

  dom.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      resetAndSearch();
    }
  });

  // Infinite Scroll com IntersectionObserver
  setupInfiniteScroll();
}

/* ==========================================
   INFINITE SCROLL
   ========================================== */

let scrollObserver = null;
let sentinelEl = null;

function setupInfiniteScroll() {
  scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !state.isLoadingMore && state.hasMore && state.query) {
        loadMoreResults();
      }
    });
  }, {
    rootMargin: '400px' // comeca a carregar 400px antes de chegar ao fim
  });
}

function addScrollSentinel() {
  // Remove sentinela anterior
  if (sentinelEl) sentinelEl.remove();

  const dom = getDom();
  sentinelEl = document.createElement('div');
  sentinelEl.id = 'scrollSentinel';
  sentinelEl.className = 'scroll-sentinel';
  dom.resultsContainer.appendChild(sentinelEl);

  scrollObserver.observe(sentinelEl);
}

function removeScrollSentinel() {
  if (sentinelEl) {
    scrollObserver.unobserve(sentinelEl);
    sentinelEl.remove();
    sentinelEl = null;
  }
}

/* ==========================================
   LOADING STATES
   ========================================== */

function setLoading(isLoading) {
  const dom = getDom();
  state.isLoading = isLoading;
  dom.searchBtn.disabled = isLoading;

  if (isLoading) {
    dom.btnText.classList.add('hidden');
    dom.loader.classList.remove('hidden');
  } else {
    dom.btnText.classList.remove('hidden');
    dom.loader.classList.add('hidden');
  }
}

function showInitialLoader() {
  const dom = getDom();
  dom.resultsContainer.innerHTML = `
    <div class="empty-state">
      <div class="loader" style="border-color: var(--color-primary); border-bottom-color: transparent; width: 40px; height: 40px;"></div>
      <p>Buscando resultados...</p>
    </div>
  `;
}

function showLoadingMore() {
  const dom = getDom();
  // Adicionar loader no final da grid
  const loaderDiv = document.createElement('div');
  loaderDiv.id = 'loadMoreIndicator';
  loaderDiv.className = 'load-more-indicator';
  loaderDiv.innerHTML = `
    <div class="loader" style="border-color: var(--color-primary); border-bottom-color: transparent; width: 32px; height: 32px;"></div>
    <span>Carregando mais...</span>
  `;
  dom.resultsContainer.appendChild(loaderDiv);
}

function hideLoadingMore() {
  const indicator = document.getElementById('loadMoreIndicator');
  if (indicator) indicator.remove();
}

function renderEmptyState() {
  const dom = getDom();
  dom.resultsContainer.innerHTML = `
    <div class="empty-state">
      <p>Digite um termo acima e clique em buscar.</p>
    </div>
  `;
}

function renderError(msg) {
  const dom = getDom();
  dom.resultsContainer.innerHTML = `
    <div class="empty-state" style="color: var(--color-error);">
      <p>${msg}</p>
    </div>
  `;
}

/* ==========================================
   SEARCH LOGIC
   ========================================== */

function resetAndSearch() {
  const dom = getDom();
  const query = dom.searchInput.value.trim();
  if (query.length < 2) return;

  state.query = query;
  state.currentPage = 1;
  state.hasMore = true;

  removeScrollSentinel();
  performSearch(true); // true = primeira busca (limpar tudo)
}

async function performSearch(isFirstLoad) {
  const dom = getDom();

  if (isFirstLoad) {
    setLoading(true);
    showInitialLoader();
  }

  // Se for aba de referencias, renderiza o Launcher em vez de buscar via API
  if (state.currentTab === 'references') {
    setLoading(false);
    renderReferenceLauncher();
    return;
  }

  try {
    let endpoint = `/api/search-stock?q=${encodeURIComponent(state.query)}&page=${state.currentPage}`;

    const res = await fetch(endpoint);

    if (!res.ok) {
      throw new Error(`Status: ${res.status}`);
    }

    const data = await res.json();

    // Verificar chaves ausentes
    if (data.error === 'missing_keys') {
      dom.resultsContainer.innerHTML = `
        <div class="empty-state">
          <p style="font-weight:600; color: var(--color-text);">Chaves de API nao configuradas</p>
          <p>${data.message}</p>
          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem; font-size:0.9rem; align-items:center;">
            <a href="https://unsplash.com/developers" target="_blank" rel="noopener" class="card-btn btn-outline" style="max-width:300px;">Registrar chave Unsplash</a>
            <a href="https://www.pexels.com/api/" target="_blank" rel="noopener" class="card-btn btn-outline" style="max-width:300px;">Registrar chave Pexels</a>
            <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener" class="card-btn btn-outline" style="max-width:300px;">Registrar chave Pixabay</a>
          </div>
        </div>
      `;
      return;
    }

    if (!data.items || data.items.length === 0) {
      if (isFirstLoad) {
        dom.resultsContainer.innerHTML = `
          <div class="empty-state">
            <p>Nenhum resultado encontrado para "${state.query}".</p>
          </div>
        `;
      }
      state.hasMore = false;
      return;
    }

    // Atualizar hasMore
    if (data.hasMore !== undefined) {
      state.hasMore = data.hasMore;
    }

    // Renderizar cards
    const htmlCards = state.currentTab === 'images'
      ? renderImageCards(data.items)
      : renderReferenceCards(data.items);

    if (isFirstLoad) {
      // Primeira busca: substituir conteudo inteiro
      dom.resultsContainer.innerHTML = `<div class="results-grid masonry" id="resultsGrid">${htmlCards}</div>`;
    } else {
      // Carregar mais: inserir no grid existente
      const grid = document.getElementById('resultsGrid');
      if (grid) {
        grid.insertAdjacentHTML('beforeend', htmlCards);
      }
    }

    // Adicionar sentinela para scroll infinito (para ambas as tabs suportamos)
    if (state.hasMore && state.currentPage <= 5) { // Limitando paginas maximas pra nao quebrar chaves auth do scraper
      addScrollSentinel();
    } else {
      state.hasMore = false; // Parar de pedir
    }

  } catch (error) {
    console.error("Search Error:", error);
    if (isFirstLoad) {
      renderError("Ocorreu um erro ao buscar. Tente novamente.");
    }
  } finally {
    if (isFirstLoad) {
      setLoading(false);
    }
  }
}

async function loadMoreResults() {
  if (state.isLoadingMore || !state.hasMore) return;

  state.isLoadingMore = true;
  state.currentPage++;

  removeScrollSentinel();
  showLoadingMore();

  try {
    let endpoint;
    if (state.currentTab === 'images') {
      endpoint = `/api/search-stock?q=${encodeURIComponent(state.query)}&page=${state.currentPage}`;
    } else {
      endpoint = `/api/search-references?q=${encodeURIComponent(state.query)}&page=${state.currentPage}`;
    }
    const res = await fetch(endpoint);

    if (!res.ok) throw new Error(`Status: ${res.status}`);

    const data = await res.json();

    hideLoadingMore();

    if (!data.items || data.items.length === 0) {
      state.hasMore = false;
      return;
    }

    if (data.hasMore !== undefined) {
      state.hasMore = data.hasMore;
    }

    const htmlCards = state.currentTab === 'images'
      ? renderImageCards(data.items)
      : renderReferenceCards(data.items);

    const grid = document.getElementById('resultsGrid');
    if (grid) {
      grid.insertAdjacentHTML('beforeend', htmlCards);
    }

    // Re-adicionar sentinela se tem mais e não atingir max pages
    if (state.hasMore && state.currentPage <= 5) {
      addScrollSentinel();
    } else {
      state.hasMore = false;
    }

  } catch (error) {
    console.error("LoadMore Error:", error);
    hideLoadingMore();
    state.currentPage--; // Volta a pagina porque falhou
  } finally {
    state.isLoadingMore = false;
  }
}

/* ==========================================
   RENDER CARDS
   ========================================== */

// Card de Imagem
function renderImageCards(items) {
  return items.map(item => `
    <article class="card">
      <div class="card-image-wrap">
        <div class="card-badge">${item.provider}</div>
        <img src="${item.thumbUrl}" alt="Foto por ${item.authorName || 'Desconhecido'}" loading="lazy" />
        <div class="card-info">
          <div class="card-author">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>${item.authorName || 'Desconhecido'}</span>
          </div>
          <div class="card-actions">
            ${item.fullUrl ? `<a href="${item.fullUrl}" target="_blank" rel="noopener noreferrer" class="card-btn btn-primary">Download</a>` : ''}
            <a href="${item.pageUrl}" target="_blank" rel="noopener noreferrer" class="card-btn btn-outline">Fonte</a>
          </div>
        </div>
      </div>
    </article>
  `).join('');
}

// Card de Referencia (NAO USADO MAIS PELO FLOW PRINCIPAL, MAS MANTIDO PARA COMPATIBILIDADE)
function renderReferenceCards(items) {
  return items.map(item => {
    const imageArea = item.ogImage
      ? `<img src="${item.ogImage}" alt="${item.ogTitle || 'Preview'}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=ref-placeholder>Sem previa</div>'" />`
      : `<div class="ref-placeholder">Sem previa visual</div>`;

    const title = item.ogTitle || `Busca no ${item.provider}`;

    return `
      <article class="card">
        <div class="card-image-wrap">
          <div class="card-badge">${item.provider}</div>
          ${imageArea}
          <div class="card-info">
            <h3 class="card-ref-title" title="${title}">${title}</h3>
            <div class="card-actions">
              <a href="${item.pageUrl}" target="_blank" rel="noopener noreferrer" class="card-btn btn-primary">Abrir</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Renderiza o Lançador Multi-Busca
function renderReferenceLauncher() {
  const dom = getDom();
  const query = state.query;
  const encoded = encodeURIComponent(query);

  const platforms = [
    { name: 'Pinterest', icon: 'P', class: 'p-pinterest', url: `https://br.pinterest.com/search/pins/?q=${encoded}` },
    { name: 'Behance', icon: 'B', class: 'p-behance', url: `https://www.behance.net/search/projects?search=${encoded}` },
    { name: 'Dribbble', icon: 'D', class: 'p-dribbble', url: `https://dribbble.com/search/shots/popular?q=${encoded}` },
    { name: 'Freepik', icon: 'F', class: 'p-freepik', url: `https://www.freepik.com/search?query=${encoded}` },
    { name: 'Designi', icon: 'Di', class: 'p-designi', url: `https://www.designi.com.br/busca?t=${encoded}` },
    { name: 'DesignBR', icon: 'DB', class: 'p-designbr', url: `https://designbr.com.br/pesquisa?s=${encoded}&descricao=${encoded}&page=1` },
    { name: 'Google Images', icon: 'G', class: 'p-google', url: `https://www.google.com/search?tbm=isch&q=${encoded}` }
  ];

  const platformsHtml = platforms.map(p => `
    <div class="platform-card" onclick="window.open('${p.url}', '_blank')">
      <div class="platform-icon ${p.class}">${p.icon}</div>
      <span class="platform-name">${p.name}</span>
    </div>
  `).join('');

  dom.resultsContainer.innerHTML = `
    <div class="launcher-container">
      <div class="launcher-header">
        <h2 class="launcher-title">Lançador Criativo</h2>
        <p class="launcher-desc">Busca simultânea para "${query}" em todas as plataformas</p>
      </div>
      
      <button class="btn-launch-all" onclick="launchAllSearch()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        Abrir Todas as Abas
      </button>

      <div class="platforms-grid">
        ${platformsHtml}
      </div>
    </div>
  `;
}

// Abre todas as plataformas de uma vez
window.launchAllSearch = function () {
  const query = state.query;
  const encoded = encodeURIComponent(query);

  const urls = [
    `https://br.pinterest.com/search/pins/?q=${encoded}`,
    `https://www.behance.net/search/projects?search=${encoded}`,
    `https://dribbble.com/search/shots/popular?q=${encoded}`,
    `https://www.freepik.com/search?query=${encoded}`,
    `https://www.designi.com.br/busca?t=${encoded}`,
    `https://designbr.com.br/pesquisa?s=${encoded}&descricao=${encoded}&page=1`,
    `https://www.google.com/search?tbm=isch&q=${encoded}`
  ];

  // Abertura com delay para evitar bloqueio de popup agressivo
  urls.forEach((url, index) => {
    setTimeout(() => {
      window.open(url, '_blank');
    }, index * 300);
  });
};


/* ==========================================
   UTILS
   ========================================== */
function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}
