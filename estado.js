// estado.js — variáveis globais e configuração de posições

    let agenda = JSON.parse(localStorage.getItem('agenda_operacional_data')) || [];
    let idItemEditando = null;
    let cachePrecos = {};
    let cachePrecosOpcoes = {};
    let totaisLoop = null;

    // ===== CONFIG: POSIÇÕES CONSOLIDADAS (IBKR + TASTYTRADE) =====
    // Edite aqui sempre que abrir/fechar/rolar uma posição. "acoes" = posições compradas (long).
    // "opcoesVendidas" = calls/puts vendidas (short) que estão retendo capital/garantia.
    // tipo: 'C' para CALL, 'P' para PUT. vencimento no formato AAAA-MM-DD.
    const POSICOES_CONSOLIDADAS = {
        acoes: [
            { ticker: 'SABR', qtd: 200 },
            { ticker: 'BEEM', qtd: 200 },
            { ticker: 'SNDL', qtd: 400 }
        ],
        opcoesVendidas: [
            { ticker: 'BEEM', strike: 1.5,  tipo: 'C', vencimento: '2026-08-21', contratos: 2 },
            { ticker: 'SABR', strike: 2,    tipo: 'C', vencimento: '2026-08-21', contratos: 2 },
            { ticker: 'SNDL', strike: 1.5,  tipo: 'C', vencimento: '2026-08-21', contratos: 4 },
            { ticker: 'F',    strike: 13.5, tipo: 'P', vencimento: '2026-08-14', contratos: 2 }
        ]
    };
