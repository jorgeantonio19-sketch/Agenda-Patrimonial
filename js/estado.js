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

    // ===== POSIÇÕES CONSOLIDADAS (IBKR + TASTYTRADE) — 100% AUTOMÁTICO =====
    // "acoes" é calculado direto do Histórico da Agenda (calcularAcoesDetidas(),
    // em agenda.js). "opcoesVendidas" também: calcularOpcoesVendidas(), em
    // agenda.js, deriva as opções vendidas ainda em aberto (sem prémio de
    // fechamento registado e sem ter passado da data de exercício) direto do
    // Histórico. A antiga lista manual POSICOES_CONSOLIDADAS foi removida —
    // não há mais nada pra editar aqui quando abrir/fechar/rolar uma opção,
    // só registar no Registo normalmente.

    // ===== VALOR RETIDO EM OPÇÕES, AGRUPADO POR TICKER =====
    // Preenchido por calcularTotaisConsolidados() (totais.js) sempre que os preços
    // das opções são atualizados. Usado pelo gráfico de pizza (grafico.js) para dar
    // a cada ativo — incluindo os que só têm opções, como a Ford — a sua própria
    // fatia, em vez de tudo cair num bloco genérico "Opções".
    let ultimoValorRetidoPorTicker = {};
