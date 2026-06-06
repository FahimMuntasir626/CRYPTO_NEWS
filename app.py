import os
import re
import time
import hashlib
import requests
import feedparser
from datetime import datetime, timezone
from flask import Flask, render_template, jsonify
from cachetools import TTLCache
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# --- Caching ---
market_cache = TTLCache(maxsize=10, ttl=120)      # 2 min
news_cache = TTLCache(maxsize=20, ttl=300)         # 5 min
trending_cache = TTLCache(maxsize=10, ttl=180)     # 3 min

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINGECKO_API_KEY = os.environ.get("COINGECKO_API_KEY", "CG-VmRbyMAeoiRnYrE7FUM57ADm")

# --- RSS Feed URLs ---
RSS_FEEDS = {
    "theblock": {
        "url": "https://www.theblock.co/rss.xml",
        "name": "The Block",
        "icon": "📦"
    },
    "dlnews": {
        "url": "https://www.dlnews.com/arc/outboundfeeds/rss/",
        "name": "DL News",
        "icon": "📰"
    },
    "coindesk": {
        "url": "https://www.coindesk.com/arc/outboundfeeds/rss/",
        "name": "CoinDesk",
        "icon": "🪙"
    },
    "cointelegraph": {
        "url": "https://cointelegraph.com/rss",
        "name": "CoinTelegraph",
        "icon": "⚡"
    }
}

# Geopolitical / macro keywords for filtering
GEO_KEYWORDS = [
    "war", "iran", "israel", "trump", "tariff", "sanctions", "military",
    "geopolitical", "conflict", "fed", "interest rate", "inflation",
    "regulation", "sec", "congress", "biden", "putin", "china", "russia",
    "nuclear", "missile", "attack", "ceasefire", "peace", "nato",
    "executive order", "ban", "election", "vote", "lawsuit", "hack",
    "exploit", "bug", "vulnerability", "breach", "zcash", "zec"
]

# --- Helper Functions ---

def time_ago(dt_str):
    """Convert datetime string to relative time."""
    try:
        if hasattr(dt_str, 'tm_year'):
            dt = datetime(*dt_str[:6], tzinfo=timezone.utc)
        else:
            dt = datetime.fromisoformat(str(dt_str).replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        diff = now - dt
        seconds = int(diff.total_seconds())
        if seconds < 60:
            return "just now"
        elif seconds < 3600:
            mins = seconds // 60
            return f"{mins}m ago"
        elif seconds < 86400:
            hrs = seconds // 3600
            return f"{hrs}h ago"
        else:
            days = seconds // 86400
            return f"{days}d ago"
    except Exception:
        return "recently"


def fetch_rss_feed(feed_key, feed_info):
    """Fetch and parse an RSS feed."""
    cache_key = f"rss_{feed_key}"
    if cache_key in news_cache:
        return news_cache[cache_key]
    
    try:
        # Add User-Agent to prevent RSS feeds from blocking requests
        if hasattr(feedparser, 'USER_AGENT'):
            feedparser.USER_AGENT = "CryptoRadar/1.0 +https://cryptoradar.onrender.com"
        feed = feedparser.parse(feed_info["url"])
        articles = []
        for entry in feed.entries[:15]:
            # Get published time
            published = getattr(entry, 'published_parsed', None) or getattr(entry, 'updated_parsed', None)
            pub_str = ""
            if published:
                pub_str = time_ago(published)
            
            # Get summary/description
            summary = getattr(entry, 'summary', '') or getattr(entry, 'description', '')
            # Strip HTML tags
            summary = re.sub(r'<[^>]+>', '', summary)
            if len(summary) > 200:
                summary = summary[:200] + "..."
            
            # Get image
            image = ""
            if hasattr(entry, 'media_content') and entry.media_content:
                image = entry.media_content[0].get('url', '')
            elif hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
                image = entry.media_thumbnail[0].get('url', '')
            elif hasattr(entry, 'enclosures') and entry.enclosures:
                for enc in entry.enclosures:
                    if 'image' in enc.get('type', ''):
                        image = enc.get('href', '')
                        break
            
            # Check if geopolitical
            title_lower = entry.title.lower()
            summary_lower = summary.lower()
            is_geo = any(kw in title_lower or kw in summary_lower for kw in GEO_KEYWORDS)
            
            # Generate unique ID
            article_id = hashlib.md5(entry.link.encode()).hexdigest()[:8]
            
            # Convert time.struct_time to timestamp for JSON serialization
            pub_timestamp = 0
            if published:
                try:
                    pub_timestamp = time.mktime(published)
                except Exception:
                    pub_timestamp = 0
            
            articles.append({
                "id": article_id,
                "title": entry.title,
                "link": entry.link,
                "summary": summary,
                "image": image,
                "source": feed_info["name"],
                "source_icon": feed_info["icon"],
                "time_ago": pub_str,
                "is_geo": is_geo,
                "pub_timestamp": pub_timestamp
            })
        
        news_cache[cache_key] = articles
        return articles
    except Exception as e:
        print(f"Error fetching {feed_key}: {e}")
        return []


def get_all_news():
    """Fetch news from all RSS sources."""
    all_articles = []
    for key, info in RSS_FEEDS.items():
        articles = fetch_rss_feed(key, info)
        all_articles.extend(articles)
    
    # Sort by time (most recent first)
    all_articles.sort(key=lambda a: a.get('pub_timestamp', 0), reverse=True)
    return all_articles


# --- Routes ---

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/market")
def api_market():
    """Get top cryptocurrency market data from CoinGecko."""
    cache_key = "market_data"
    if cache_key in market_cache:
        return jsonify(market_cache[cache_key])
    
    try:
        url = f"{COINGECKO_BASE}/coins/markets"
        params = {
            "vs_currency": "usd",
            "order": "market_cap_desc",
            "per_page": 50,
            "page": 1,
            "sparkline": True,
            "price_change_percentage": "1h,24h,7d"
        }
        headers = {"accept": "application/json", "x-cg-demo-api-key": COINGECKO_API_KEY}
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        coins = []
        for coin in data:
            coins.append({
                "id": coin.get("id", ""),
                "symbol": coin.get("symbol", "").upper(),
                "name": coin.get("name", ""),
                "image": coin.get("image", ""),
                "price": coin.get("current_price", 0),
                "change_1h": coin.get("price_change_percentage_1h_in_currency", 0),
                "change_24h": coin.get("price_change_percentage_24h_in_currency", 0),
                "change_7d": coin.get("price_change_percentage_7d_in_currency", 0),
                "market_cap": coin.get("market_cap", 0),
                "volume": coin.get("total_volume", 0),
                "sparkline": coin.get("sparkline_in_7d", {}).get("price", []),
                "rank": coin.get("market_cap_rank", 0),
                "high_24h": coin.get("high_24h", 0),
                "low_24h": coin.get("low_24h", 0)
            })
        
        market_cache[cache_key] = coins
        return jsonify(coins)
    except Exception as e:
        print(f"Market API error: {e}")
        return jsonify([]), 500


@app.route("/api/trending")
def api_trending():
    """Get trending coins from CoinGecko."""
    cache_key = "trending"
    if cache_key in trending_cache:
        return jsonify(trending_cache[cache_key])
    
    try:
        url = f"{COINGECKO_BASE}/search/trending"
        headers = {"accept": "application/json", "x-cg-demo-api-key": COINGECKO_API_KEY}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        trending = []
        for item in data.get("coins", [])[:10]:
            coin = item.get("item", {})
            trending.append({
                "id": coin.get("id", ""),
                "name": coin.get("name", ""),
                "symbol": coin.get("symbol", "").upper(),
                "thumb": coin.get("thumb", ""),
                "market_cap_rank": coin.get("market_cap_rank", 0),
                "price_btc": coin.get("price_btc", 0),
                "score": coin.get("score", 0)
            })
        
        trending_cache[cache_key] = trending
        return jsonify(trending)
    except Exception as e:
        print(f"Trending API error: {e}")
        return jsonify([]), 500


@app.route("/api/news")
def api_news():
    """Get all crypto news from RSS feeds."""
    articles = get_all_news()
    return jsonify(articles[:40])


@app.route("/api/news/geo")
def api_geo_news():
    """Get geopolitical news that impacts crypto."""
    articles = get_all_news()
    geo_articles = [a for a in articles if a.get("is_geo")]
    return jsonify(geo_articles[:20])


@app.route("/api/global")
def api_global():
    """Get global crypto market stats."""
    cache_key = "global_data"
    if cache_key in market_cache:
        return jsonify(market_cache[cache_key])
    
    try:
        url = f"{COINGECKO_BASE}/global"
        headers = {"accept": "application/json", "x-cg-demo-api-key": COINGECKO_API_KEY}
        resp = requests.get(url, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("data", {})
        
        result = {
            "total_market_cap": data.get("total_market_cap", {}).get("usd", 0),
            "total_volume": data.get("total_volume", {}).get("usd", 0),
            "market_cap_change_24h": data.get("market_cap_change_percentage_24h_usd", 0),
            "btc_dominance": data.get("market_cap_percentage", {}).get("btc", 0),
            "eth_dominance": data.get("market_cap_percentage", {}).get("eth", 0),
            "active_cryptos": data.get("active_cryptocurrencies", 0)
        }
        
        market_cache[cache_key] = result
        return jsonify(result)
    except Exception as e:
        print(f"Global API error: {e}")
        return jsonify({}), 500


@app.route("/api/movers")
def api_movers():
    """Get top gainers and losers."""
    cache_key = "market_data"
    if cache_key not in market_cache:
        # Fetch market data first
        api_market()
    
    if cache_key in market_cache:
        coins = market_cache[cache_key]
        valid = [c for c in coins if c.get("change_24h") is not None]
        sorted_coins = sorted(valid, key=lambda x: x.get("change_24h", 0))
        
        losers = sorted_coins[:5]
        gainers = sorted_coins[-5:][::-1]
        
        return jsonify({"gainers": gainers, "losers": losers})
    
    return jsonify({"gainers": [], "losers": []}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
