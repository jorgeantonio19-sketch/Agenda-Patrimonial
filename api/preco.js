// api/preco.js
// Função serverless do Vercel — corre no servidor, não no browser do utilizador.
// Isto resolve o problema de CORS: o browser não pode chamar a Yahoo Finance
// diretamente (bloqueado por segurança), mas servidor-para-servidor não tem
// esse bloqueio. Substitui a dependência de proxies gratuitos e instáveis
// (corsproxy.io / allorigins.win), que continuam como fallback no cliente.
//
// Uso: /api/preco?symbol=SABR   ou   /api/preco?symbol=SABR260821C00002000 (opção OCC)

export default async function handler(req, res) {
    const { symbol } = req.query;

    if (!symbol) {
        res.status(400).json({ error: 'Parâmetro "symbol" é obrigatório. Ex: /api/preco?symbol=SABR' });
        return;
    }

    try {
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;

        const yahooRes = await fetch(yahooUrl, {
            headers: {
                // A Yahoo por vezes bloqueia pedidos sem User-Agent de browser
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!yahooRes.ok) {
            res.status(502).json({ error: 'Yahoo Finance indisponível.', status: yahooRes.status });
            return;
        }

        const data = await yahooRes.json();

        // Cache de 30s na borda do Vercel — reduz pedidos repetidos à Yahoo
        // quando vários utilizadores/abas pedem o mesmo ticker ao mesmo tempo.
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao obter cotação.', detalhe: String(err) });
    }
}
