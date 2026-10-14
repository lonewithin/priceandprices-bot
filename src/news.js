const FEEDS = [
  ['Cointelegraph', 'https://cointelegraph.com/rss/tag/solana'],
  ['CoinDesk', 'https://www.coindesk.com/arc/outboundfeeds/rss/'],
  ['Decrypt', 'https://decrypt.co/feed'],
];
let cache = { t: 0, items: [] };
const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').trim();
const tag = (x, n) => { const m = x.match(new RegExp(`<${n}[^>]*>([\\s\\S]*?)</${n}>`)); return m ? dec(m[1]) : ''; };
async function all() {
  if (Date.now() - cache.t < 600_000 && cache.items.length) return cache.items;
  const res = await Promise.allSettled(FEEDS.map(async ([src, url]) => {
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 PriceAndPricesBot' } });
    const xml = await r.text();
    return (xml.match(/<item[\s\S]*?<\/item>/g) || []).map(it => ({ src, title: tag(it, 'title'), link: tag(it, 'link'), date: new Date(tag(it, 'pubDate')), text: tag(it, 'title') + ' ' + tag(it, 'description') + ' ' + tag(it, 'category') }));
  }));
  const items = res.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  if (items.length) cache = { t: Date.now(), items };
  return cache.items;
}
async function news(words) {
  const re = new RegExp(`\\b(${words.join('|')})\\b`, 'i');
  const seen = new Set();
  return (await all()).filter(i => re.test(i.text) && !seen.has(i.title) && seen.add(i.title)).sort((a, b) => b.date - a.date).slice(0, 8);
}
function ago(d) { const m = Math.round((Date.now() - d) / 60000); return isNaN(m) ? '' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`; }
module.exports = { news, ago };
