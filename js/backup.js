// backup.js — exportar CSV, backup mobile, importar, imprimir, limpar dados

    // ===== EXPORTAR PARA CSV/EXCEL =====
    function exportarCSV() {
        if (agenda.length === 0) { alert('Não existem dados para exportar.'); return; }
        const cabecalho = ['Data','Ativo','Instrumento','Tipo Opção','Direção','Preço/Strike','Qtd','Valor ($)','Prémio Fechamento ($)','Data Exercício'];
        const linhasOrdenadas = [...agenda].sort((a, b) => {
            const da = a.data.split('/').reverse().join('-');
            const db = b.data.split('/').reverse().join('-');
            return da.localeCompare(db);
        });
        const linhas = linhasOrdenadas.map(op => [
            op.data,
            op.ticker,
            op.instrumento === 'ACAO' ? 'AÇÃO' : 'OPÇÃO',
            op.instrumento === 'OPCAO' ? op.tipoOpcao : '',
            op.direcao,
            op.preco.toFixed(2),
            op.qtdOriginal,
            op.valorEfeito.toFixed(2),
            (op.premioFechamento !== null && op.premioFechamento !== undefined) ? op.premioFechamento.toFixed(2) : '',
            op.dataExercicio ? op.dataExercicio.split('-').reverse().join('/') : ''
        ]);
        let csv = cabecalho.join(';') + '\n' + linhas.map(l => l.join(';')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agenda_patrimonial_' + new Date().toISOString().split('T')[0] + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }


    // ===== BACKUP =====
    function exportarBackupMobile() {
        if (agenda.length === 0 && rendaFixa.length === 0 && watchlist.length === 0) {
            alert('Não existem dados para exportar.');
            return;
        }

        // Backup completo: junta tudo o que a app guarda separadamente
        // (antes só saía o "agenda", faltando Renda Fixa/Watchlist/Cash/Nome).
        const backupCompleto = {
            versao: 2,
            exportadoEm: new Date().toISOString(),
            agenda: agenda,
            rendaFixa: rendaFixa,
            watchlist: watchlist,
            cashTastytrade: localStorage.getItem('agenda_cash_tastytrade') || '',
            ownerName: localStorage.getItem('agenda_owner_name') || ''
        };

        const json = JSON.stringify(backupCompleto, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'agenda_patrimonial_backup_' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        // Mantém também o código na caixa de texto, como alternativa para copiar/colar.
        const c = document.getElementById('zonaExportacao');
        document.getElementById('txtBackup').value = json;
        c.style.display = 'block';
    }
    function copiarTextoBackup() {
        const c = document.getElementById('txtBackup'); c.select(); c.setSelectionRange(0,99999);
        try { navigator.clipboard.writeText(c.value); alert('Código copiado!'); document.getElementById('zonaExportacao').style.display='none'; }
        catch(e) { alert('Copie manualmente o texto selecionado.'); }
    }
    function importarBackup() { document.getElementById('fileInput').click(); }
    function processarArquivoBackup(event) {
        const f = event.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = function(e) {
            try {
                const d = JSON.parse(e.target.result);

                if (Array.isArray(d)) {
                    // Formato antigo: só o registo de operações (sem Renda Fixa/Watchlist/Cash)
                    if (confirm('Backup antigo detetado (só o Registo — sem Renda Fixa/Watchlist/Cash). O histórico atual será substituído. Continuar?')) {
                        agenda = d; agenda.forEach(i => { if(!i.id) i.id = Date.now()+Math.floor(Math.random()*1000); });
                        persistirDadosAgenda(agenda); idItemEditando = null;
                        document.getElementById('zonaExportacao').style.display='none';
                        atualizarListaFiltros('TODOS'); processarAgenda(); iniciarTickerLoop();
                        alert('Backup restaurado com sucesso!');
                    }
                } else if (d && typeof d === 'object' && Array.isArray(d.agenda)) {
                    // Formato completo (v2): Registo + Renda Fixa + Watchlist + Cash + Nome
                    if (confirm('Ao importar, TODOS os dados atuais (Registo, Renda Fixa, Watchlist, Cash, Nome) serão substituídos pelo backup. Continuar?')) {
                        agenda = d.agenda;
                        agenda.forEach(i => { if(!i.id) i.id = Date.now()+Math.floor(Math.random()*1000); });
                        persistirDadosAgenda(agenda);

                        rendaFixa = Array.isArray(d.rendaFixa) ? d.rendaFixa : [];
                        persistirRendaFixa();

                        watchlist = Array.isArray(d.watchlist) ? d.watchlist : [];
                        persistirWatchlist();

                        if (d.cashTastytrade !== undefined) localStorage.setItem('agenda_cash_tastytrade', d.cashTastytrade);
                        if (d.ownerName) localStorage.setItem('agenda_owner_name', d.ownerName);

                        idItemEditando = null;
                        document.getElementById('zonaExportacao').style.display='none';
                        atualizarListaFiltros('TODOS'); processarAgenda(); iniciarTickerLoop();
                        carregarNomeProprietario(); carregarCashTastytrade();
                        renderizarRendaFixa();
                        if (document.getElementById('watchlistContainer')) renderizarWatchlist();
                        calcularTotaisConsolidados();
                        alert('Backup completo restaurado com sucesso!');
                    }
                } else {
                    alert('Ficheiro inválido.');
                }
            } catch(e) { alert('Erro ao ler o ficheiro.'); }
        };
        r.readAsText(f);
    }
    function imprimirSeguro() { if (agenda.length===0) { alert('Sem dados para imprimir.'); return; } mudarAba('historico'); setTimeout(()=>window.print(),300); }
    function limparTudo() {
        const nome = localStorage.getItem('agenda_owner_name') || "Proprietário";
        if (confirm('Tem a certeza que deseja apagar todo o histórico?')) {
            if (confirm(nome + ', confirma a eliminação definitiva?')) {
                agenda = []; idItemEditando = null;
                localStorage.removeItem('agenda_operacional_data');
                document.getElementById('zonaExportacao').style.display='none';
                atualizarListaFiltros('TODOS'); processarAgenda(); iniciarTickerLoop();
                alert('Dados limpos. Backup de emergência preservado.');
            }
        }
    }
    function restaurarBackupOculto() {
        const d = localStorage.getItem('agenda_backup_seguranca');
        if (!d) { alert('Nenhum backup automático encontrado.'); return; }
        const b = JSON.parse(d);
        if (b.length === 0) { alert('Backup automático vazio.'); return; }
        if (confirm(`Encontrámos ${b.length} operações em backup. Restaurar?`)) {
            agenda = b; localStorage.setItem('agenda_operacional_data', d);
            idItemEditando = null; atualizarListaFiltros('TODOS'); processarAgenda(); iniciarTickerLoop();
            alert('Histórico recuperado da Caixa Negra!');
        }
    }
