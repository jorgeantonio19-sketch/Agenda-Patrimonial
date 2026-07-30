// watchlist.js — módulo da Watchlist

    // ===== WATCHLIST =====
    let watchlist = JSON.parse(localStorage.getItem('agenda_watchlist')) || [];
    let watchlistLoop = null;

    function persistirWatchlist() {
        localStorage.setItem('agenda_watchlist', JSON.stringify(watchlist));
    }

    function corAvatarTicker(ticker) {
        const cores = ['#f59e0b','#34d399','#60a5fa','#f87171','#c084fc','#22d3ee','#fb923c','#a3e635'];
        let hash = 0;
        for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
        return cores[Math.abs(hash) % cores.length];
    }

    // Texto curto tipo "agora", "23s", "2min" — usado no selo de frescor do preço.
    function tempoDecorrido(ts) {
        const seg = Math.floor((Date.now() - ts) / 1000);
        if (seg < 5) return 'agora';
        if (seg < 60) return seg + 's';
        const min = Math.floor(seg / 60);
        return min + 'min';
    }

    function adicionarTickerWatchlist() {
        const input = document.getElementById('wlNovoTicker');
        const ticker = input.value.toUpperCase().trim();
        if (!ticker) return;
        if (watchlist.includes(ticker)) { alert('Esse ticker já está na watchlist.'); return; }
        if (watchlist.length >= 20) { alert('Limite de 20 tickers na watchlist (para não sobrecarregar as cotações).'); return; }
        watchlist.push(ticker);
        persistirWatchlist();
        input.value = '';
        renderizarWatchlist();
    }

    function removerTickerWatchlist(ticker) {
        watchlist = watchlist.filter(t => t !== ticker);
        persistirWatchlist();
        renderizarWatchlist();
    }

    function linhaWatchlistHTML(ticker, dados) {
        const cor = corAvatarTicker(ticker);
        const letra = ticker.charAt(0);
        let precoHtml, variacaoHtml = '', selo = '';

        if (dados === undefined) {
            precoHtml = '<span style="font-size:11px;color:#64748b;">A carregar...</span>';
        } else if (dados === null) {
            precoHtml = '<span style="font-size:11px;color:#64748b;">Sem dados</span>';
        } else {
            const sobe = dados.variacao >= 0;
            const corVar = sobe ? '#34d399' : '#f87171';
            const sinal = sobe ? '+' : '';
            precoHtml = dados.preco.toFixed(2);
            variacaoHtml = `<div class="wl-variacao" style="color:${corVar};">${sinal}${dados.variacaoAbs.toFixed(2)} ${sinal}${dados.variacao.toFixed(2)}%</div>`;
            selo = `<div class="wl-ts" data-ts="${dados.ts}">🕒 ${tempoDecorrido(dados.ts)}</div>`;
        }

        return `
            <div class="wl-row" id="wlLinha_${ticker}">
                <div class="wl-avatar" style="background-color:${cor};">${letra}</div>
                <div class="wl-info">
                    <div class="wl-ticker">${ticker}</div>
                    <div class="wl-nome">Watchlist</div>
                </div>
                <div class="wl-preco-col">
                    <div class="wl-preco">${precoHtml}</div>
                    ${variacaoHtml}
                    ${selo}
                </div>
                <button class="wl-del" onclick="removerTickerWatchlist('${ticker}')">✕</button>
            </div>`;
    }

    async function renderizarWatchlist() {
        const container = document.getElementById('watchlistContainer');
        if (!container) return;

        if (watchlist.length === 0) {
            container.innerHTML = '<div class="rf-empty">Nenhum ativo na watchlist. Adicione um ticker acima.</div>';
            return;
        }

        // Mostra a lista já com "a carregar", depois vai preenchendo linha a linha
        container.innerHTML = watchlist.map(t => linhaWatchlistHTML(t, undefined)).join('');

        // Todos os pedidos disparados ao mesmo tempo (antes era um ticker de cada vez em fila,
        // por isso a fila inteira ficava presa em "A carregar..." se um deles fosse lento).
        // Cada linha atualiza-se sozinha assim que o SEU preço chega, sem esperar pelas outras.
        watchlist.forEach(async (ticker) => {
            const dados = await buscarPrecoYahoo(ticker);
            const el = document.getElementById('wlLinha_' + ticker);
            if (el) el.outerHTML = linhaWatchlistHTML(ticker, dados);
        });
    }

    // Só atualiza o texto do selo (não busca preço de novo) — roda mais rápido
    // que o refresh de preços pra o "há Xs" ficar sempre correto na tela.
    function atualizarSelosWatchlist() {
        document.querySelectorAll('.wl-ts').forEach(el => {
            const ts = parseInt(el.getAttribute('data-ts'), 10);
            if (ts) el.textContent = '🕒 ' + tempoDecorrido(ts);
        });
    }

    function iniciarWatchlistLoop() {
        if (watchlistLoop) clearInterval(watchlistLoop);
        renderizarWatchlist();
        watchlistLoop = setInterval(renderizarWatchlist, 60000);
        if (!window._agendaSeloLoop) window._agendaSeloLoop = setInterval(atualizarSelosWatchlist, 5000);
    }
