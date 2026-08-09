// grafico.js — gráfico de pizza da carteira

    // ===== GRÁFICO DE PIZZA =====
    const CORES = ['#f59e0b','#34d399','#38bdf8','#f87171','#a78bfa','#fb923c','#4ade80','#60a5fa','#e879f9','#fbbf24'];
    const MAPA_BTN_PIZZA = { quantidade: 'btnModoQtd', dinheiro: 'btnModoValor', tipo: 'btnModoTipo' };
    let modoPizza = localStorage.getItem('agenda_pizza_modo') || 'dinheiro';

    function mudarModoPizza(modo) {
        modoPizza = modo;
        localStorage.setItem('agenda_pizza_modo', modo);
        desenharPizza();
    }

    function desenharPizza() {
        const canvas = document.getElementById('pizzaCanvas');
        const legenda = document.getElementById('pizzaLegenda');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        document.querySelectorAll('.pizza-modo-btn').forEach(b => b.classList.remove('active'));
        const btnAtivo = document.getElementById(MAPA_BTN_PIZZA[modoPizza]);
        if (btnAtivo) btnAtivo.classList.add('active');

        const capitalRF = rendaFixa.reduce((s,p) => s + p.capital, 0);
        let dados = [];

        if (modoPizza === 'quantidade') {
            // Fatia por ticker, somando ações detidas + equivalente de opções vendidas
            // (cada contrato controla 100 ações — é o que dá a tickers só-opções, como
            // a Ford, uma fatia própria em vez de sumirem do gráfico).
            const porTicker = {};
            calcularAcoesDetidas().forEach(pos => {
                if (pos.qtd > 0) porTicker[pos.ticker] = (porTicker[pos.ticker] || 0) + pos.qtd;
            });
            POSICOES_CONSOLIDADAS.opcoesVendidas.forEach(pos => {
                porTicker[pos.ticker] = (porTicker[pos.ticker] || 0) + (pos.contratos * 100);
            });
            Object.keys(porTicker).forEach(ticker => {
                if (porTicker[ticker] > 0) dados.push({ nome: ticker, valor: porTicker[ticker] });
            });
            if (capitalRF > 0) dados.push({ nome: 'Renda Fixa', valor: capitalRF });

        } else if (modoPizza === 'dinheiro') {
            // Fatia por ticker: valor de mercado das ações (preço em cache × quantidade)
            // + valor retido nas opções vendidas desse mesmo ticker (já calculado em
            // totais.js). Renda Fixa entra como fatia única separada.
            const porTicker = {};
            calcularAcoesDetidas().forEach(pos => {
                const dp = cachePrecos[pos.ticker];
                if (dp && dp.preco) {
                    const valor = converterParaUSD(dp.preco * pos.qtd, pos.moeda || 'USD');
                    if (valor > 0) porTicker[pos.ticker] = (porTicker[pos.ticker] || 0) + valor;
                }
            });
            Object.keys(ultimoValorRetidoPorTicker || {}).forEach(ticker => {
                const valor = ultimoValorRetidoPorTicker[ticker];
                if (valor) porTicker[ticker] = (porTicker[ticker] || 0) + valor;
            });
            Object.keys(porTicker).forEach(ticker => {
                if (porTicker[ticker] > 0) dados.push({ nome: ticker, valor: porTicker[ticker] });
            });
            if (capitalRF > 0) dados.push({ nome: 'Renda Fixa', valor: capitalRF });

        } else if (modoPizza === 'tipo') {
            // Só 2 fatias: Renda Variável (Ações + Opções) vs Renda Fixa
            const rendaVariavel = (ultimoValorAplicado || 0) + (ultimoValorRetido || 0);
            if (rendaVariavel > 0) dados.push({ nome: 'Renda Variável', valor: rendaVariavel });
            if (capitalRF > 0) dados.push({ nome: 'Renda Fixa', valor: capitalRF });
        }

        ctx.clearRect(0, 0, 150, 150);
        legenda.innerHTML = '';

        if (dados.length === 0) {
            ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.arc(75,75,65,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#475569'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('Sem dados', 75, 79);
            if (modoPizza === 'dinheiro') { ctx.font = '9px sans-serif'; ctx.fillText('(a aguardar preços...)', 75, 92); }
            return;
        }

        const total = dados.reduce((s,d) => s + d.valor, 0);
        let angulo = -Math.PI / 2;
        dados.forEach((d, i) => {
            const fatia = (d.valor / total) * Math.PI * 2;
            const cor = CORES[i % CORES.length];
            ctx.beginPath(); ctx.moveTo(75,75); ctx.arc(75,75,65,angulo,angulo+fatia); ctx.closePath();
            ctx.fillStyle = cor; ctx.fill();
            ctx.strokeStyle = '#0b1329'; ctx.lineWidth = 2; ctx.stroke();
            angulo += fatia;
            const pct = ((d.valor/total)*100).toFixed(1);
            legenda.innerHTML += `<div class="legend-item"><div class="legend-dot" style="background:${cor}"></div><span class="legend-label">${d.nome}</span><span class="legend-pct">${pct}%</span></div>`;
        });
    }
