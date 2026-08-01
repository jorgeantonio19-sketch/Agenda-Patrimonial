// simulador.js — Simulador de Payoff de Opções (Fase 2)
// Ferramenta educativa: não usa dados reais além do que o utilizador digita
// ou carrega de uma posição já registada na Agenda (só como ponto de partida).

    let simTipo = 'CALL';
    let simDirecao = 'COMPRA';

    function abrirModalSimulador() {
        // Popula o seletor "carregar da Agenda" com as opções já registadas
        const sel = document.getElementById('simSelectAgenda');
        const card = document.getElementById('simCarregarCard');
        const opcoes = agenda.filter(i => i.instrumento === 'OPCAO');
        if (opcoes.length > 0) {
            sel.innerHTML = '<option value="">— escolher uma opção já registada —</option>' +
                opcoes.map(i => `<option value="${i.id}">${i.ticker} ${i.tipoOpcao} $${i.preco.toFixed(2)} (${i.direcao === 'VENDA' ? 'venda' : 'compra'})</option>`).join('');
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
        simRecalcular();
        document.getElementById('modalSimulador').classList.add('active');
    }
    function fecharModalSimulador() {
        document.getElementById('modalSimulador').classList.remove('active');
    }

    function simCarregarDaAgenda(id) {
        if (!id) return;
        const item = agenda.find(i => i.id === parseInt(id, 10));
        if (!item) return;
        const premioPorAcao = item.qtdOriginal ? Math.abs(item.valorEfeito) / item.qtdOriginal : 0;
        simSetTipo(item.tipoOpcao === 'PUT' ? 'PUT' : 'CALL');
        simSetDirecao(item.direcao === 'VENDA' ? 'VENDA' : 'COMPRA');
        document.getElementById('simStrike').value = item.preco || 0;
        document.getElementById('simPremio').value = premioPorAcao || 0.01;
        document.getElementById('simPreco').value = item.preco || 0;
        document.getElementById('simQtd').value = item.qtdOriginal || 100;
        simRecalcular();
    }

    function simSetTipo(tipo) {
        simTipo = tipo;
        document.getElementById('simTipoCALL').classList.toggle('active', tipo === 'CALL');
        document.getElementById('simTipoPUT').classList.toggle('active', tipo === 'PUT');
        simRecalcular();
    }
    function simSetDirecao(direcao) {
        simDirecao = direcao;
        document.getElementById('simDirCOMPRA').classList.toggle('active', direcao === 'COMPRA');
        document.getElementById('simDirVENDA').classList.toggle('active', direcao === 'VENDA');
        document.getElementById('simPremioTotalLabel').textContent = direcao === 'VENDA' ? 'Prémio Total Recebido' : 'Prémio Total Pago';
        simRecalcular();
    }

    // Payoff por ação, no vencimento, pra um preço S qualquer do ativo.
    function simPayoffPorAcao(S, strike, premio) {
        const intrinseco = simTipo === 'CALL' ? Math.max(S - strike, 0) : Math.max(strike - S, 0);
        return simDirecao === 'COMPRA' ? (intrinseco - premio) : (premio - intrinseco);
    }

    function simRecalcular() {
        const strike = parseFloat(document.getElementById('simStrike').value) || 0;
        const premio = parseFloat(document.getElementById('simPremio').value) || 0;
        const preco = parseFloat(document.getElementById('simPreco').value) || 0;
        const qtd = parseInt(document.getElementById('simQtd').value, 10) || 0;

        document.getElementById('simStrikeValor').textContent = '$ ' + strike.toFixed(2);
        document.getElementById('simPremioValor').textContent = '$ ' + premio.toFixed(2);
        document.getElementById('simPrecoValor').textContent = '$ ' + preco.toFixed(2);
        document.getElementById('simQtdValor').textContent = qtd.toLocaleString('pt-PT');

        // Classificação ITM/ATM/OTM independe da direção (compra/venda)
        const tolerancia = strike * 0.003;
        let classe, corClasse;
        const dentro = simTipo === 'CALL' ? (preco > strike + tolerancia) : (preco < strike - tolerancia);
        const fora = simTipo === 'CALL' ? (preco < strike - tolerancia) : (preco > strike + tolerancia);
        if (dentro) { classe = 'ITM (Dentro do Dinheiro)'; corClasse = '#34d399'; }
        else if (fora) { classe = 'OTM (Fora do Dinheiro)'; corClasse = '#f87171'; }
        else { classe = 'ATM (No Dinheiro)'; corClasse = '#fbbf24'; }
        const elClasse = document.getElementById('simClassificacao');
        elClasse.textContent = classe;
        elClasse.style.color = corClasse;

        const equilibrio = simTipo === 'CALL' ? (strike + premio) : (strike - premio);
        document.getElementById('simEquilibrio').textContent = '$ ' + equilibrio.toFixed(2);
        document.getElementById('simPremioTotal').textContent = '$ ' + (premio * qtd).toFixed(2);

        const resultadoAtual = simPayoffPorAcao(preco, strike, premio) * qtd;
        const elResultado = document.getElementById('simResultadoAtual');
        elResultado.textContent = (resultadoAtual >= 0 ? '' : '-') + '$ ' + Math.abs(resultadoAtual).toFixed(2);
        elResultado.style.color = resultadoAtual >= 0 ? '#34d399' : '#f87171';

        simDesenharGrafico(strike, premio, preco, qtd);
    }

    function simDesenharGrafico(strike, premio, preco, qtd) {
        const canvas = document.getElementById('simCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const padL = 55, padR = 15, padT = 15, padB = 30;
        const plotW = W - padL - padR, plotH = H - padT - padB;

        // Faixa de preço do ativo a desenhar, sempre cobrindo strike e preço atual com folga
        const base = Math.max(strike, preco, 1);
        let pMin = Math.max(0, Math.min(strike, preco) - base * 0.6);
        let pMax = Math.max(strike, preco) + base * 0.6;
        if (pMax - pMin < 1) { pMin = Math.max(0, pMin - 1); pMax = pMax + 1; }

        const N = 120;
        const pontos = [];
        let yMin = 0, yMax = 0;
        for (let i = 0; i <= N; i++) {
            const S = pMin + (pMax - pMin) * (i / N);
            const y = simPayoffPorAcao(S, strike, premio) * qtd;
            pontos.push({ S, y });
            if (y < yMin) yMin = y;
            if (y > yMax) yMax = y;
        }
        if (yMax - yMin < 1) { yMax += 1; yMin -= 1; }
        const margemY = (yMax - yMin) * 0.12;
        yMin -= margemY; yMax += margemY;

        const xOf = (S) => padL + ((S - pMin) / (pMax - pMin)) * plotW;
        const yOf = (y) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

        // Linha zero (referência de lucro/prejuízo)
        ctx.strokeStyle = 'rgba(148,163,184,0.35)';
        ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(padL, yOf(0)); ctx.lineTo(W - padR, yOf(0)); ctx.stroke();

        // Linha do strike (amarelo)
        ctx.strokeStyle = 'rgba(251,191,36,0.7)';
        ctx.beginPath(); ctx.moveTo(xOf(strike), padT); ctx.lineTo(xOf(strike), padT + plotH); ctx.stroke();

        // Linha do preço atual (ciano)
        ctx.strokeStyle = 'rgba(34,211,238,0.8)';
        ctx.beginPath(); ctx.moveTo(xOf(preco), padT); ctx.lineTo(xOf(preco), padT + plotH); ctx.stroke();
        ctx.setLineDash([]);

        // Curva de payoff — segmentos coloridos por sinal (lucro/prejuízo)
        ctx.lineWidth = 2.5;
        for (let i = 0; i < pontos.length - 1; i++) {
            const a = pontos[i], b = pontos[i + 1];
            ctx.strokeStyle = (a.y + b.y) / 2 >= 0 ? '#34d399' : '#f87171';
            ctx.beginPath();
            ctx.moveTo(xOf(a.S), yOf(a.y));
            ctx.lineTo(xOf(b.S), yOf(b.y));
            ctx.stroke();
        }

        // Eixos: rótulos mínimos (preço min/max e zero)
        ctx.fillStyle = '#64748b'; ctx.font = '10px -apple-system, sans-serif';
        ctx.textAlign = 'left'; ctx.fillText('$' + pMin.toFixed(0), padL, H - 8);
        ctx.textAlign = 'right'; ctx.fillText('$' + pMax.toFixed(0), W - padR, H - 8);
        ctx.textAlign = 'right';
        ctx.fillText('$' + yMax.toFixed(0), padL - 6, padT + 8);
        ctx.fillText('$' + yMin.toFixed(0), padL - 6, padT + plotH);
        ctx.fillStyle = '#fbbf24'; ctx.textAlign = 'center';
        ctx.fillText('K', xOf(strike), padT + plotH + 12);
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('Atual', xOf(preco), padT - 4 < 8 ? 10 : padT - 4);
    }
