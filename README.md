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
10. **simulador.js** — Simulador de Payoff (modal acessível pela aba Menu):
    sliders de Strike/Prémio/Preço/Quantidade, cálculo de ITM/ATM/OTM, ponto
    de equilíbrio e resultado, gráfico de payoff em canvas, e opção de
    carregar uma posição já registada na Agenda como ponto de partida.
11. **app.js** — navegação entre abas (`mudarAba`) e o código de arranque
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

### 2026-08-01 — Glossário de Opções (Fase 1)
- Novo cartão "📚 Referência" na aba Menu com botão **Glossário de Opções**
  (modal): teoria de Call/Put (definição, compra, venda) + minidicionário
  (Strike, Prémio, Lançador, Titular, Vencimento, ITM/ATM/OTM, Valor
  Intrínseco/Temporal, Volatilidade Implícita). Conteúdo estático, sem
  interatividade — inspirado num app de simulador de opções visto no Google
  AI Studio.
- `body.html`: `<div class="modal-overlay" id="modalGlossario">`.
- `js/app.js`: `abrirModalGlossario()` / `fecharModalGlossario()`.
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v11'`.

### 2026-08-01 (correção definitiva) — Espaço sobrando embaixo
- Causa raiz: o `body` reservava `padding-bottom: env(safe-area-inset-bottom)`
  como margem de segurança, empurrando o cartão inteiro pra cima e sobrando
  fundo visível abaixo dele.
- Removido esse padding do `body`; agora é a própria `.tabs-nav` que "sangra"
  até a borda física da tela (margem negativa cancelando o padding do
  `.app-frame`) e absorve a área de segurança com padding interno próprio.
  `.app-frame` e `.tabs-nav` ficaram com cantos retos embaixo (só arredondados
  no topo), já que agora tocam a borda real da tela.

### 2026-08-01 — Simulador de Payoff (Fase 2)
- Novo módulo **`js/simulador.js`** e modal `modalSimulador`, acessível pela
  aba Menu junto do Glossário.
- Sliders pra Strike, Prémio, Preço do Ativo e Quantidade; toggles de
  Tipo (CALL/PUT) e Direção (Compra/Venda).
- Calcula ao vivo: Classificação (ITM/ATM/OTM), Ponto de Equilíbrio, Prémio
  Total (pago ou recebido, conforme a direção) e Resultado no Preço Atual.
- Gráfico de payoff desenhado em `<canvas>` (sem lib externa, mesmo estilo do
  gráfico de pizza): curva colorida verde/vermelho por lucro/prejuízo,
  tracejado amarelo no strike, tracejado ciano no preço atual.
- **Carregar posição da Agenda**: se já existir alguma opção registada, um
  seletor no topo do modal deixa escolher uma e pré-preenche os sliders com
  os valores reais (strike = preço gravado, prémio calculado a partir do
  valor total ÷ quantidade).
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v12'`.

### 2026-08-02 — 4 ajustes: Renda Fixa, calculadora, texto didático, Menu à direita
1. **Renda Fixa mostra os dois valores**: como o capital é sempre guardado em
   EUR, ao ver com o seletor noutra moeda o valor convertido agora vem
   acompanhado do original entre parênteses — ex: `$3,209.12 (€2,784.00)`.
   Não era bug de cálculo, só faltava deixar claro que era conversão.
   `js/rendaFixa.js`: `fmtEUR()` ajustada.
2. **Calculadora de Distância (Strike)** nova, na aba Menu: digita Preço
   Atual e Strike, mostra a % de distância entre os dois (quanto o ativo
   precisa subir/cair pra chegar no strike). `js/simulador.js`:
   `calcularDistanciaStrike()`.
3. **Texto explicativo no Simulador de Payoff**: abaixo do gráfico, uma frase
   dinâmica conforme Call/Put e Compra/Venda explica em português simples o
   que acontece acima/abaixo do ponto de equilíbrio. `js/simulador.js`:
   `simAtualizarExplicacao()`.
4. **Menu movido pro lado direito** da nav de baixo (era o primeiro botão,
   agora é o último: Carteira, Histórico, Watch, Menu).
   `js/app.js`: lista de `mudarAba()` reordenada.
- `sw.js` → `CACHE_NAME = 'agenda-patrimonial-v13'`.
