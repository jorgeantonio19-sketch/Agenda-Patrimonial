// estado.js — variáveis globais e configuração de posições

    let agenda = JSON.parse(localStorage.getItem('agenda_operacional_data')) || [];
    let idItemEditando = null;
    let cachePrecos = {};
    let cachePrecosOpcoes = {};
    let totaisLoop = null;

    // ===== MOEDA DE EXIBIÇÃO =====
    // Moeda em que os valores agregados são mostrados na tela (não altera o que
    // está gravado — a Agenda continua sempre guardada internamente em USD/EUR
    // conforme a origem). 'USD' | 'EUR' | 'BRL'.
    let moedaExibicao = localStorage.getItem('agenda_moeda_exibicao') || 'USD';
    // Cache das taxas de câmbio ao vivo (Yahoo Finance), partilhado por toda a app.
    let taxasCambio = { EURUSD: null, USDBRL: null };

    // ===== CONFIG: POSIÇÕES CONSOLIDADAS (IBKR + TASTYTRADE) =====
    // "acoes" agora é AUTOMÁTICO — calculado direto do Histórico da Agenda
    // (função calcularAcoesDetidas() em agenda.js). Não precisa editar mais nada
    // aqui quando comprar/vender ações: só registar no Registo normalmente.
    //
    // "opcoesVendidas" (calls/puts vendidas retendo capital/garantia) continua
    // manual por enquanto — juntar rolagens/fechamentos parciais por strike e
    // vencimento automaticamente é mais complexo, fica pra uma próxima etapa.
    // Edite aqui sempre que abrir/fechar/rolar uma opção vendida.
    // tipo: 'C' para CALL, 'P' para PUT. vencimento no formato AAAA-MM-DD.
    const POSICOES_CONSOLIDADAS = {
        opcoesVendidas: [
            { ticker: 'BEEM', strike: 1.5,  tipo: 'C', vencimento: '2026-08-21', contratos: 2 },
            { ticker: 'SABR', strike: 2,    tipo: 'C', vencimento: '2026-08-21', contratos: 2 },
            { ticker: 'SNDL', strike: 1.5,  tipo: 'C', vencimento: '2026-08-21', contratos: 4 },
            { ticker: 'F',    strike: 13.5, tipo: 'P', vencimento: '2026-08-14', contratos: 2 }
        ]
    };
