// precos.js — ticker Yahoo Finance, estado do mercado NY, símbolo OCC

    // ===== TICKER PREÇOS YAHOO FINANCE =====
    function obterTickersAgenda() {
        return [...new Set(agenda.map(i => i.ticker))].filter(t => t && t.length > 0);
    }

    // ===== FALLBACK: ESTADO REAL DO MERCADO (NYSE/NASDAQ) =====
    // Usado quando a Yahoo/proxy não devolve o campo marketState (falha parcial
    // do proxy), para não assumir "FECHADO" às cegas mesmo com o mercado aberto.
    function calcularEstadoMercadoNY() {
        const agoraNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const diaSemana = agoraNY.getDay(); // 0 = domingo, 6 = sábado
        if (diaSemana === 0 || diaSemana === 6) return 'CLOSED';

        const minutos = agoraNY.getHours() * 60 + agoraNY.getMinutes();
        const abertura = 9 * 60 + 30;   // 09:30 ET
        const fechoRegular = 16 * 60;   // 16:00 ET
        const preMarketInicio = 4 * 60; // 04:00 ET
        const afterHoursFim = 20 * 60;  // 20:00 ET

        if (minutos >= abertura && minutos < fechoRegular) return 'REGULAR';
        if (minutos >= preMarketInicio && minutos < abertura) return 'PRE';
        if (minutos >= fechoRegular && minutos < afterHoursFim) return 'POST';
        return 'CLOSED';
        // Nota: não contempla feriados do mercado dos EUA (Ação de Graças, Natal, etc.)
    }

    async function buscarPrecoYahoo(ticker) {
        if (cachePrecos[ticker] && (Date.now() - cachePrecos[ticker].ts) < 60000) return cachePrecos[ticker];
        
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;
        const fontes = [
            `/api/preco?symbol=${encodeURIComponent(ticker)}`, // servidor próprio (Vercel) — sem CORS, mais rápido/fiável
            `https://corsproxy.io/?url=${encodeURIComponent(yahooUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
            yahooUrl
        ];
        
        for (const url of fontes) {
            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (!res.ok) continue;
                const data = await res.json();
                const result = data.chart && data.chart.result && data.chart.result[0];
                if (!result) continue;
                const meta = result.meta;
                // Mercado aberto: regularMarketPrice; Fechado: previousClose ou chartPreviousClose
                const preco = meta.regularMarketPrice || meta.previousClose || meta.chartPreviousClose;
                const anterior = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
                if (!preco) continue;
                const variacao = anterior && anterior !== preco ? ((preco - anterior) / anterior * 100) : 0;
                const marketState = meta.marketState || calcularEstadoMercadoNY();
                const obj = { ticker, preco, variacao, variacaoAbs: preco - anterior, marketState, ts: Date.now() };
                cachePrecos[ticker] = obj;
                return obj;
            } catch(e) { continue; }
        }
        return null;
    }

    // ===== SÍMBOLO OCC DA OPÇÃO (PADRÃO YAHOO FINANCE) =====
    // Ex: SABR $2 Call, vencimento 21/08/2026 -> "SABR260821C00002000"
    function montarSimboloOCC(pos) {
        const [ano, mes, dia] = pos.vencimento.split('-');
        const aa = ano.slice(2);
        const strikeMil = Math.round(pos.strike * 1000).toString().padStart(8, '0');
        return `${pos.ticker}${aa}${mes}${dia}${pos.tipo}${strikeMil}`;
    }

    async function buscarPrecoOpcaoYahoo(pos) {
        const occ = montarSimboloOCC(pos);
        if (cachePrecosOpcoes[occ] && (Date.now() - cachePrecosOpcoes[occ].ts) < 60000) return cachePrecosOpcoes[occ];

        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${occ}?interval=1d&range=5d`;
        const fontes = [
            `/api/preco?symbol=${encodeURIComponent(occ)}`, // servidor próprio (Vercel) — sem CORS, mais rápido/fiável
            `https://corsproxy.io/?url=${encodeURIComponent(yahooUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`,
            yahooUrl
        ];

        for (const url of fontes) {
            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (!res.ok) continue;
                const data = await res.json();
                const result = data.chart && data.chart.result && data.chart.result[0];
                if (!result) continue;
                const meta = result.meta;
                const preco = meta.regularMarketPrice || meta.previousClose || meta.chartPreviousClose;
                if (!preco && preco !== 0) continue;
                const obj = { occ, preco, ts: Date.now() };
                cachePrecosOpcoes[occ] = obj;
                return obj;
            } catch(e) { continue; }
        }
        // Falha na busca: mantém o último preço conhecido em cache (se existir) como fallback
        return cachePrecosOpcoes[occ] || null;
    }


    function iniciarTickerLoop() { /* removido */ }
    function onAtivoInput() { /* removido */ }

    // ===== CÂMBIO E CONVERSÃO DE MOEDA (usado pelo seletor USD/EUR/BRL na Watchlist) =====
    // Atualiza o cache partilhado taxasCambio. Chamado no arranque e a cada 60s
    // (junto do loop de totais), para os valores convertidos nunca ficarem muito
    // desatualizados sem gerar pedidos extra à Yahoo a cada render.
    async function atualizarTaxasCambio() {
        const [eurUsd, usdBrl] = await Promise.all([
            buscarPrecoYahoo('EURUSD=X'),
            buscarPrecoYahoo('USDBRL=X')
        ]);
        if (eurUsd && eurUsd.preco) taxasCambio.EURUSD = eurUsd.preco;
        if (usdBrl && usdBrl.preco) taxasCambio.USDBRL = usdBrl.preco;
    }

    function simboloMoeda(m) {
        if (m === 'EUR') return '€';
        if (m === 'BRL') return 'R$';
        return '$';
    }

    // Converte um valor bruto (número, não formatado) de moedaOrigem pra USD.
    // Usado antes de SOMAR posições em moedas diferentes (ex: ações USD + B3 em BRL)
    // — nunca dá pra somar números brutos de moedas diferentes direto.
    function converterParaUSD(valor, moedaOrigem) {
        if (moedaOrigem === 'EUR' && taxasCambio.EURUSD) return valor * taxasCambio.EURUSD;
        if (moedaOrigem === 'BRL' && taxasCambio.USDBRL) return valor / taxasCambio.USDBRL;
        return valor;
    }

    // Converte um valor de moedaOrigem ('USD'|'EUR') para a moeda atualmente
    // selecionada (moedaExibicao) e devolve já formatado com símbolo.
    // Se a taxa ainda não chegou (app acabou de abrir), cai para USD como fallback.
    function formatarMoeda(valor, moedaOrigem, casas) {
        moedaOrigem = moedaOrigem || 'USD';
        casas = (casas === undefined) ? 2 : casas;
        const semCambio = !taxasCambio.EURUSD || !taxasCambio.USDBRL;
        const destino = semCambio ? 'USD' : moedaExibicao;

        // Passo A: origem -> USD
        let valorUSD = valor;
        if (moedaOrigem === 'EUR') valorUSD = semCambio ? valor : (valor * taxasCambio.EURUSD);
        else if (moedaOrigem === 'BRL') valorUSD = semCambio ? valor : (valor / taxasCambio.USDBRL);

        // Passo B: USD -> destino
        let valorFinal = valorUSD;
        if (destino === 'EUR') valorFinal = valorUSD / taxasCambio.EURUSD;
        else if (destino === 'BRL') valorFinal = valorUSD * taxasCambio.USDBRL;

        if (destino === 'EUR') return '€' + valorFinal.toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas });
        if (destino === 'BRL') return 'R$' + valorFinal.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
        return '$' + valorFinal.toLocaleString('en-US', { minimumFractionDigits: casas, maximumFractionDigits: casas });
    }
