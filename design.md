# Design System — Plataforma de Trading Algorítmico

> Documento de referência para o frontend (React). Define a linguagem visual, tokens, componentes e regras de responsividade e tema. Tudo o que for construído deve derivar deste documento.

---

## 1. Direção de design — "Instrumento"

A plataforma não é uma app de retalho estilo Robinhood. É uma **ferramenta de precisão para um quant** — alguém que constrói estratégias, corre backtests e confia (ou não) nos números. A identidade visual reflete isso: calma, medida, densa em dados, e que trata cada número com respeito.

Três princípios que guiam tudo:

1. **A cor carrega significado, nunca decora.** Verde e vermelho são reservados exclusivamente para direção de P&L (lucro/prejuízo, long/short, up/down). Nada mais na interface usa essas cores. Quando o utilizador vê verde, é dinheiro a subir — sempre.
2. **Os dados são a interface.** Tabelas, curvas de equity e estatísticas são o herói. O chrome (navegação, botões, cabeçalhos) recua para deixar os dados respirar.
3. **Densidade com hierarquia.** Mostramos muita informação, mas com escala tipográfica clara para que o olho saiba sempre onde pousar primeiro.

**Elemento de assinatura:** a *curva de equity* tem um tratamento próprio e reconhecível — linha fina e precisa sobre uma grelha de medição subtil, com a zona de drawdown sombreada e o ponto de split train/test marcado por uma linha vertical. É o ecrã que o utilizador vê mais vezes e o que define a plataforma.

---

## 2. Sistema de cor

A cor é definida com CSS custom properties em dois temas. **Mobile-first e ambos os temas são obrigatórios.** O tema segue `prefers-color-scheme` por defeito mas pode ser sobreposto manualmente com `[data-theme="light"]` / `[data-theme="dark"]` no `<html>`.

### 2.1 Tokens base (neutros)

```css
:root,
[data-theme="light"] {
  /* Fundos e superfícies */
  --bg:            #F6F7F9;   /* fundo da app — cinza-azulado frio, não creme */
  --surface:       #FFFFFF;   /* cards, painéis */
  --surface-sunken:#EEF0F3;   /* zonas recuadas, inputs, table headers */
  --surface-hover: #F0F2F5;

  /* Texto */
  --ink:           #10151D;   /* texto primário — quase preto azulado */
  --ink-secondary: #4A5568;   /* texto secundário, labels */
  --ink-tertiary:  #8A94A6;   /* captions, placeholders, eixos de chart */
  --ink-inverse:   #FFFFFF;

  /* Linhas e bordas */
  --border:        #DDE1E8;   /* bordas de cards, divisores */
  --border-strong: #C2C9D4;   /* bordas de inputs em foco, ênfase */
  --grid:          #EAEDF1;   /* grelha de charts — muito subtil */

  /* Acento — "azul de instrumento", mais frio que o SaaS genérico */
  --accent:        #2D6BFF;   /* ações primárias, links, seleção */
  --accent-hover:  #1E55E0;
  --accent-soft:   #E7EEFF;   /* fundo de chips/badges com acento */
  --accent-ink:    #1B3FA0;   /* texto sobre accent-soft */

  /* Foco visível (acessibilidade) */
  --focus-ring:    #2D6BFF;
}

[data-theme="dark"] {
  --bg:            #0B0E14;   /* tinta profunda, não preto puro */
  --surface:       #141A24;
  --surface-sunken:#0E131B;
  --surface-hover: #1B2330;

  --ink:           #E8ECF2;
  --ink-secondary: #A4AEBF;
  --ink-tertiary:  #6B7689;
  --ink-inverse:   #0B0E14;

  --border:        #232C3A;
  --border-strong: #38445A;
  --grid:          #1A222E;

  --accent:        #4D82FF;   /* ligeiramente mais claro para contraste em fundo escuro */
  --accent-hover:  #6695FF;
  --accent-soft:   #16233F;
  --accent-ink:    #9FBEFF;

  --focus-ring:    #6695FF;
}
```

### 2.2 Tokens semânticos — P&L (críticos)

Estes são os únicos sítios onde verde/vermelho aparecem. São **colorblind-aware**: além da cor, P&L usa sempre sinal (`+`/`−`), seta (▲/▼) ou ícone. Nunca dependas só da cor.

```css
:root,
[data-theme="light"] {
  --profit:        #0E9F6E;   /* lucro / long / up — verde com tom teal, não néon */
  --profit-soft:   #DEF7EC;
  --profit-ink:    #03543F;

  --loss:          #E02424;   /* prejuízo / short / down */
  --loss-soft:     #FDE8E8;
  --loss-ink:      #9B1C1C;

  --neutral-flat:  #8A94A6;   /* break-even, sem posição */
}

[data-theme="dark"] {
  --profit:        #31C48D;
  --profit-soft:   #0F2E24;
  --profit-ink:    #84E1BC;

  --loss:          #F05252;
  --loss-soft:     #2E1416;
  --loss-ink:      #F8B4B4;

  --neutral-flat:  #6B7689;
}
```

### 2.3 Tokens de estado (status de sistema)

Para estados de backtest, deployment, tasks, etc. — **distintos** dos de P&L para não haver confusão entre "estratégia a perder dinheiro" e "task falhada".

```css
:root, [data-theme="light"] {
  --status-pending:  #B45309;  --status-pending-soft:  #FEF3C7;  /* âmbar */
  --status-running:  #2D6BFF;  --status-running-soft:  #E7EEFF;  /* azul, animado */
  --status-success:  #0E9F6E;  --status-success-soft:  #DEF7EC;
  --status-failed:   #E02424;  --status-failed-soft:   #FDE8E8;
  --status-paused:   #6B7280;  --status-paused-soft:   #F3F4F6;
}
[data-theme="dark"] {
  --status-pending:  #FBBF24;  --status-pending-soft:  #2C2410;
  --status-running:  #4D82FF;  --status-running-soft:  #16233F;
  --status-success:  #31C48D;  --status-success-soft:  #0F2E24;
  --status-failed:   #F05252;  --status-failed-soft:   #2E1416;
  --status-paused:   #9CA3AF;  --status-paused-soft:   #1A1F29;
}
```

---

## 3. Tipografia

Três papéis. A combinação foge ao genérico: **sans geométrica para UI**, **mono para todos os números** (preços, P&L, estatísticas, tickers), e a mesma mono para dados tabulares para garantir alinhamento de dígitos.

```css
:root {
  /* Display & UI — sans com personalidade técnica */
  --font-ui: "Inter", "Inter Tight", system-ui, -apple-system, sans-serif;

  /* Dados, números, tickers, código — mono com dígitos tabulares */
  --font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, "SF Mono", monospace;
}

/* CRÍTICO: todos os números usam dígitos tabulares para alinharem em colunas */
.num, td.num, .stat-value, .price, .pnl {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

### 3.1 Escala tipográfica

Escala modular com passo ~1.25. Tamanhos em `rem` (base 16px).

| Token | Tamanho | Uso |
|---|---|---|
| `--text-display` | 2.5rem / 40px | Números grandes de hero (ex: P&L total de um backtest) |
| `--text-h1` | 1.75rem / 28px | Título de página |
| `--text-h2` | 1.375rem / 22px | Título de secção / card |
| `--text-h3` | 1.0625rem / 17px | Sub-secção |
| `--text-body` | 0.9375rem / 15px | Corpo, labels de formulário |
| `--text-sm` | 0.8125rem / 13px | Dados em tabela, metadata |
| `--text-xs` | 0.6875rem / 11px | Captions, eixos de chart, eyebrows |

```css
:root {
  --text-display: 2.5rem;   --lh-display: 1.05;  --tracking-display: -0.02em;
  --text-h1:      1.75rem;  --lh-h1: 1.15;       --tracking-h1: -0.015em;
  --text-h2:      1.375rem; --lh-h2: 1.2;
  --text-h3:      1.0625rem;--lh-h3: 1.3;
  --text-body:    0.9375rem;--lh-body: 1.5;
  --text-sm:      0.8125rem;--lh-sm: 1.45;
  --text-xs:      0.6875rem;--lh-xs: 1.4;  --tracking-xs: 0.04em; /* eyebrows em maiúsculas */
}
```

**Regras:**
- Números grandes (`--text-display`) são sempre mono, tabular, com `--tracking-display` negativo para densidade.
- Eyebrows/labels de secção em maiúsculas usam `--text-xs` + `--tracking-xs` + `--ink-tertiary`.
- Nunca uses mais de dois pesos por ecrã: regular (400/450) e semibold (600). Os números de ênfase usam 600.

---

## 4. Espaçamento, raio e elevação

```css
:root {
  /* Escala de espaçamento base 4px */
  --space-1: 0.25rem;  /* 4  */
  --space-2: 0.5rem;   /* 8  */
  --space-3: 0.75rem;  /* 12 */
  --space-4: 1rem;     /* 16 */
  --space-5: 1.5rem;   /* 24 */
  --space-6: 2rem;     /* 32 */
  --space-8: 3rem;     /* 48 */
  --space-10:4rem;     /* 64 */

  /* Raio — contido. Instrumentos de precisão não têm cantos muito redondos */
  --radius-sm: 6px;    /* badges, chips, inputs */
  --radius:    10px;   /* cards, botões */
  --radius-lg: 14px;   /* painéis grandes, modais */
  --radius-full: 999px;/* pills de status, avatares */

  /* Elevação — subtil, mais sombra de borda do que de profundidade */
  --shadow-sm: 0 1px 2px rgba(16, 21, 29, 0.04), 0 1px 1px rgba(16, 21, 29, 0.03);
  --shadow:    0 2px 8px rgba(16, 21, 29, 0.06), 0 1px 2px rgba(16, 21, 29, 0.04);
  --shadow-lg: 0 8px 28px rgba(16, 21, 29, 0.12);
}
[data-theme="dark"] {
  /* Em dark mode, elevação faz-se mais com borda/superfície do que com sombra */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow:    0 2px 10px rgba(0,0,0,0.4);
  --shadow-lg: 0 12px 36px rgba(0,0,0,0.55);
}
```

---

## 5. Responsividade — mobile-first

A app **constrói-se mobile-first** e expande para desktop. Breakpoints:

```css
:root {
  --bp-sm:  480px;   /* telemóvel grande */
  --bp-md:  768px;   /* tablet */
  --bp-lg:  1024px;  /* desktop pequeno */
  --bp-xl:  1280px;  /* desktop */
  --bp-2xl: 1600px;  /* monitor largo — layouts multi-coluna densos */
}
```

### 5.1 Layout shell

```
MOBILE (< 768px)                 DESKTOP (≥ 1024px)
┌─────────────────────┐          ┌──────┬──────────────────────────┐
│  Topbar (logo, ☰)   │          │      │  Topbar (breadcrumb, ⚙)  │
├─────────────────────┤          │ Side ├──────────────────────────┤
│                     │          │ nav  │                          │
│   Conteúdo          │          │      │   Conteúdo               │
│   (1 coluna,        │          │ (fixo│   (multi-coluna,         │
│    scroll vertical) │          │  240)│    grelha densa)         │
│                     │          │      │                          │
├─────────────────────┤          │      │                          │
│  Tab bar inferior   │          │      │                          │
│  (5 ícones)         │          └──────┴──────────────────────────┘
└─────────────────────┘
```

- **Mobile:** navegação principal numa **tab bar inferior fixa** (máx. 5 destinos: Mercado, Estratégias, Backtests, Live, Mais). Navegação secundária num drawer (☰). Conteúdo sempre em 1 coluna.
- **Tablet (≥768px):** sidebar colapsável aparece; tab bar inferior desaparece. Conteúdo pode usar 2 colunas.
- **Desktop (≥1024px):** sidebar fixa de 240px. Grelhas densas. Tabelas mostram todas as colunas.
- **Monitor largo (≥1600px):** layouts lado-a-lado (ex: lista de backtests + detalhe; chart + tabela de trades).

### 5.2 Regras de adaptação de tabelas (importante)

Tabelas de dados financeiros têm muitas colunas. Em mobile **não** se faz scroll horizontal infinito de uma tabela densa. Em vez disso:

- **Mobile:** cada linha vira um **card** com os 3-4 campos essenciais (ticker, P&L, win rate) e um chevron para expandir o resto.
- **Tablet:** tabela com colunas prioritárias; colunas secundárias escondidas (`hidden md:table-cell`).
- **Desktop:** tabela completa.

Define prioridade de coluna por `data-priority="1|2|3"` e esconde por breakpoint.

---

## 6. Componentes

### 6.1 Card / Painel

A unidade base. Superfície, borda subtil, raio `--radius`.

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-5);
  box-shadow: var(--shadow-sm);
}
.card__header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-4);
}
.card__eyebrow { /* label da secção */
  font-size: var(--text-xs); letter-spacing: var(--tracking-xs);
  text-transform: uppercase; color: var(--ink-tertiary);
}
```

### 6.2 Stat (estatística destacada)

Padrão para os números-chave (Total PnL, Win Rate, Sharpe, etc.). Label pequeno em cima, número grande mono em baixo, P&L colorido por sinal.

```
┌──────────────────┐
│ TOTAL PNL        │  ← eyebrow, --ink-tertiary
│ +$49,624.12  ▲   │  ← --text-display, mono, --profit
│ 1.61 PF          │  ← contexto, --text-sm, --ink-secondary
└──────────────────┘
```

```css
.stat__label { font-size: var(--text-xs); text-transform: uppercase;
               letter-spacing: var(--tracking-xs); color: var(--ink-tertiary); }
.stat__value { font-family: var(--font-mono); font-variant-numeric: tabular-nums;
               font-size: var(--text-display); font-weight: 600;
               letter-spacing: var(--tracking-display); line-height: var(--lh-display); }
.stat__value--profit { color: var(--profit); }
.stat__value--loss   { color: var(--loss); }
.stat__value--neutral{ color: var(--ink); }
```

**Regra:** P&L positivo prefixa `+`, negativo prefixa `−` (sinal de menos tipográfico, não hífen). Adiciona ▲/▼ para reforço não-cromático.

### 6.3 Badge de status

Pill com cor de estado de sistema (secção 2.3). O estado `running` tem um ponto pulsante.

```css
.badge { display: inline-flex; align-items: center; gap: var(--space-2);
         padding: 2px var(--space-3); border-radius: var(--radius-full);
         font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.02em; }
.badge--running { background: var(--status-running-soft); color: var(--status-running); }
.badge--running::before { content:""; width:6px; height:6px; border-radius:50%;
         background: currentColor; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
```

Estados: `pending`, `running`, `completed`, `failed`, `paused`, `completed_with_warnings` (usa âmbar + ícone ⚠).

### 6.4 Botões

```css
.btn { font-family: var(--font-ui); font-size: var(--text-body); font-weight: 600;
       padding: var(--space-3) var(--space-5); border-radius: var(--radius);
       border: 1px solid transparent; cursor: pointer; transition: 120ms ease; }
.btn--primary { background: var(--accent); color: #fff; }
.btn--primary:hover { background: var(--accent-hover); }
.btn--secondary { background: var(--surface); color: var(--ink);
                  border-color: var(--border-strong); }
.btn--ghost { background: transparent; color: var(--ink-secondary); }
.btn--danger { background: var(--loss); color: #fff; } /* só para stop/delete destrutivo */
.btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
```

Alvos de toque em mobile: **mínimo 44×44px**.

### 6.5 Tabela de dados

```css
.table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.table thead th { position: sticky; top: 0; background: var(--surface-sunken);
                  color: var(--ink-secondary); font-weight: 600; text-align: left;
                  font-size: var(--text-xs); text-transform: uppercase;
                  letter-spacing: var(--tracking-xs); padding: var(--space-3) var(--space-4); }
.table td { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border);
            font-variant-numeric: tabular-nums; }
.table td.num { font-family: var(--font-mono); text-align: right; }
.table tbody tr:hover { background: var(--surface-hover); }
```

Colunas de P&L na tabela usam `--profit`/`--loss` no texto. Colunas numéricas alinhadas à direita.

### 6.6 Input / Form

```css
.input { font-family: var(--font-ui); font-size: var(--text-body);
         background: var(--surface-sunken); border: 1px solid var(--border);
         border-radius: var(--radius-sm); padding: var(--space-3) var(--space-4);
         color: var(--ink); width: 100%; }
.input:focus { outline: none; border-color: var(--accent);
               box-shadow: 0 0 0 3px var(--accent-soft); }
/* Inputs numéricos (capital, bet size, thresholds) usam mono */
.input--num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; text-align: right; }
```

---

## 7. Visualização de dados (o coração da plataforma)

### 7.1 Curva de equity — elemento de assinatura

Especificação consistente em toda a app:

- **Linha:** 1.5px, `--accent`. Sem pontos por defeito (só no hover via tooltip).
- **Grelha:** linhas horizontais a `--grid`, muito subtis. Sem grelha vertical pesada.
- **Eixos:** texto `--ink-tertiary`, `--text-xs`, mono.
- **Zona de drawdown:** quando a equity está abaixo do pico anterior, sombrear a área entre a linha e o pico com `--loss` a 8% de opacidade.
- **Linha de split train/test:** linha vertical tracejada `--ink-tertiary` com label "split" — sempre presente quando há split.
- **Baseline (capital inicial):** linha horizontal tracejada subtil em `--ink-tertiary`.
- **Comparação hedged vs unhedged:** duas linhas — estratégia em `--accent`, com-hedge em `--profit` se melhor, ambas com legenda.

### 7.2 Cores de séries (multi-linha)

Quando precisas de várias séries que **não** são P&L (ex: comparar símbolos, indicadores), usa esta paleta categórica — distinta dos verde/vermelho semânticos:

```css
--series-1: #2D6BFF;  /* azul accent */
--series-2: #9333EA;  /* roxo */
--series-3: #0891B2;  /* teal */
--series-4: #C2410C;  /* terracota */
--series-5: #4D7C0F;  /* azeitona */
--series-6: #BE185D;  /* magenta */
```

### 7.3 Candlestick / OHLCV

- Vela de subida: contorno/preenchimento `--profit`. Vela de descida: `--loss`.
- Indicadores sobrepostos (médias móveis, Bollinger) usam a paleta `--series-*`, nunca verde/vermelho.
- Markers de trade: ▲ entrada (`--accent`), ▼ saída (`--ink-secondary`); cor de borda reflete win/loss.

### 7.4 Estado de "ratio dinâmico" (módulo hedge)

Para o chart do hedge ratio: linha do ratio em `--series-2`, banda de range normal sombreada a verde 8%, thresholds superior/inferior tracejados, linha de referência "3" (valor antigo hardcoded) ponteada e cinzenta.

---

## 8. Padrões específicos de módulo

| Módulo | Padrão de UI principal |
|---|---|
| **Market Data** | Chart OHLCV grande + datatable por baixo (desktop: lado-a-lado). Badge de estado de validação por símbolo. |
| **Analytical Tools** | Indicador com badge de estado atual (oversold/squeeze/etc.) sobreposto ao chart. |
| **Screener** | Filtro composável (blocos AND/OR) no topo; resultados em tabela com sparkline por linha + score ML. |
| **Backtests** | Lista (esq.) + detalhe (dir.) em desktop; stat-grid de métricas no topo do detalhe; curva de equity como herói; tabela de trades por baixo; painel de análise AI separado. Badge ⚠ quando `completed_with_warnings`. |
| **Live Trading** | Dashboard de deployments com semáforo (verde/âmbar/vermelho); curva de equity ao vivo (websocket); checklist de critérios de avaliação com valores atuais vs thresholds; botão "Promote to real money" só ativo quando `passed`. |
| **Live Monitor** | Grelha de deployments ativos com estado de degradação; histórico de alertas; comparação backtest vs paper vs live lado-a-lado. |
| **Tasks** | Lista de tasks/cron com badge de status; `running` com ponto pulsante e barra de progresso (websocket). |

---

## 9. Movimento

Discreto e funcional. Respeitar sempre `prefers-reduced-motion`.

```css
:root {
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 120ms;   /* hover, foco */
  --dur:      200ms;   /* transições de painel, drawer */
  --dur-slow: 320ms;   /* entrada de modal, page transition */
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important; }
}
```

- **Updates de dados ao vivo:** quando um número de P&L muda via websocket, faz um flash subtil de 1 frame na cor da direção (verde se subiu, vermelho se desceu) e volta ao normal. Nunca animar a contagem do número (distrai).
- **Progresso de backtest:** barra de progresso linear, sem spinners decorativos.
- **Page transitions:** fade + slide curto (8px). Nada exuberante.

---

## 10. Acessibilidade (quality floor, não opcional)

- **Contraste:** texto normal ≥ 4.5:1, texto grande ≥ 3:1, em ambos os temas. Verificar `--ink-secondary` e `--ink-tertiary` sobre cada superfície.
- **Foco visível:** `outline: 2px solid var(--focus-ring)` com `offset: 2px` em todos os interativos. Nunca remover sem substituir.
- **P&L nunca só por cor:** sempre sinal (+/−) e/ou seta além da cor — protege utilizadores com daltonismo (deuteranopia/protanopia confundem o verde/vermelho clássico).
- **Alvos de toque:** mínimo 44×44px em mobile.
- **Teclado:** toda a navegação e ações alcançáveis por teclado; ordem de tab lógica; drawer e modais com focus trap e fecho por `Esc`.
- **Tabelas:** `<th scope>` correto; `aria-sort` nas colunas ordenáveis.
- **Live regions:** updates de trading ao vivo num `aria-live="polite"` para leitores de ecrã, sem inundar.
- **Tema:** o toggle de tema é uma preferência explícita guardada; respeita `prefers-color-scheme` no primeiro load.

---

## 11. Toggle de tema (implementação)

```js
// No arranque: respeitar preferência guardada ou do sistema
const saved = /* preferência do utilizador, gerida em estado da app */ null;
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = saved ?? (prefersDark ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
```

> Nota: em artifacts/preview não usar `localStorage`. Guardar a preferência em estado da app (React state/context) ou no backend de preferências do utilizador.

---

## 12. Checklist antes de fazer merge de um ecrã

- [ ] Funciona a 360px de largura (mobile) sem scroll horizontal indesejado
- [ ] Funciona em dark **e** light mode (testar ambos)
- [ ] P&L usa cor **e** sinal/seta (não só cor)
- [ ] Todos os números usam mono + dígitos tabulares e alinham em colunas
- [ ] Verde/vermelho aparecem **apenas** em P&L; status usa as cores de estado
- [ ] Foco visível em todos os interativos
- [ ] Tabelas densas viram cards em mobile
- [ ] `prefers-reduced-motion` respeitado
- [ ] Estados vazios e de erro têm direção clara (o que fazer a seguir), não só "sem dados"
