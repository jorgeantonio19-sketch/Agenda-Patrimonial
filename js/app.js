// app.js — navegação de abas e arranque da aplicação (carrega por último)

    // ===== ABAS =====
    function mudarAba(aba) {
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('aba-' + aba).classList.add('active');
        const idx = ['carteira','historico','watchlist','menu'].indexOf(aba);
        document.querySelectorAll('.tab-btn')[idx].classList.add('active');
        const scrollArea = document.querySelector('.app-scroll');
        if (scrollArea) scrollArea.scrollTop = 0;
        if (aba === 'carteira') { desenharPizza(); calcularTotaisConsolidados(); renderizarRendaFixa(); }
        if (aba === 'watchlist') { iniciarWatchlistLoop(); }
    }

    // ===== MODAL DE REGISTO (botão + do cabeçalho) =====
    function abrirModalRegisto() {
        document.getElementById('modalRegisto').classList.add('active');
    }
    function fecharModalRegisto() {
        document.getElementById('modalRegisto').classList.remove('active');
    }

    // ===== MODAL DE GLOSSÁRIO (aba Menu) =====
    function abrirModalGlossario() {
        document.getElementById('modalGlossario').classList.add('active');
    }
    function fecharModalGlossario() {
        document.getElementById('modalGlossario').classList.remove('active');
    }

    // ===== ARRANQUE =====
    window.onclick = function(event) {
        if (!event.target.matches('.btn-instrumento-trigger') && !event.target.closest('.btn-instrumento-container')) {
            const dd = document.getElementsByClassName("popup-menu");
            for (let i=0; i<dd.length; i++) { if (dd[i].style.display==='flex') dd[i].style.display='none'; }
        }
    }

    let alterouLegado = false;
    agenda.forEach(item => { if (!item.id) { item.id = Date.now()+Math.floor(Math.random()*1000); alterouLegado=true; } });
    if (alterouLegado) persistirDadosAgenda(agenda);
    if (agenda.length > 0 && !localStorage.getItem('agenda_backup_seguranca')) localStorage.setItem('agenda_backup_seguranca', JSON.stringify(agenda));

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));

        // NOVO: quando o sw.js instala uma versão nova (CACHE_NAME mudou) e assume
        // o controlo da página, ele avisa por postMessage — aqui recarregamos
        // sozinhos em vez de obrigar a fechar e reabrir a app 2 vezes para ver
        // os ficheiros JS atualizados.
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_ATUALIZADO') {
                window.location.reload();
            }
        });
    }

    carregarNomeProprietario();
    atualizarListaFiltros('TODOS');
    processarAgenda();

    // Data automática no arranque
    document.getElementById('dataOp').value = new Date().toISOString().split('T')[0];

    // Botão instrumento — sempre mostra "Instrumento" ao abrir
    const triggerPrincipal = document.getElementById('idBtnInstrumentoTrigger');
    triggerPrincipal.classList.remove('btn-trigger-acao','btn-trigger-opcao');
    triggerPrincipal.classList.add('btn-trigger-padrao');
    triggerPrincipal.innerHTML = "🎸 Instrumento";
    const instSalvo = localStorage.getItem('agenda_instrumento_ativo') || 'OPCAO';
    document.getElementById('instrumento').value = instSalvo;
    toggleOptionFields();

    // Iniciar ticker de preços
    iniciarTickerLoop();

    // Iniciar totais consolidados (IBKR + Tastytrade) — atualiza a cada 1 minuto
    carregarCashTastytrade();
    iniciarTotaisLoop();

    // Renda Fixa
    renderizarRendaFixa();

    // Moeda de exibição — carrega a escolha salva e busca as taxas de câmbio.
    // As telas acima já renderizaram em USD (fallback); assim que a taxa chega,
    // tudo é redesenhado na moeda certa. Atualiza de novo a cada 1 minuto.
    atualizarBotoesMoeda();
    atualizarTaxasCambio().then(() => {
        atualizarBotoesMoeda();
        processarAgenda();
        calcularTotaisConsolidados();
        renderizarRendaFixa();
    });
    setInterval(atualizarTaxasCambio, 60000);
