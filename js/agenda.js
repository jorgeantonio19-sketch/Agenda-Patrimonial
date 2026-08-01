// agenda.js — núcleo: instrumento, formulário, gravar, editar, filtrar, P&L, processar

    // ===== INSTRUMENTO =====
    function toggleInstrumentoPopup(event) {
        if (event) event.stopPropagation();
        const popup = document.getElementById('popupInstrumento');
        popup.style.display = (popup.style.display === 'flex') ? 'none' : 'flex';
    }
    function selecionarInstrumento(tipo) {
        document.getElementById('instrumento').value = tipo;
        localStorage.setItem('agenda_instrumento_ativo', tipo);
        const btnAcao = document.getElementById('popBtnAcao');
        const btnOpcao = document.getElementById('popBtnOpcao');
        const trigger = document.getElementById('idBtnInstrumentoTrigger');
        trigger.classList.remove('btn-trigger-padrao','btn-trigger-acao','btn-trigger-opcao');
        if (tipo === 'ACAO') {
            btnAcao.classList.add('active-acao'); btnOpcao.classList.remove('active-opcao');
            trigger.innerHTML = "📊 AÇÃO"; trigger.classList.add('btn-trigger-acao');
        } else if (tipo === 'OPCAO') {
            btnAcao.classList.remove('active-acao'); btnOpcao.classList.add('active-opcao');
            trigger.innerHTML = "🎲 OPÇÃO"; trigger.classList.add('btn-trigger-opcao');
        } else {
            btnAcao.classList.remove('active-acao'); btnOpcao.classList.remove('active-opcao');
            trigger.innerHTML = "🎸 Instrumento"; trigger.classList.add('btn-trigger-padrao');
        }
        document.getElementById('popupInstrumento').style.display = 'none';
        toggleOptionFields();
    }

    // ===== ANIMAIS =====
    function setDirecaoPorAnimal(d) {
        document.getElementById('direcao').value = d;
        atualizarEstiloDirecao(); ajustarLabelsDinamicos();
    }
    function atualizarEstiloDirecao() {
        const dir = document.getElementById('direcao').value;
        const sel = document.getElementById('direcao');
        const bt = document.getElementById('btnTouro');
        const bu = document.getElementById('btnUrso');
        if (dir === 'VENDA') { sel.className = "direcao-balao direcao-venda"; bu.classList.add('active'); bt.classList.remove('active'); }
        else { sel.className = "direcao-balao direcao-compra"; bt.classList.add('active'); bu.classList.remove('active'); }
    }

    // ===== PRÉMIO =====
    function calcularPremioUnitarioDinamico() {
        if (document.getElementById('instrumento').value !== 'OPCAO') return;
        const qtd = parseInt(document.getElementById('qtdAcoes').value) || 0;
        const fin = parseFloat(document.getElementById('valorFinanceiro').value) || 0;
        const box = document.getElementById('boxPremioUnitario');
        box.innerText = (qtd > 0 && fin >= 0) ? `$${(fin/qtd).toFixed(2)} /ação` : `$0.00 /ação`;
    }

    // ===== CAMPOS DINÂMICOS =====
    function toggleOptionFields() {
        const inst = document.getElementById('instrumento').value;
        const ccp = document.getElementById('containerCallPut');
        const cpmd = document.getElementById('containerPrecoMedioData');
        const cvo = document.getElementById('containerVagaOpcao');
        const cf = document.getElementById('containerFinanceiro');
        const cd = document.getElementById('containerDirecao');
        const cde = document.getElementById('containerDataExercicio');
        const cpf = document.getElementById('containerPremioFechamento');
        const so = document.getElementById('tipoOpcao');
        if (inst === 'ACAO') {
            ccp.style.display='none'; cvo.style.display='none'; cpmd.style.display='flex'; so.disabled=true;
            cde.style.display='none'; cpf.style.display='none';
            cd.classList.add('span-full'); cf.classList.add('span-full');
            if (!idItemEditando) document.getElementById('direcao').value = 'COMPRA';
        } else {
            ccp.style.display='flex'; cpmd.style.display='none'; cvo.style.display='flex'; so.disabled=false;
            cde.style.display='flex'; cpf.style.display='flex';
            cd.classList.remove('span-full'); cf.classList.remove('span-full');
            if (!idItemEditando) document.getElementById('direcao').value = 'VENDA';
            calcularPremioUnitarioDinamico();
        }
        atualizarEstiloDirecao(); ajustarLabelsDinamicos();
    }

    // ===== DATA DO EXERCÍCIO (DIAS RESTANTES) =====
    function atualizarDiasExercicio() {
        const val = document.getElementById('dataExercicio').value;
        const info = document.getElementById('infoDiasExercicio');
        if (!val) { info.innerText = ''; return; }
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const dExp = new Date(val + 'T00:00:00');
        const diffDias = Math.round((dExp - hoje) / 86400000);
        if (diffDias > 1) info.innerHTML = `⏳ Faltam <b style="color:#34d399;">${diffDias} dias</b> para a expiração`;
        else if (diffDias === 1) info.innerHTML = `⏳ Falta <b style="color:#fbbf24;">1 dia</b> para a expiração`;
        else if (diffDias === 0) info.innerHTML = `⚠️ <b style="color:#fbbf24;">Expira hoje!</b>`;
        else info.innerHTML = `🔴 <b style="color:#f87171;">Expirada há ${Math.abs(diffDias)} dia(s)</b>`;
    }
    function ajustarLabelsDinamicos() {
        const inst = document.getElementById('instrumento').value;
        const dir = document.getElementById('direcao').value;
        const lf = document.getElementById('labelFinanceiro');
        const ifin = document.getElementById('valorFinanceiro');
        const lp = document.getElementById('labelPrecoRef');
        const lv = document.getElementById('labelVagaDinamica');
        if (inst === 'ACAO') { lp.innerText="Preço da Ação ($)"; lf.innerText="Valor Financeiro ($)"; ifin.style.color="#f8fafc"; }
        else {
            lp.innerText="Preço Ref. Strike ($)";
            if (dir === 'VENDA') { lf.innerText="Prémio Recebido ($)"; lv.innerText="Prémio Rec. / Ação ($)"; ifin.style.color="#34d399"; }
            else { lf.innerText="Prémio Pago ($)"; lv.innerText="Prémio Pago / Ação ($)"; ifin.style.color="#f87171"; }
        }
    }


    // ===== GRAVAR =====
    document.getElementById('agendaForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const ticker = document.getElementById('ativo').value.toUpperCase().trim();
        const dataRaw = document.getElementById('dataOp').value;
        const dataFormatada = dataRaw.split('-').reverse().join('/');
        const direcao = document.getElementById('direcao').value;
        const instrumento = document.getElementById('instrumento').value;
        const tipoOpcao = instrumento === 'OPCAO' ? document.getElementById('tipoOpcao').value : 'N/A';
        const preco = parseFloat(document.getElementById('precoAtivo').value) || 0;
        const qtd = parseInt(document.getElementById('qtdAcoes').value) || 0;
        const valorBruto = parseFloat(document.getElementById('valorFinanceiro').value) || 0;
        const precoMedioData = instrumento === 'ACAO' ? (parseFloat(document.getElementById('precoMedioData').value) || 0) : 0;
        const dataExercicio = instrumento === 'OPCAO' ? document.getElementById('dataExercicio').value : '';
        const premioFechamentoRaw = instrumento === 'OPCAO' ? document.getElementById('premioFechamento').value : '';
        const premioFechamento = premioFechamentoRaw !== '' ? parseFloat(premioFechamentoRaw) : null;

        let valorEfeito = 0, qtdEfeito = 0;
        if (instrumento === 'OPCAO') {
            valorEfeito = (direcao === 'VENDA') ? -valorBruto : valorBruto; qtdEfeito = 0;
        } else {
            if (direcao === 'COMPRA') { valorEfeito = valorBruto; qtdEfeito = qtd; }
            else { valorEfeito = -valorBruto; qtdEfeito = -qtd; }
        }

        if (idItemEditando !== null) {
            const idx = agenda.findIndex(i => i.id === idItemEditando);
            if (idx !== -1) {
                agenda[idx] = { ...agenda[idx], ticker, data: dataFormatada, direcao, instrumento, tipoOpcao, preco, qtdOriginal: qtd, qtdEfeito, valorEfeito, precoMedioData, dataExercicio, premioFechamento };
            }
            idItemEditando = null;
            document.getElementById('btnSubmitForm').innerText = "Gravar na Agenda";
            document.getElementById('btnSubmitForm').classList.remove('btn-edit-mode');
            document.getElementById('tituloFormulario').innerText = "✍️ Registar Movimento";
        } else {
            agenda.push({ id: Date.now() + Math.floor(Math.random()*1000), ticker, data: dataFormatada, direcao, instrumento, tipoOpcao, preco, qtdOriginal: qtd, qtdEfeito, valorEfeito, precoMedioData, dataExercicio, premioFechamento });
        }

        persistirDadosAgenda(agenda);
        document.getElementById('zonaExportacao').style.display = 'none';
        atualizarListaFiltros();
        processarAgenda();
        document.getElementById('agendaForm').reset();

        // Data automática após reset
        document.getElementById('dataOp').value = new Date().toISOString().split('T')[0];
        document.getElementById('infoDiasExercicio').innerText = '';

        // Botão instrumento volta ao padrão
        const trigBtn = document.getElementById('idBtnInstrumentoTrigger');
        trigBtn.classList.remove('btn-trigger-acao','btn-trigger-opcao');
        trigBtn.classList.add('btn-trigger-padrao');
        trigBtn.innerHTML = '🎸 Instrumento';

        iniciarTickerLoop();
        fecharModalRegisto();
    });

    // ===== EDIÇÃO =====
    function prepararEdicao(idUnico) {
        const item = agenda.find(op => op.id === idUnico);
        if (!item) return;
        idItemEditando = item.id;
        const partes = item.data.split('/');
        if (partes.length === 3) document.getElementById('dataOp').value = `${partes[2]}-${partes[1]}-${partes[0]}`;
        document.getElementById('ativo').value = item.ticker;
        selecionarInstrumento(item.instrumento);
        if (item.instrumento === 'OPCAO') {
            document.getElementById('tipoOpcao').value = item.tipoOpcao;
            document.getElementById('dataExercicio').value = item.dataExercicio || '';
            document.getElementById('premioFechamento').value = (item.premioFechamento !== null && item.premioFechamento !== undefined) ? item.premioFechamento : '';
            atualizarDiasExercicio();
        } else document.getElementById('precoMedioData').value = item.precoMedioData || 0;
        document.getElementById('direcao').value = item.direcao;
        document.getElementById('precoAtivo').value = item.preco;
        document.getElementById('qtdAcoes').value = item.qtdOriginal;
        document.getElementById('valorFinanceiro').value = Math.abs(item.valorEfeito);
        atualizarEstiloDirecao(); ajustarLabelsDinamicos();
        if (item.instrumento === 'OPCAO') calcularPremioUnitarioDinamico();
        document.getElementById('tituloFormulario').innerText = "✏️ Modo de Edição Ativo";
        document.getElementById('btnSubmitForm').innerText = "Atualizar Movimento";
        document.getElementById('btnSubmitForm').classList.add('btn-edit-mode');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        abrirModalRegisto();
    }

    function excluirItem(idUnico) {
        if (confirm('Tem a certeza que deseja eliminar esta operação?')) {
            agenda = agenda.filter(i => i.id !== idUnico);
            persistirDadosAgenda(agenda);
            if (idItemEditando === idUnico) {
                idItemEditando = null;
                document.getElementById('agendaForm').reset();
                document.getElementById('dataOp').value = new Date().toISOString().split('T')[0];
                document.getElementById('btnSubmitForm').innerText = "Gravar na Agenda";
                document.getElementById('btnSubmitForm').classList.remove('btn-edit-mode');
                document.getElementById('tituloFormulario').innerText = "✍️ Registar Movimento";
            }
            document.getElementById('zonaExportacao').style.display = 'none';
            atualizarListaFiltros(); processarAgenda(); iniciarTickerLoop();
        }
    }

    // ===== FILTROS =====
    function atualizarListaFiltros(forcar = '') {
        const sel = document.getElementById('filtroAtivo');
        const anterior = forcar || sel.value || 'TODOS';
        const tickers = ['TODOS', ...new Set(agenda.map(i => i.ticker))];
        sel.innerHTML = '';
        tickers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t; opt.innerText = t;
            if (t === anterior) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    document.getElementById('filtroAtivo').addEventListener('change', function() {
        processarAgenda(); desenharPizza();
    });

    // ===== P&L REALIZADO (SÓ QUANDO PRÉMIO DE FECHAMENTO FOI PREENCHIDO) =====
    function gerarCelulaPnL(op) {
        if (op.instrumento !== 'OPCAO' || op.premioFechamento === null || op.premioFechamento === undefined || isNaN(op.premioFechamento)) {
            return '<td style="color:#475569;">—</td>';
        }
        const valorBruto = Math.abs(op.valorEfeito);
        const pnl = op.direcao === 'VENDA' ? (valorBruto - op.premioFechamento) : (op.premioFechamento - valorBruto);
        const cor = pnl >= 0 ? '#34d399' : '#f87171';
        const sinal = pnl >= 0 ? '+' : '-';
        return `<td style="color:${cor};font-weight:700;">${sinal}${formatarMoeda(Math.abs(pnl), 'USD')}</td>`;
    }

    // ===== CÉLULA DE EXPIRAÇÃO (SÓ OPÇÕES) =====
    function gerarCelulaExercicio(op) {
        if (op.instrumento !== 'OPCAO' || !op.dataExercicio) return '<td style="color:#475569;">—</td>';
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const dExp = new Date(op.dataExercicio + 'T00:00:00');
        const diffDias = Math.round((dExp - hoje) / 86400000);
        const dataDisplay = op.dataExercicio.split('-').reverse().join('/').substring(0,5);
        let cor;
        if (diffDias < 0) cor = '#f87171';
        else if (diffDias <= 3) cor = '#f87171';
        else if (diffDias <= 10) cor = '#fbbf24';
        else cor = '#34d399';
        const txt = diffDias < 0 ? `${dataDisplay} (exp.)` : `${dataDisplay} (${diffDias}d)`;
        return `<td style="color:${cor};font-weight:700;white-space:nowrap;">${txt}</td>`;
    }


    // ===== ALERTA DE OPÇÕES PRÓXIMAS DA EXPIRAÇÃO (≤3 dias) =====
    function atualizarAlertaExpiracao() {
        const alertaEl = document.getElementById('alertaExpiracao');
        if (!alertaEl) return;
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const proximas = agenda.filter(op => {
            if (op.instrumento !== 'OPCAO' || !op.dataExercicio) return false;
            const dExp = new Date(op.dataExercicio + 'T00:00:00');
            const diff = Math.round((dExp - hoje) / 86400000);
            return diff >= 0 && diff <= 3;
        }).sort((a,b) => a.dataExercicio.localeCompare(b.dataExercicio));

        if (proximas.length === 0) { alertaEl.style.display = 'none'; alertaEl.innerHTML = ''; return; }

        const itens = proximas.map(op => {
            const dExp = new Date(op.dataExercicio + 'T00:00:00');
            const diff = Math.round((dExp - hoje) / 86400000);
            const txtDias = diff === 0 ? 'HOJE' : (diff === 1 ? '1 dia' : `${diff} dias`);
            return `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
                <span><b style="color:#fbbf24;">${op.ticker}</b> ${op.tipoOpcao} · strike $${op.preco.toFixed(2)}</span>
                <span style="color:#f87171;font-weight:700;">${txtDias}</span>
            </div>`;
        }).join('');

        alertaEl.innerHTML = `<div style="font-weight:800;color:#f87171;font-size:12px;margin-bottom:4px;">⚠️ OPÇÕES PRÓXIMAS DA EXPIRAÇÃO</div>${itens}`;
        alertaEl.style.display = 'block';
    }

    // ===== PROCESSAR AGENDA =====
    function processarAgenda() {
        const filtro = document.getElementById('filtroAtivo').value || 'TODOS';
        const filtroTipoEl = document.getElementById('filtroTipo');
        const filtroTipo = filtroTipoEl ? filtroTipoEl.value : 'TODOS';
        document.getElementById('badgeAtivo').innerText = filtro;
        const corpo = document.getElementById('tabelaCorpo');
        corpo.innerHTML = '';
        let dineroPorAtivo = {}, acoesPorAtivo = {};

        // Ordena cronologicamente (mais antiga primeiro) para calcular os acumulados corretamente,
        // mesmo que uma operação com data antiga seja inserida depois de outras mais recentes.
        const agendaOrdenada = [...agenda].sort((a, b) => {
            const da = a.data.split('/').reverse().join('-');
            const db = b.data.split('/').reverse().join('-');
            if (da !== db) return da < db ? -1 : 1;
            return a.id - b.id;
        });

        let linhasHTML = [];
        agendaOrdenada.forEach(op => {
            const t = op.ticker;
            if (!dineroPorAtivo[t]) { dineroPorAtivo[t] = 0; acoesPorAtivo[t] = 0; }
            dineroPorAtivo[t] += op.valorEfeito;
            acoesPorAtivo[t] += op.qtdEfeito;
            const pmEvo = acoesPorAtivo[t] > 0 ? (dineroPorAtivo[t] / acoesPorAtivo[t]) : 0;
            const passaFiltroAtivo = (filtro === 'TODOS' || t === filtro);
            const passaFiltroTipo = (filtroTipo === 'TODOS')
                || (filtroTipo === 'ACAO' && op.instrumento === 'ACAO')
                || (filtroTipo === 'CALL' && op.instrumento === 'OPCAO' && op.tipoOpcao === 'CALL')
                || (filtroTipo === 'PUT' && op.instrumento === 'OPCAO' && op.tipoOpcao === 'PUT');
            if (passaFiltroAtivo && passaFiltroTipo) {
                const corValor = op.valorEfeito < 0 ? 'text-green' : '';
                const sinal = op.valorEfeito < 0 ? '+' : '-';
                let badgeCls = op.instrumento === 'ACAO' ? 'badge-acao' : (op.tipoOpcao === 'PUT' ? 'badge-put' : 'badge-call');
                let badgeTxt = op.instrumento === 'ACAO' ? 'AÇÃO' : op.tipoOpcao;
                let dirTxt = op.direcao === 'VENDA' ? '<span class="text-green">VD</span>' : '<span class="text-blue">CP</span>';
                let pmExib = op.instrumento === 'ACAO' && op.precoMedioData ? op.precoMedioData : pmEvo;
                linhasHTML.push(`<tr>
                    <td style="padding-left:8px;color:#64748b;">${op.data.substring(0,5)}</td>
                    <td class="text-amber"><b>${op.ticker}</b></td>
                    <td><span class="badge ${badgeCls}">${badgeTxt}</span></td>
                    <td>${dirTxt}</td>
                    <td>$${op.preco.toFixed(2)}</td>
                    <td>${op.qtdOriginal}</td>
                    <td class="${corValor}">${sinal}${formatarMoeda(Math.abs(op.valorEfeito), 'USD')}</td>
                    <td style="color:${acoesPorAtivo[t]>0?'#fbbf24':'#64748b'};font-weight:600;">${acoesPorAtivo[t]}</td>
                    <td class="text-green" style="font-weight:700;">$${pmExib.toFixed(3)}</td>
                    ${gerarCelulaExercicio(op)}
                    ${gerarCelulaPnL(op)}
                    <td class="col-acao" style="text-align:center;white-space:nowrap;">
                        <button onclick="prepararEdicao(${op.id})" class="btn-action btn-edit">Editar</button>
                        <button onclick="excluirItem(${op.id})" class="btn-action btn-delete">X</button>
                    </td></tr>`);
            }
        });
        // Exibe sempre as datas mais recentes no topo
        corpo.innerHTML = linhasHTML.reverse().join('');
        atualizarAlertaExpiracao();
        if (filtro === 'TODOS') {
            let total = 0; Object.keys(acoesPorAtivo).forEach(k => total += acoesPorAtivo[k]);
            document.getElementById('resumoTotalAplicado').innerText = "Selecione Ativo";
            document.getElementById('resumoTotalAplicado').style.color = "#94a3b8";
            document.getElementById('resumoTotalAcoes').innerText = total;
            document.getElementById('resumoPM').innerText = "Múltiplos Ativos";
            document.getElementById('resumoPM').style.color = "#94a3b8";
        } else {
            const din = dineroPorAtivo[filtro] || 0;
            const acoes = acoesPorAtivo[filtro] || 0;
            const pm = acoes > 0 ? (din / acoes) : 0;
            document.getElementById('resumoTotalAplicado').innerText = formatarMoeda(Math.max(0,din), 'USD');
            document.getElementById('resumoTotalAplicado').style.color = "#34d399";
            document.getElementById('resumoTotalAcoes').innerText = acoes;
            document.getElementById('resumoPM').innerText = `$${pm.toFixed(3)}`;
            document.getElementById('resumoPM').style.color = "#34d399";
        }
    }
