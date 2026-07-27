// totais.js — cartões de categoria, cash Tastytrade e totais consolidados

    // ===== CARTÕES DE CATEGORIA (aba Carteira) =====
    let ultimoValorAplicado = 0, ultimoValorRetido = 0;
    let ultimoCapitalRF = 0, ultimoJurosRF = 0;

    function atualizarCategoriasCarteira() {
        const elA = document.getElementById('catAcoesValor');
        if (!elA) return; // secção ainda não está no DOM

        document.getElementById('catAcoesValor').textContent = '$' + ultimoValorAplicado.toFixed(2);
        document.getElementById('catOpcoesValor').textContent = '$' + ultimoValorRetido.toFixed(2);
        document.getElementById('catRendaFixaValor').textContent = fmtEUR(ultimoCapitalRF);

        const totalAlocado = ultimoValorAplicado + ultimoValorRetido + ultimoCapitalRF;
        document.getElementById('catGeralAlocado').textContent = '$' + totalAlocado.toFixed(2);

        const lucroEl = document.getElementById('catGeralLucro');
        const sinal = ultimoJurosRF >= 0 ? '+' : '';
        lucroEl.textContent = sinal + fmtEUR(ultimoJurosRF);
        lucroEl.style.color = ultimoJurosRF >= 0 ? '#34d399' : '#f87171';

        atualizarTudoJunto();
        if (typeof desenharPizza === 'function') desenharPizza();
    }

    // ===== TUDO JUNTO (Cash + Ações + Renda Fixa, convertido para $/€/R$ com câmbio real) =====
    // Opções fica de fora de propósito: é garantia retida já contabilizada dentro do Cash/margem
    // da conta — somar também contaria o mesmo dinheiro duas vezes.
    async function atualizarTudoJunto() {
        const el = document.getElementById('tjValorUSD');
        if (!el) return; // secção ainda não está no DOM

        const [eurUsd, usdBrl] = await Promise.all([
            buscarPrecoYahoo('EURUSD=X'),
            buscarPrecoYahoo('USDBRL=X')
        ]);
        const taxaEurUsd = (eurUsd && eurUsd.preco) ? eurUsd.preco : null;
        const taxaUsdBrl = (usdBrl && usdBrl.preco) ? usdBrl.preco : null;

        const cash = obterCashTastytrade();
        const rendaFixaEmUSD = taxaEurUsd ? (ultimoCapitalRF * taxaEurUsd) : ultimoCapitalRF;
        const totalUSD = cash + ultimoValorAplicado + rendaFixaEmUSD;

        el.textContent = '$' + totalUSD.toFixed(2);

        const elEur = document.getElementById('tjValorEUR');
        const elBrl = document.getElementById('tjValorBRL');
        const elTaxa = document.getElementById('tjTaxaInfo');

        elEur.textContent = taxaEurUsd
            ? '≈ ' + fmtEUR(totalUSD / taxaEurUsd)
            : '≈ €?? (câmbio EUR indisponível agora)';

        elBrl.textContent = taxaUsdBrl
            ? '≈ R$' + (totalUSD * taxaUsdBrl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '≈ R$?? (câmbio BRL indisponível agora)';

        elTaxa.textContent = (taxaEurUsd && taxaUsdBrl)
            ? `Câmbio ao vivo: 1€ = $${taxaEurUsd.toFixed(4)} · $1 = R$${taxaUsdBrl.toFixed(4)}`
            : 'Não foi possível obter as taxas de câmbio agora — a tentar de novo no próximo minuto.';
    }



    // ===== CASH TASTYTRADE (SALDO MANUAL, SEM API PÚBLICA) =====
    function carregarCashTastytrade() {
        const v = localStorage.getItem('agenda_cash_tastytrade');
        const el = document.getElementById('cashTastytrade');
        if (el) el.value = v !== null ? v : '';
    }
    function salvarCashTastytrade() {
        const el = document.getElementById('cashTastytrade');
        if (!el) return;
        localStorage.setItem('agenda_cash_tastytrade', el.value || '0');
        calcularTotaisConsolidados();
    }
    function obterCashTastytrade() {
        return parseNumeroFlexivel(localStorage.getItem('agenda_cash_tastytrade'));
    }

    // ===== TOTAIS CONSOLIDADOS (IBKR + TASTYTRADE) =====
    async function calcularTotaisConsolidados() {
        const elAplicado = document.getElementById('totalValorAplicado');
        const elRetido = document.getElementById('totalValorRetido');
        const elGeral = document.getElementById('totalValorGeral');
        const elAtualizado = document.getElementById('totaisUltimaAtualizacao');
        if (!elAplicado || !elRetido || !elGeral) return;

        // Ações e Opções pedidas todas ao mesmo tempo (antes eram uma a uma, em fila —
        // com 7 posições isso podia significar 7x o tempo de espera de um único pedido).
        const [resultadosAcoes, resultadosOpcoes] = await Promise.all([
            Promise.all(POSICOES_CONSOLIDADAS.acoes.map(pos => buscarPrecoYahoo(pos.ticker))),
            Promise.all(POSICOES_CONSOLIDADAS.opcoesVendidas.map(pos => buscarPrecoOpcaoYahoo(pos)))
        ]);

        // Valor Aplicado (Ações): quantidade x preço atual
        let valorAplicado = 0;
        let falhaAcao = false;
        POSICOES_CONSOLIDADAS.acoes.forEach((pos, i) => {
            const dados = resultadosAcoes[i];
            if (dados && dados.preco) valorAplicado += dados.preco * pos.qtd;
            else falhaAcao = true;
        });

        // Valor Retido (Opções): preço atual de recompra x contratos x 100
        let valorRetido = 0;
        let falhaOpcao = false;
        POSICOES_CONSOLIDADAS.opcoesVendidas.forEach((pos, i) => {
            const dados = resultadosOpcoes[i];
            if (dados && dados.preco !== null && dados.preco !== undefined) {
                valorRetido += dados.preco * pos.contratos * 100;
            } else falhaOpcao = true;
        });

        const valorGeral = valorAplicado - valorRetido + obterCashTastytrade();

        elAplicado.innerText = `$${valorAplicado.toFixed(2)}`;
        elRetido.innerText = `$${valorRetido.toFixed(2)}`;
        elGeral.innerText = `$${valorGeral.toFixed(2)}`;

        if (elAtualizado) {
            const hora = new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
            let aviso = '';
            if (falhaAcao || falhaOpcao) aviso = ' · ⚠️ Algum preço usou o último valor conhecido';
            elAtualizado.innerText = `Atualizado às ${hora}${aviso}`;
        }

        ultimoValorAplicado = valorAplicado;
        ultimoValorRetido = valorRetido;
        if (typeof atualizarCategoriasCarteira === 'function') atualizarCategoriasCarteira();
    }

    function iniciarTotaisLoop() {
        if (totaisLoop) clearInterval(totaisLoop);
        calcularTotaisConsolidados();
        totaisLoop = setInterval(calcularTotaisConsolidados, 60000);
    }

    // Ticker rotativo removido — os preços em tempo real agora vivem só na aba WATCHLIST.
