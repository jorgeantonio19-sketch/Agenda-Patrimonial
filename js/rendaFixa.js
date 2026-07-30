// rendaFixa.js — módulo de Renda Fixa

    // ===== RENDA FIXA =====
    // Interpreta valores digitados tanto no formato PT/EU (ponto = milhares, vírgula = decimal,
    // ex: "2.096,50") como no formato americano (vírgula = milhares, ponto = decimal, ex:
    // "2,096.50", como aparece nas apps de corretoras dos EUA) — sem depender do type="number"
    // do navegador, que só entende "." como decimal e distorcia valores como "2.096" ou "2,096".
    function parseNumeroFlexivel(str) {
        if (str === null || str === undefined) return 0;
        let s = String(str).trim();
        if (s === '') return 0;

        const temVirgula = s.includes(',');
        const temPonto = s.includes('.');

        if (temVirgula && temPonto) {
            // Os dois símbolos aparecem: o que estiver mais perto do fim é o decimal,
            // o outro é sempre separador de milhares (funciona em PT "2.096,50" e US "2,096.50")
            if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
                s = s.replace(/\./g, '').replace(',', '.');
            } else {
                s = s.replace(/,/g, '');
            }
        } else if (temVirgula || temPonto) {
            const sep = temVirgula ? ',' : '.';
            const partes = s.split(sep);
            if (partes.length > 2) {
                // Símbolo repetido (ex: "12.345.678"): só pode ser separador de milhares
                s = partes.join('');
            } else if (partes[1].length === 3) {
                // Uma única ocorrência com 3 dígitos a seguir = milhares (ex: "2.096" ou "2,096" = 2096)
                s = partes.join('');
            } else {
                // 1 ou 2 dígitos a seguir = decimal normal (ex: "12.50" ou "12,50" = 12,50)
                s = partes.join('.');
            }
        }

        const v = parseFloat(s);
        return isNaN(v) ? 0 : v;
    }

    let rendaFixa = JSON.parse(localStorage.getItem('agenda_renda_fixa')) || [];

    function persistirRendaFixa() {
        localStorage.setItem('agenda_renda_fixa', JSON.stringify(rendaFixa));
    }

    function fmtEUR(v) {
        // Capital da Renda Fixa é sempre guardado em EUR; converte pra moeda
        // selecionada no seletor (Watchlist) na hora de exibir.
        return formatarMoeda(v || 0, 'EUR');
    }

    // Valor acumulado (capital + juros) de uma posição numa data específica, com juro composto diário
    function valorRendaFixaNaData(pos, dataRef) {
        const inicio = new Date(pos.dataInicio + 'T00:00:00');
        const dias = Math.max(0, (dataRef - inicio) / 86400000); // fracionário — sem floor, para curva suave
        const taxaDiaria = Math.pow(1 + (pos.apy / 100), 1 / 365) - 1;
        return pos.capital * Math.pow(1 + taxaDiaria, dias);
    }

    function adicionarRendaFixa() {
        const corretora = document.getElementById('rfCorretora').value.trim();
        const capital = parseNumeroFlexivel(document.getElementById('rfCapital').value);
        const apy = parseFloat(document.getElementById('rfApy').value);
        const dataInicio = document.getElementById('rfDataInicio').value;

        if (!corretora || !capital || capital <= 0 || !apy || apy < 0 || !dataInicio) {
            alert('Preencha corretora, capital, taxa anual (APY) e data de início corretamente.');
            return;
        }

        rendaFixa.push({ id: Date.now(), corretora, capital, apy, dataInicio });
        persistirRendaFixa();

        document.getElementById('rfCorretora').value = '';
        document.getElementById('rfCapital').value = '';
        document.getElementById('rfApy').value = '';
        document.getElementById('rfDataInicio').value = '';

        renderizarRendaFixa();
    }

    function removerRendaFixa(id) {
        if (!confirm('Remover esta posição de Renda Fixa?')) return;
        rendaFixa = rendaFixa.filter(p => p.id !== id);
        persistirRendaFixa();
        renderizarRendaFixa();
    }

    function renderizarRendaFixa() {
        const lista = document.getElementById('rfListaContainer');
        if (!lista) return; // secção ainda não está no DOM

        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        let capitalTotal = 0, valorAtualTotal = 0, valorMesPassado = 0;
        const umMesAtras = new Date(hoje); umMesAtras.setMonth(umMesAtras.getMonth() - 1);

        lista.innerHTML = '';
        if (rendaFixa.length === 0) {
            lista.innerHTML = '<div class="rf-empty">Nenhuma posição de Renda Fixa registada ainda.</div>';
        } else {
            rendaFixa.slice().sort((a,b) => new Date(b.dataInicio) - new Date(a.dataInicio)).forEach(pos => {
                const valorAtual = valorRendaFixaNaData(pos, hoje);
                const juros = valorAtual - pos.capital;
                const div = document.createElement('div');
                div.className = 'rf-item';
                div.innerHTML = `
                    <div class="rf-item-top">
                        <span class="rf-item-corretora">🏦 ${pos.corretora}</span>
                        <span class="rf-item-apy">${pos.apy.toFixed(2)}% APY</span>
                    </div>
                    <div class="rf-item-row"><span>Capital</span><span>${fmtEUR(pos.capital)}</span></div>
                    <div class="rf-item-row"><span>Início</span><span>${new Date(pos.dataInicio+'T00:00:00').toLocaleDateString('pt-PT')}</span></div>
                    <div class="rf-item-row"><span>Juros acumulados</span><span class="rf-item-juros">+${fmtEUR(juros)}</span></div>
                    <div class="rf-item-row" style="margin-top:6px;"><span></span><button class="rf-del-btn" onclick="removerRendaFixa(${pos.id})">🗑️ Remover</button></div>
                `;
                lista.appendChild(div);
            });
        }

        rendaFixa.forEach(pos => {
            capitalTotal += pos.capital;
            valorAtualTotal += valorRendaFixaNaData(pos, hoje);
            valorMesPassado += valorRendaFixaNaData(pos, umMesAtras);
        });

        const jurosTotal = valorAtualTotal - capitalTotal;
        const lucroMes = valorAtualTotal - valorMesPassado;
        const taxaMedia = capitalTotal > 0
            ? rendaFixa.reduce((s,p) => s + p.apy * p.capital, 0) / capitalTotal
            : 0;
        const jurosDiarios = rendaFixa.reduce((s,p) => {
            const taxaDiaria = Math.pow(1 + (p.apy/100), 1/365) - 1;
            return s + valorRendaFixaNaData(p, hoje) * taxaDiaria;
        }, 0);

        document.getElementById('rfLucroMes').textContent = fmtEUR(Math.max(0, lucroMes));
        document.getElementById('rfLucroTotal').textContent = fmtEUR(Math.max(0, jurosTotal));
        document.getElementById('rfCapitalTotal').textContent = fmtEUR(capitalTotal);
        document.getElementById('rfTaxaMedia').textContent = taxaMedia.toFixed(2) + '%';
        document.getElementById('rfJuroDiario').textContent = formatarMoeda(jurosDiarios, 'EUR', 3);

        // A Renda Fixa e as Ações/Opções entram no cartão geral de categorias.
        ultimoCapitalRF = capitalTotal;
        ultimoJurosRF = jurosTotal;
        atualizarCategoriasCarteira();
    }
