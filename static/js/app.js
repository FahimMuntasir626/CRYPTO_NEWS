/* ===========================
   CryptoRadar — Frontend App
   =========================== */

const API = {
    market: '/api/market',
    news: '/api/news',
    geo: '/api/news/geo',
    trending: '/api/trending',
    global: '/api/global',
    movers: '/api/movers'
};

let allNewsData = [];
let currentSource = 'all';
let refreshInterval = null;

// --- Utility Functions ---

function formatPrice(price) {
    if (price === null || price === undefined) return '$0.00';
    if (price >= 1000) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return '$' + price.toFixed(2);
    if (price >= 0.01) return '$' + price.toFixed(4);
    return '$' + price.toFixed(6);
}

function formatLargeNumber(num) {
    if (!num) return '—';
    if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    return '$' + num.toLocaleString();
}

function formatChange(change) {
    if (change === null || change === undefined) return { text: '0.00%', class: '' };
    const sign = change >= 0 ? '+' : '';
    return {
        text: sign + change.toFixed(2) + '%',
        class: change >= 0 ? 'up' : 'down'
    };
}

// --- Market Ticker ---

async function loadTicker() {
    try {
        const resp = await fetch(API.market);
        const coins = await resp.json();
        if (!coins || !coins.length) return;
        
        const track = document.getElementById('ticker-track');
        
        // Create ticker items (doubled for seamless loop)
        const items = coins.slice(0, 25);
        let html = '';
        
        // Double the items for seamless scrolling
        for (let i = 0; i < 2; i++) {
            items.forEach(coin => {
                const change = formatChange(coin.change_24h);
                html += `
                    <div class="ticker-item">
                        <img src="${coin.image}" alt="${coin.symbol}" loading="lazy" onerror="this.style.display='none'">
                        <span class="ticker-symbol">${coin.symbol}</span>
                        <span class="ticker-price">${formatPrice(coin.price)}</span>
                        <span class="ticker-change ${change.class}">${change.text}</span>
                    </div>
                `;
            });
        }
        
        track.innerHTML = html;
    } catch (err) {
        console.error('Ticker error:', err);
    }
}

// --- Global Stats ---

async function loadGlobalStats() {
    try {
        const resp = await fetch(API.global);
        const data = await resp.json();
        
        if (data.total_market_cap) {
            document.getElementById('stat-mcap').textContent = formatLargeNumber(data.total_market_cap);
        }
        if (data.total_volume) {
            document.getElementById('stat-volume').textContent = formatLargeNumber(data.total_volume);
        }
        if (data.btc_dominance) {
            document.getElementById('stat-btc-dom').textContent = data.btc_dominance.toFixed(1) + '%';
        }
        if (data.eth_dominance) {
            document.getElementById('stat-eth-dom').textContent = data.eth_dominance.toFixed(1) + '%';
        }
        if (data.active_cryptos) {
            document.getElementById('stat-active').textContent = data.active_cryptos.toLocaleString();
        }
        
        // Market cap change
        const mcapChange = document.getElementById('stat-mcap-change');
        if (data.market_cap_change_24h !== undefined) {
            const change = formatChange(data.market_cap_change_24h);
            mcapChange.textContent = change.text;
            mcapChange.className = 'stat-change ' + change.class;
        }
    } catch (err) {
        console.error('Global stats error:', err);
    }
}

// --- Market Movers ---

async function loadMovers() {
    try {
        const resp = await fetch(API.movers);
        const data = await resp.json();
        
        renderMoverList('gainers-list', data.gainers || [], true);
        renderMoverList('losers-list', data.losers || [], false);
    } catch (err) {
        console.error('Movers error:', err);
    }
}

function renderMoverList(containerId, coins, isGainer) {
    const container = document.getElementById(containerId);
    if (!coins.length) {
        container.innerHTML = '<div class="no-data"><div class="no-data-icon">📊</div><div class="no-data-text">Loading market data...</div></div>';
        return;
    }
    
    container.innerHTML = coins.map((coin, i) => {
        const change = formatChange(coin.change_24h);
        return `
            <div class="mover-item">
                <span class="mover-rank">#${i + 1}</span>
                <img class="mover-icon" src="${coin.image}" alt="${coin.symbol}" loading="lazy" onerror="this.style.display='none'">
                <div class="mover-info">
                    <div class="mover-name">${coin.name}</div>
                    <div class="mover-symbol">${coin.symbol}</div>
                </div>
                <div class="mover-data">
                    <div class="mover-price">${formatPrice(coin.price)}</div>
                    <div class="mover-change ${change.class}">${change.text}</div>
                </div>
            </div>
        `;
    }).join('');
}

// --- News Feed ---

async function loadNews() {
    try {
        const resp = await fetch(API.news);
        allNewsData = await resp.json();
        renderNews(allNewsData);
    } catch (err) {
        console.error('News error:', err);
        document.getElementById('news-grid').innerHTML = '<div class="no-data"><div class="no-data-icon">📰</div><div class="no-data-text">Unable to load news. Retrying...</div></div>';
    }
}

function renderNews(articles) {
    const grid = document.getElementById('news-grid');
    
    let filtered = articles;
    if (currentSource !== 'all') {
        filtered = articles.filter(a => a.source === currentSource);
    }
    
    if (!filtered.length) {
        grid.innerHTML = '<div class="no-data"><div class="no-data-icon">📭</div><div class="no-data-text">No news found for this source.</div></div>';
        return;
    }
    
    grid.innerHTML = filtered.slice(0, 18).map(article => {
        const geoTag = article.is_geo ? '<div class="news-card-geo-tag">🌍 Market Impact</div>' : '';
        const imageHtml = article.image ? `<img class="news-card-image" src="${article.image}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
        
        return `
            <a class="news-card" href="${article.link}" target="_blank" rel="noopener noreferrer">
                ${imageHtml}
                <div class="news-card-body">
                    <div class="news-card-meta">
                        <span class="news-source-tag">${article.source_icon} ${article.source}</span>
                        <span class="news-time">${article.time_ago}</span>
                    </div>
                    <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                    <p class="news-card-summary">${escapeHtml(article.summary)}</p>
                    ${geoTag}
                </div>
            </a>
        `;
    }).join('');
}

// --- Geopolitical News ---

async function loadGeoNews() {
    try {
        const resp = await fetch(API.geo);
        const articles = await resp.json();
        const grid = document.getElementById('geo-grid');
        
        if (!articles.length) {
            grid.innerHTML = '<div class="no-data"><div class="no-data-icon">🌍</div><div class="no-data-text">No geopolitical news detected right now.</div></div>';
            return;
        }
        
        grid.innerHTML = articles.slice(0, 8).map(article => `
            <a class="geo-card" href="${article.link}" target="_blank" rel="noopener noreferrer" style="animation-delay: ${Math.random() * 0.3}s">
                <div class="news-card-meta">
                    <span class="news-source-tag">${article.source_icon} ${article.source}</span>
                    <span class="news-time">${article.time_ago}</span>
                </div>
                <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
                <p class="news-card-summary">${escapeHtml(article.summary)}</p>
                <div class="news-card-geo-tag">🌍 Geopolitical Impact</div>
            </a>
        `).join('');
    } catch (err) {
        console.error('Geo news error:', err);
    }
}

// --- Trending Coins ---

async function loadTrending() {
    try {
        const resp = await fetch(API.trending);
        const coins = await resp.json();
        const grid = document.getElementById('trending-grid');
        
        if (!coins.length) {
            grid.innerHTML = '<div class="no-data"><div class="no-data-icon">🚀</div><div class="no-data-text">Loading trending coins...</div></div>';
            return;
        }
        
        grid.innerHTML = coins.map((coin, i) => `
            <div class="trending-card" style="animation-delay: ${i * 0.05}s">
                <span class="trending-rank">${i + 1}</span>
                <img class="trending-icon" src="${coin.thumb}" alt="${coin.symbol}" loading="lazy" onerror="this.style.display='none'">
                <div class="trending-info">
                    <div class="trending-name">${escapeHtml(coin.name)}</div>
                    <div class="trending-symbol">${coin.symbol}</div>
                    ${coin.market_cap_rank ? `<div class="trending-mcap-rank">MCap #${coin.market_cap_rank}</div>` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Trending error:', err);
    }
}

// --- HTML Escape ---

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Source Filter ---

function initSourceFilters() {
    const buttons = document.querySelectorAll('.source-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSource = btn.dataset.source;
            renderNews(allNewsData);
        });
    });
}

// --- Nav Section Filter ---

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = {
        all: ['movers-section', 'news-section', 'geo-section', 'trending-section'],
        breaking: ['news-section'],
        geo: ['geo-section'],
        movers: ['movers-section'],
        trending: ['trending-section']
    };
    
    const allSections = ['movers-section', 'news-section', 'geo-section', 'trending-section'];
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const sectionKey = btn.dataset.section;
            const visibleSections = sections[sectionKey] || allSections;
            
            allSections.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (visibleSections.includes(id)) {
                        el.style.display = '';
                        el.style.animation = 'fadeInUp 0.4s ease forwards';
                    } else {
                        el.style.display = 'none';
                    }
                }
            });
        });
    });
}

// --- Refresh ---

function initRefresh() {
    const btn = document.getElementById('refresh-btn');
    btn.addEventListener('click', () => {
        btn.classList.add('spinning');
        refreshAll();
        setTimeout(() => btn.classList.remove('spinning'), 800);
    });
}

function updateTimestamp() {
    const el = document.getElementById('last-update');
    const now = new Date();
    el.textContent = 'Updated ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// --- Load All Data ---

async function refreshAll() {
    updateTimestamp();
    
    // Fire all requests in parallel
    await Promise.allSettled([
        loadTicker(),
        loadGlobalStats(),
        loadMovers(),
        loadNews(),
        loadGeoNews(),
        loadTrending()
    ]);
}

// --- Init ---

document.addEventListener('DOMContentLoaded', () => {
    initSourceFilters();
    initNavigation();
    initRefresh();
    
    // Initial load
    refreshAll();
    
    // Auto-refresh every 60 seconds
    refreshInterval = setInterval(refreshAll, 60000);
});
