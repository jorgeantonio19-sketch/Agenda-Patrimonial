# Agenda Patrimonial — README

App PWA de controlo de carteira (PM, rolagens e posições) para ações e opções.
Deploy: agendapatrimonial.vercel.app

---

## Estrutura do projeto

```
agenda-patrimonial/
├── index.html
├── style.css
├── manifest.json
├── sw.js
├── vercel.json
├── icon.png
├── api/
│   └── preco.js
└── js/
    ├── estado.js
    ├── persistencia.js
    ├── rendaFixa.js
    ├── watchlist.js
    ├── precos.js
    ├── totais.js
    ├── agenda.js
    ├── grafico.js
    ├── backup.js
    └── app.js
```

## Para que serve cada ficheiro

### Raiz

- **index.html** — só a marcação (HTML) da app: cabeçalho, abas (Registo,
  Carteira, Histórico, Watchlist), formulários e tabela. Carrega `style.css`
  e todos os módulos de `js/` no fim do `<body>`.
- **style.css** — todo o visual da app (cores, layout, cartões, tabela,
  estilos de impressão).
- **manifest.json** — metadados da PWA (nome, ícones, cor de tema) usados
  para "adicionar ao ecrã inicial" no telemóvel.
- **sw.js** — Service Worker: guarda os ficheiros da app em cache para
  funcionar offline. **Sempre que se cria ou renomeia um ficheiro, é preciso
  adicionar/atualizar o nome dele na lista `ASSETS` deste ficheiro e subir o
  número da versão em `CACHE_NAME` (ex: v5 → v6).**
- **vercel.json** — configuração de deploy na Vercel (garante que o `sw.js`
  nunca fica em cache desatualizado no browser).
- **icon.png** — ícone da app.

### api/

- **preco.js** — função serverless (corre no servidor da Vercel, não no
  telemóvel) que busca a cotação na Yahoo Finance e devolve ao browser.
  Existe para evitar o bloqueio de CORS que a Yahoo aplica a pedidos feitos
  diretamente do browser.

### js/ (carregados nesta ordem no index.html — a ordem importa)

1. **estado.js** — variáveis globais partilhadas por toda a app (`agenda`,
   cache de preços, etc.) e a configuração `POSICOES_CONSOLIDADAS`
   (posições da IBKR/Tastytrade usadas nos totais). **É aqui que se edita
   sempre que se abre/fecha/rola uma posição.**
2. **persistencia.js** — grava/lê o histórico de operações no
   `localStorage` e trata do nome do proprietário mostrado no topo/rodapé.
3. **rendaFixa.js** — aba de Renda Fixa: adicionar, remover e calcular
   juros das posições de renda fixa.
4. **watchlist.js** — aba Watchlist: lista de tickers acompanhados, com
   preço e variação.
5. **precos.js** — ticker de preços via Yahoo Finance, símbolo OCC das
   opções e deteção do estado do mercado (NYSE/NASDAQ aberto/fechado).
6. **totais.js** — cartões de categoria na aba Carteira (Ações, Opções,
   Renda Fixa, "Tudo Junto"), saldo manual da Tastytrade e cálculo dos
   totais consolidados (IBKR + Tastytrade).
7. **agenda.js** — núcleo da app: formulário de nova operação (instrumento,
   direção, campos dinâmicos), gravar/editar/excluir, filtros do histórico,
   cálculo de P&L, dias até expiração e o processamento geral da agenda.
8. **grafico.js** — gráfico de pizza da composição da carteira (aba
   Carteira).
9. **backup.js** — exportar CSV, exportar/copiar backup em texto, importar
   backup, imprimir histórico, limpar todos os dados e restaurar backup
   automático de segurança.
10. **app.js** — navegação entre abas (`mudarAba`) e o código de arranque
    da app (regista o Service Worker, carrega dados iniciais, arranca os
    loops de preços/totais). **Tem de ser sempre o último `<script>` a
    carregar**, porque corre assim que a página abre e depende de todas as
    funções dos outros módulos já estarem definidas.

---

## Como pedir uma atualização

Traz este ficheiro README.md junto com o(s) ficheiro(s) que quiseres
alterar (não precisa de trazer o projeto todo). Diz o que queres mudar,
que eu identifico o módulo certo a mexer.

---

## Changelog

### 2026-07-26 — Divisão do ficheiro único em módulos
- O `index.html` original (~1720 linhas, tudo num só ficheiro) foi dividido
  em `style.css` + 10 ficheiros `js/*.js` por funcionalidade (ver lista
  acima), mantendo toda a lógica igual — nenhuma função foi alterada, só
  reorganizada.
- Escolhida a abordagem de scripts simples (`<script src="...">`), sem
  ES modules — mais simples de manter e depurar pelo telemóvel, sem
  necessidade de servidor de build.
- `sw.js` atualizado para `CACHE_NAME = 'agenda-patrimonial-v5'` e passou a
  cachear todos os novos ficheiros (`style.css` e os 10 módulos `js/`).
- Criado este README.md.

### 2026-07-27 — Seletor de moeda de exibição (USD/EUR/BRL)
- Novo seletor **$ USD / € EUR / R$ BRL** na aba **Watch** (topo), que converte
  a exibição de valores agregados em toda a app usando câmbio ao vivo (Yahoo
  Finance, atualizado a cada 1 min). A escolha fica salva (localStorage) e
  persiste entre sessões.
- Afeta: cartões e totais da Carteira, coluna "Valor Efeito" e P&L da
  tabela, resumo "Total Aplicado" no Registo/Histórico, e os cartões da
  Renda Fixa (capital era guardado em EUR — `fmtEUR` agora reaproveita o
  conversor central, então passou a respeitar o seletor automaticamente).
- **Não converte**: preço por ação, PM e strike de opções — continuam
  sempre em USD, por serem cotações de mercado, não valores de carteira.
  Nada gravado é alterado, só a exibição.
- `js/precos.js`: novas funções `atualizarTaxasCambio()` (busca EURUSD=X e
  USDBRL=X, atualiza o cache partilhado `taxasCambio`) e `formatarMoeda(valor,
  moedaOrigem, casas)` (conversor + formatador central, usado por todos os
  módulos).
- `js/estado.js`: novas variáveis globais `moedaExibicao` e `taxasCambio`.
- `js/persistencia.js`: novas funções `selecionarMoeda()` e
  `atualizarBotoesMoeda()`.
- O card "Tudo Junto" (Carteira) passou a reaproveitar o cache partilhado de
  câmbio em vez de buscar as taxas de novo — evita pedidos duplicados à
  Yahoo.
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v6'`.

### 2026-07-30 — Abas embaixo, scroll travado e "atualizado há Xs"
- **Barra de abas movida para baixo da tela** (Registo/Carteira/Histórico/Watch),
  como em apps de corretora (Interactive Brokers, TradingView). Fica sempre
  visível, ao alcance do polegar.
- **Estrutura fixa, sem "elástico" do iOS**: `html`/`body` agora travados
  (`overflow: hidden`, altura 100%). Só uma camada rola de verdade — a nova
  `.app-scroll` (contém as abas + rodapé). O cabeçalho fica sempre fixo no
  topo e a nav sempre fixa embaixo; o fundo gradiente nunca "sai" atrás mais.
  `body.html`: conteúdo das abas + `<footer>` movidos para dentro de
  `<div class="app-scroll">`; `<nav class="tabs-nav">` movida pro fim do
  `app-frame`. `js/app.js`: `mudarAba()` agora reseta `.app-scroll.scrollTop`
  pra 0 ao trocar de aba.
- **Selo "🕒 atualizado há Xs" na Watchlist**: cada ticker mostra a idade do
  preço mostrado, pra ficar óbvio quando um valor está desatualizado (foi o
  que motivou isso — Ford aparecia com 5% de diferença do TradingView).
  `js/watchlist.js`: nova função `tempoDecorrido()`, novo `atualizarSelosWatchlist()`
  (loop leve de 5s que só atualiza o texto, sem buscar preço de novo).
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v7'`.

### 2026-07-30 (correção) — Tela não preenchia a altura no iOS
- O `height: -webkit-fill-available` usado pra travar `html`/`body` tem um bug
  conhecido do iOS Safari: dentro de elemento `flex` (o `.app-frame`), ele
  encolhe pro tamanho do conteúdo em vez de preencher a tela — sobrava espaço
  preto embaixo da nav em abas com pouco conteúdo (ex: Watch com 1 ticker).
- Trocado por `100dvh` (altura dinâmica de viewport), sem esse bug.
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v8'`.

### 2026-07-30 (correção 2) — Conteúdo arrastava pros lados
- O `.app-scroll` só travava o eixo vertical (`overflow-y`); o eixo horizontal
  ficou destravado (antes essa trava vinha do `body`, que passou a não ser
  mais quem contém o conteúdo visível). Resultado: dava pra arrastar a tela
  pros lados e cortava o formulário.
- Adicionado `overflow-x: hidden` ao `.app-scroll`.
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v9'`.

### 2026-07-30 — Registo virou modal, botão + no topo, nova aba Menu
- **Botão + no cabeçalho** (canto superior direito, estilo TradingView) abre o
  formulário de Registo como **modal bottom-sheet** por cima da aba atual —
  não navega mais pra lugar nenhum, some ao gravar ou tocar fora/no ✕.
- **Nav de baixo mudou**: era Registo/Carteira/Histórico/Watch, agora é
  **Menu/Carteira/Histórico/Watch**. Carteira é a aba padrão ao abrir a app.
- **Nova aba Menu**: leva o seletor de moeda (USD/EUR/BRL, antes na Watch) +
  o rodapé (nome, Restaurar Emergência).
- `body.html`: bloco do formulário de Registo movido pra dentro de
  `<div class="modal-overlay" id="modalRegisto">`; `<footer>` removido,
  conteúdo migrado pra dentro da nova `<div id="aba-menu">`.
- `js/app.js`: `mudarAba()` agora usa a lista `['menu','carteira','historico','watchlist']`;
  novas funções `abrirModalRegisto()` / `fecharModalRegisto()`.
- `js/agenda.js`: editar um item da tabela agora chama `abrirModalRegisto()`
  em vez de trocar de aba; salvar com sucesso fecha o modal automaticamente.
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v10'`.
