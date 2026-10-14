const cache = new Map();
const TTL = 60_000;
// Optional shared cache in Upstash Redis (serverless instances don't share memory).
let redis = null;
const rUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const rTok = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
if (rUrl && rTok) { try { const { Redis } = require('@upstash/redis'); redis = new Redis({ url: rUrl, token: rTok }); } catch {} }
async function getJSON(url, ttl = TTL) {
  let hit = cache.get(url);
  if (!hit && redis) { try { const r = await redis.get('pp:' + url); if (r) { hit = r; cache.set(url, r); } } catch {} }
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 429) { if (hit) return hit.v; throw new Error('RATE_LIMIT'); }
  if (!res.ok) { if (hit) return hit.v; throw new Error('HTTP_' + res.status); }
  const v = await res.json();
  const e = { t: Date.now(), v };
  cache.set(url, e);
  if (redis) redis.set('pp:' + url, e, { ex: Math.max(3600, Math.ceil(ttl / 1000) * 4) }).catch(() => {});
  return v;
}
const CG = 'https://api.coingecko.com/api/v3';
const ALIASES = { btc: 'bitcoin', eth: 'ethereum', sol: 'solana', bnb: 'binancecoin', usdt: 'tether', usdc: 'usd-coin', xrp: 'ripple', doge: 'dogecoin', ton: 'the-open-network', trx: 'tron', ada: 'cardano', bonk: 'bonk', wif: 'dogwifcoin', jup: 'jupiter-exchange-solana', pepe: 'pepe', sui: 'sui', ltc: 'litecoin' };
async function resolveCoin(q) {
  q = q.toLowerCase().replace(/^\$/, '').trim();
  if (ALIASES[q]) return ALIASES[q];
  const s = await getJSON(`${CG}/search?query=${encodeURIComponent(q)}`, 3600_000);
  const coins = s.coins || [];
  const exact = coins.find(c => c.symbol.toLowerCase() === q) || coins.find(c => c.id === q || c.name.toLowerCase() === q);
  return (exact || coins[0] || {}).id || null;
}
async function price(id) {
  const d = await getJSON(`${CG}/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`);
  return d[id] || null;
}
async function usdNgn() {
  const d = await getJSON('https://open.er-api.com/v6/latest/USD', 3600_000);
  return d.rates.NGN;
}
const top = () => getJSON(`${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=24h`);
const trending = () => getJSON(`${CG}/search/trending`, 300_000);
async function solBalance(addr) {
  const res = await fetch('https://api.mainnet-beta.solana.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [addr] }) });
  const j = await res.json();
  if (j.error) throw new Error(j.error.message);
  return j.result.value / 1e9;
}
module.exports = { resolveCoin, price, usdNgn, top, trending, solBalance };
