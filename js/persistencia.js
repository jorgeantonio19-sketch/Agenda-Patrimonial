// persistencia.js — localStorage e nome do proprietário

    // ===== PERSISTÊNCIA =====
    function persistirDadosAgenda(dados) {
        const s = JSON.stringify(dados);
        localStorage.setItem('agenda_operacional_data', s);
        localStorage.setItem('agenda_backup_seguranca', s);
    }

    // ===== NOME PROPRIETÁRIO =====
    function carregarNomeProprietario() {
        const n = localStorage.getItem('agenda_owner_name');
        const h = document.getElementById('nomeProprietario');
        const f = document.getElementById('footerNome');
        if (n && n.trim()) { h.innerText = n; f.innerText = n; }
        else { h.innerText = "CLIQUE PARA DIGITAR SEU NOME"; f.innerText = "Jorge Costa"; }
    }
    function alterarNomeDono() {
        const atual = localStorage.getItem('agenda_owner_name') || "";
        const novo = prompt("Digite o seu nome para personalizar a Agenda:", atual);
        if (novo !== null) { localStorage.setItem('agenda_owner_name', novo.trim()); carregarNomeProprietario(); }
    }

    // ===== MOEDA DE EXIBIÇÃO =====
    function selecionarMoeda(moeda) {
        moedaExibicao = moeda;
        localStorage.setItem('agenda_moeda_exibicao', moeda);
        atualizarBotoesMoeda();
        // Reprocessa tudo que mostra valores para refletir a nova moeda na hora.
        if (typeof processarAgenda === 'function') processarAgenda();
        if (typeof calcularTotaisConsolidados === 'function') calcularTotaisConsolidados();
        if (typeof renderizarRendaFixa === 'function') renderizarRendaFixa();
    }
    function atualizarBotoesMoeda() {
        ['USD','EUR','BRL'].forEach(m => {
            const btn = document.getElementById('moedaBtn' + m);
            if (btn) btn.classList.toggle('active', m === moedaExibicao);
        });
    }
