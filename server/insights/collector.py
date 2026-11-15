#!/usr/bin/env python3
"""GmCat Site Insights: cookieless, first-party website analytics for the GmCat sites.

Runs on 127.0.0.1:4195 on the Linode, separate from the game analytics collector (4190).
Only POST /insights/event is public (proxied by nginx on home.gmcat.io). The summary
endpoint stays private and is read by GmCat HQ over SSH.

Privacy model (cookieless):
  * Nothing is stored in the visitor's browser: no cookies, no localStorage IDs.
  * Unique visitors are estimated with a daily-rotating salted hash of
    (site, IP address, user agent). The salt is random, changes every UTC day and old
    salts are deleted, so hashes cannot be linked across days or reversed.
  * IP addresses and user agents are never written to disk.
  * Do Not Track / Global Privacy Control are honoured in the client.
  * Raw events older than RETENTION_DAYS are deleted automatically.
"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

HOST = "127.0.0.1"
PORT = int(os.environ.get("INSIGHTS_PORT", "4195"))
DB_PATH = Path(os.environ.get("INSIGHTS_DB", "/var/lib/gmcat-insights/insights.sqlite3"))
RETENTION_DAYS = 400
RATE_LIMIT = 120          # events per minute per client
MAX_BODY = 4096

# site key -> hostnames allowed to send for it
SITES = {
    "main": {"gmcat.io", "www.gmcat.io"},
    "home": {"home.gmcat.io"}, "blog": {"blog.gmcat.io"}, "art": {"art.gmcat.io"},
    "apps": {"apps.gmcat.io"}, "tools": {"tools.gmcat.io"}, "drop": {"drop.gmcat.io"},
    "ai": {"ai.gmcat.io"}, "brain": {"brain.gmcat.io"}, "wallets": {"wallets.gmcat.io"},
    "kind": {"kind.gmcat.io"},
}
ALLOWED_ORIGINS = {"https://" + h for hosts in SITES.values() for h in hosts}
EVENTS = {
    "page_view", "click_out",
    "art_search", "art_mood", "art_view", "art_download",
    "blog_read",
    "quiz_start", "quiz_section", "quiz_finish",
    "ripple_sent",
}
META_KEYS = {"term": 60, "mood": 40, "asset": 40, "post": 80, "target": 120, "section": 30, "results": 8, "minutes": 8}
BOT_RE = re.compile(r"bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python|httpclient|lighthouse", re.I)

rates = defaultdict(deque)
ripple_rates = defaultdict(deque)
rate_lock = threading.Lock()
salt_lock = threading.Lock()


def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def initialize():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            received_at TEXT NOT NULL,
            day TEXT NOT NULL,
            site TEXT NOT NULL,
            event TEXT NOT NULL,
            path TEXT NOT NULL,
            visitor TEXT NOT NULL,
            device TEXT NOT NULL,
            referrer TEXT,
            source TEXT,
            campaign TEXT,
            meta TEXT NOT NULL DEFAULT '{}'
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_site_day ON events(site, day)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_event_day ON events(event, day)")
        conn.execute("CREATE TABLE IF NOT EXISTS salts (day TEXT PRIMARY KEY, salt TEXT NOT NULL)")
    cleanup()


def today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def daily_salt(day):
    with salt_lock, db() as conn:
        row = conn.execute("SELECT salt FROM salts WHERE day=?", (day,)).fetchone()
        if row:
            return row["salt"]
        salt = secrets.token_hex(32)
        conn.execute("INSERT INTO salts(day, salt) VALUES(?, ?)", (day, salt))
        conn.execute("DELETE FROM salts WHERE day < ?", (day,))   # old salts gone: hashes can't be linked
        return salt


def cleanup():
    cutoff = datetime.fromtimestamp(time.time() - RETENTION_DAYS * 86400, timezone.utc).strftime("%Y-%m-%d")
    with db() as conn:
        conn.execute("DELETE FROM events WHERE day < ?", (cutoff,))


def clean_text(value, limit):
    if value is None:
        return None
    text = re.sub(r"[\x00-\x1f\x7f]", "", str(value)).strip()
    return text[:limit] or None


def clean_path(value):
    path = clean_text(value, 200) or "/"
    path = path.split("?")[0].split("#")[0]
    return path if path.startswith("/") else "/" + path


def referrer_host(value, own_hosts):
    if not value:
        return None
    try:
        host = (urlparse(str(value)).hostname or "").lower()
    except ValueError:
        return None
    if not host or host in own_hosts:
        return None
    return host[:100]


def rate_limited(client):
    now = time.time()
    with rate_lock:
        q = rates[client]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            return True
        q.append(now)
        if len(rates) > 20000:
            rates.clear()
    return False


def summary(days):
    since = datetime.fromtimestamp(time.time() - (days - 1) * 86400, timezone.utc).strftime("%Y-%m-%d")
    q = lambda sql, *a: [dict(r) for r in conn.execute(sql, (since,) + a).fetchall()]
    with db() as conn:
        sites = q("""SELECT site,
              SUM(event='page_view') views,
              COUNT(DISTINCT CASE WHEN event='page_view' THEN day||visitor END) visitor_days
            FROM events WHERE day >= ? GROUP BY site ORDER BY views DESC""")
        daily = q("""SELECT day, site, SUM(event='page_view') views,
              COUNT(DISTINCT CASE WHEN event='page_view' THEN visitor END) visitors
            FROM events WHERE day >= ? GROUP BY day, site ORDER BY day""")
        pages = q("""SELECT site, path, COUNT(*) views, COUNT(DISTINCT day||visitor) visitor_days
            FROM events WHERE day >= ? AND event='page_view' GROUP BY site, path ORDER BY views DESC LIMIT 40""")
        referrers = q("""SELECT referrer, COUNT(*) views FROM events
            WHERE day >= ? AND event='page_view' AND referrer IS NOT NULL GROUP BY referrer ORDER BY views DESC LIMIT 20""")
        campaigns = q("""SELECT source, campaign, COUNT(*) views FROM events
            WHERE day >= ? AND event='page_view' AND (source IS NOT NULL OR campaign IS NOT NULL)
            GROUP BY source, campaign ORDER BY views DESC LIMIT 20""")
        devices = q("""SELECT device, COUNT(DISTINCT day||visitor) visitor_days FROM events
            WHERE day >= ? AND event='page_view' GROUP BY device ORDER BY visitor_days DESC""")
        outbound = q("""SELECT site, json_extract(meta,'$.target') target, COUNT(*) clicks FROM events
            WHERE day >= ? AND event='click_out' GROUP BY site, target ORDER BY clicks DESC LIMIT 25""")
        searches = q("""SELECT lower(json_extract(meta,'$.term')) term, COUNT(*) searches,
              ROUND(AVG(CAST(json_extract(meta,'$.results') AS REAL)), 0) avg_results
            FROM events WHERE day >= ? AND event='art_search' GROUP BY term ORDER BY searches DESC LIMIT 20""")
        moods = q("""SELECT json_extract(meta,'$.mood') mood, COUNT(*) picks FROM events
            WHERE day >= ? AND event='art_mood' GROUP BY mood ORDER BY picks DESC""")
        downloads = q("""SELECT json_extract(meta,'$.asset') asset, SUM(event='art_view') views, SUM(event='art_download') downloads
            FROM events WHERE day >= ? AND event IN ('art_view','art_download') GROUP BY asset ORDER BY downloads DESC, views DESC LIMIT 20""")
        reads = q("""SELECT json_extract(meta,'$.post') post, COUNT(*) reads FROM events
            WHERE day >= ? AND event='blog_read' GROUP BY post ORDER BY reads DESC""")
        quiz = q("""SELECT event, json_extract(meta,'$.section') section, COUNT(*) n FROM events
            WHERE day >= ? AND event IN ('quiz_start','quiz_section','quiz_finish') GROUP BY event, section""")
    totals = {
        "views": sum(s["views"] or 0 for s in sites),
        "visitor_days": sum(s["visitor_days"] or 0 for s in sites),
    }
    return {"days": days, "since": since, "generatedAt": datetime.now(timezone.utc).isoformat(),
            "totals": totals, "sites": sites, "daily": daily, "pages": pages, "referrers": referrers,
            "campaigns": campaigns, "devices": devices, "outbound": outbound, "artSearches": searches,
            "artMoods": moods, "artAssets": downloads, "blogReads": reads, "quiz": quiz}


class Handler(BaseHTTPRequestHandler):
    server_version = "GmCatInsights/1.0"

    def log_message(self, *args):
        pass

    def cors(self):
        origin = self.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS or re.match(r"^http://(127\.0\.0\.1|localhost)(:\d+)?$", origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def reply(self, code, obj=None):
        body = json.dumps(obj).encode() if obj is not None else b""
        self.send_response(code)
        self.cors()
        self.send_header("Cache-Control", "no-store")
        if obj is not None:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        route = urlparse(self.path)
        if route.path == "/health":
            return self.reply(200, {"ok": True})
        if route.path == "/summary":   # private: only reachable on 127.0.0.1 (nginx never proxies it)
            try:
                days = min(400, max(1, int(parse_qs(route.query).get("days", ["30"])[0])))
            except ValueError:
                days = 30
            return self.reply(200, summary(days))
        if route.path == "/kind/ripple":
            with db() as conn:
                total = conn.execute("SELECT COUNT(*) FROM events WHERE site='kind' AND event='ripple_sent'").fetchone()[0]
            return self.reply(200, {"ripples_sent": total})
        self.reply(404, {"error": "not found"})

    def do_POST(self):
        if urlparse(self.path).path == "/kind/ripple":
            client = self.headers.get("X-Real-IP") or self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()
            ua, origin = self.headers.get("User-Agent", ""), self.headers.get("Origin", "")
            if origin != "https://kind.gmcat.io" and not re.match(r"^http://(127\.0\.0\.1|localhost)(:\d+)?$", origin):
                return self.reply(403, {"error": "origin not allowed"})
            if BOT_RE.search(ua):
                return self.reply(204)
            now = time.time()
            with rate_lock:
                q = ripple_rates[client]
                while q and now - q[0] > 3600: q.popleft()
                if len(q) >= 5: return self.reply(429, {"error": "That is plenty of ripples for now. Come back a little later."})
                q.append(now)
            day = today()
            visitor = hashlib.sha256(f"{daily_salt(day)}|kind|{client}|{ua}".encode()).hexdigest()[:20]
            with db() as conn:
                conn.execute("""INSERT INTO events(received_at, day, site, event, path, visitor, device, referrer, source, campaign, meta)
                    VALUES(?,?,?,?,?,?,?,?,?,?,?)""", (datetime.now(timezone.utc).isoformat(), day, "kind", "ripple_sent", "/", visitor, "unknown", None, None, None, "{}"))
                total = conn.execute("SELECT COUNT(*) FROM events WHERE site='kind' AND event='ripple_sent'").fetchone()[0]
            return self.reply(201, {"ok": True, "ripples_sent": total})
        if urlparse(self.path).path not in ("/event", "/insights/event"):
            return self.reply(404, {"error": "not found"})
        client = self.headers.get("X-Real-IP") or self.headers.get("X-Forwarded-For", self.client_address[0]).split(",")[0].strip()
        ua = self.headers.get("User-Agent", "")
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            return self.reply(403, {"error": "origin not allowed"})
        if BOT_RE.search(ua):
            return self.reply(204)
        if rate_limited(client):
            return self.reply(429, {"error": "slow down"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            return self.reply(413, {"error": "bad size"})
        try:
            data = json.loads(self.rfile.read(length))
        except (ValueError, UnicodeDecodeError):
            return self.reply(400, {"error": "bad json"})
        site, event = str(data.get("site", "")), str(data.get("event", ""))
        origin_host = urlparse(origin).hostname
        if site not in SITES or origin_host not in SITES[site] or event not in EVENTS:
            return self.reply(400, {"error": "unknown site or event"})
        day = today()
        visitor = hashlib.sha256(f"{daily_salt(day)}|{site}|{client}|{ua}".encode()).hexdigest()[:20]
        meta_in = data.get("meta") if isinstance(data.get("meta"), dict) else {}
        meta = {k: clean_text(meta_in[k], n) for k, n in META_KEYS.items() if meta_in.get(k) not in (None, "")}
        device = data.get("device") if data.get("device") in ("phone", "tablet", "desktop") else "unknown"
        own_hosts = {h for hosts in SITES.values() for h in hosts}
        with db() as conn:
            conn.execute("""INSERT INTO events(received_at, day, site, event, path, visitor, device, referrer, source, campaign, meta)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (datetime.now(timezone.utc).isoformat(), day, site, event, clean_path(data.get("path")), visitor, device,
                 referrer_host(data.get("referrer"), own_hosts), clean_text(data.get("source"), 60),
                 clean_text(data.get("campaign"), 80), json.dumps(meta)))
        self.reply(202, {"ok": True})


def cleanup_loop():
    while True:
        time.sleep(6 * 3600)
        try:
            cleanup()
        except Exception:
            pass


if __name__ == "__main__":
    initialize()
    threading.Thread(target=cleanup_loop, daemon=True).start()
    print(f"GmCat Site Insights on http://{HOST}:{PORT}", flush=True)
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
