# 📡 CryptoRadar — Live Crypto News & Market Intelligence

A real-time crypto news dashboard that aggregates breaking news, market data, geopolitical events, and trending coins — all in one beautiful dark-themed interface.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=flat-square&logo=flask&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=white)

---

## ⚡ Features

| Feature | Description |
|---------|-------------|
| 📈 **Live Market Ticker** | Scrolling top 25 crypto prices with 24h change (CoinGecko) |
| 📊 **Market Movers** | Top 5 gainers & losers updated in real-time |
| 📰 **Breaking News** | Latest headlines from The Block, DL News, CoinDesk & CoinTelegraph |
| 🌍 **Geopolitical Impact** | Auto-filtered news on wars, sanctions, Trump, regulations & more |
| 🚀 **Trending Coins** | Hot trending coins from CoinGecko |
| 📊 **Global Stats** | Total market cap, 24h volume, BTC/ETH dominance |
| 🔄 **Auto-Refresh** | Data updates every 60 seconds |
| 🎨 **Dark Cyberpunk UI** | Glassmorphism, neon gradients, smooth animations |

## 📰 News Sources

- **[The Block](https://www.theblock.co)** — Institutional-grade crypto journalism
- **[DL News](https://www.dlnews.com)** — Decentralized finance & Web3 coverage
- **[CoinDesk](https://www.coindesk.com)** — Industry-leading crypto news
- **[CoinTelegraph](https://cointelegraph.com)** — Breaking crypto & blockchain news
- **[CoinGecko](https://www.coingecko.com)** — Market data, prices & trending coins

## 🌍 Geopolitical Tracking

CryptoRadar automatically detects and highlights news related to:

- 🇺🇸 Trump executive orders, SEC regulations, Fed interest rates
- 🇮🇷🇮🇱 Iran-Israel conflict, Middle East tensions
- 🇷🇺🇺🇦 Russia-Ukraine war, sanctions
- 🇨🇳 China crypto bans, trade wars
- 🔒 Major hacks, exploits & vulnerabilities (e.g., Zcash/ZEC bugs)
- 📜 Global regulatory changes

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- pip

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/cryptoradar.git
cd cryptoradar

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py

# 4. Open in browser
# → http://127.0.0.1:5000
```

---

## 🌐 Deploy to Render

### Option 1: Blueprint (Recommended)

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo
5. Render auto-detects `render.yaml` and deploys ✅

### Option 2: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Runtime:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120`
5. Click **Deploy** 🚀

---

## 📁 Project Structure

```
cryptoradar/
├── app.py                  # Flask backend + API routes
├── requirements.txt        # Python dependencies
├── render.yaml             # Render deployment blueprint
├── Procfile                # Production server config
├── .gitignore              # Git ignore rules
├── README.md               # This file
├── templates/
│   └── index.html          # Main dashboard page
└── static/
    ├── css/
    │   └── style.css       # Dark cyberpunk theme
    └── js/
        └── app.js          # Frontend logic & API calls
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python Flask 3.1 |
| **Frontend** | HTML5, Vanilla CSS, JavaScript |
| **Market Data** | CoinGecko API (free, no key required) |
| **News Feeds** | RSS — The Block, DL News, CoinDesk, CoinTelegraph |
| **Caching** | cachetools (2-5 min TTL) |
| **Production** | Gunicorn WSGI server |
| **Deployment** | Render |

## ⚙️ API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Main dashboard page |
| `GET /api/market` | Top 50 coins by market cap |
| `GET /api/trending` | Trending coins on CoinGecko |
| `GET /api/news` | All crypto news (40 latest) |
| `GET /api/news/geo` | Geopolitical-filtered news |
| `GET /api/global` | Global market stats |
| `GET /api/movers` | Top gainers & losers |

## 📊 Rate Limits & Caching

The app uses server-side caching to respect free API limits:

| Data | Cache TTL | Source Limit |
|------|-----------|-------------|
| Market prices | 2 min | CoinGecko: ~30 req/min |
| News feeds | 5 min | RSS: No hard limit |
| Trending coins | 3 min | CoinGecko: ~30 req/min |

---

## 📄 License

MIT License — free for personal and commercial use.

## 🤝 Contributing

Pull requests welcome! For major changes, open an issue first to discuss.

---

<p align="center">
  Built with ❤️ by CryptoRadar · Not financial advice · DYOR
</p>
