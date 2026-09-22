'use strict';

/* ===========================================================
   WAIFU RNG — script.js

   ÍNDICE
   1. Utilitários
   2. CONFIGURAÇÃO GERAL ............ (edite: tempos e balanceamento)
   3. RARIDADES ..................... (edite: nomes, cores, chances)
   4. WAIFUS ........................ (edite: nomes e imagens)
   5. UPGRADES ...................... (edite: custos e efeitos)
   6. Índices auxiliares ............ (não precisa editar)
   7. SaveSystem .................... (salvar/carregar; troque por API no futuro)
   8. Engine ........................ (sorteio, sem tocar no DOM)
   9. UI ............................ (tudo que mexe na tela)
   10. Game ......................... (estado, loop, ações do jogador)

   Para o futuro (Electron / NW.js / backend): as seções 8 e 10
   não dependem do visual, e a seção 7 é o único lugar que fala
   com o armazenamento. Para virar módulos ES, basta mover cada
   seção para um arquivo e usar import/export.
   =========================================================== */


/* ===========================================================
   1. UTILITÁRIOS
   =========================================================== */

/** Número com casas decimais no formato brasileiro (1,25). */
function num(n, decimals = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Inteiro com separador de milhar (1.000.000). */
function fmt(n) {
  return Math.floor(n).toLocaleString('pt-BR');
}

/** "Zero Two" -> "ZT" (aparece quando a waifu ainda não tem imagem). */
function initials(name) {
  return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

/** Cria um elemento com classe e texto opcionais. */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 0.25 -> "1 em 4"; 0.000001 -> "1 em 1.000.000". */
function formatOdds(p) {
  const n = 1 / p;
  return '1 em ' + (n < 10 ? num(n, 1) : Math.round(n).toLocaleString('pt-BR'));
}

function formatPercent(p) {
  return (p * 100).toLocaleString('pt-BR', { maximumSignificantDigits: 3 }) + '%';
}


/* ===========================================================
   2. CONFIGURAÇÃO GERAL
   =========================================================== */

const CONFIG = {
  saveKey: 'waifu-rng-save-v1',
  baseCooldownMs: 3000,   // espera entre giros no começo do jogo
  minCooldownMs: 250,     // o cooldown nunca fica abaixo disso
  historySize: 8,         // quantos giros recentes aparecem na lista
  hotRarityIndex: 3,      // a partir desta raridade (posição em RARITIES) há brilho e clarão
  shakeRarityIndex: 4,    // a partir desta, o cartão também treme
  revealMaxMs: 600,       // duração máxima da animação de girar
  tickMs: 50,             // frequência do loop do jogo
  autosaveMs: 5000,       // salvamento automático
};


/* ===========================================================
   3. RARIDADES

   >>> AQUI VOCÊ EDITA AS PROBABILIDADES <<<

   - A ordem importa: da MAIS COMUM (primeira) para a MAIS RARA (última).
   - oddsN: a chance é exatamente "1 em oddsN" (sem sorte extra).
       Ex.: oddsN 100 = 1 em 100 = 1%.
   - A raridade com oddsN null é a "sobra": ela recebe a probabilidade
     que restar. Deixe só a primeira (Comum) com null.
   - coins: moedas ganhas cada vez que essa raridade sai.
   - color: cor do contorno, das etiquetas e do brilho.
   - gradient (opcional): fundo em degradê, usado pela Divina.

   O multiplicador de sorte multiplica a chance de cada raridade com
   oddsN (sorte ×2 = o dobro da chance de tirar uma Divina). A Comum
   encolhe para compensar. Na Engine.chances() você vê como funciona.
   =========================================================== */

const RARITIES = [
  { id: 'comum',    name: 'Comum',    color: '#A3A9C2', oddsN: null,    coins: 1 },
  { id: 'rara',     name: 'Rara',     color: '#4C9AFF', oddsN: 3,       coins: 4 },
  { id: 'epica',    name: 'Épica',    color: '#A96BFF', oddsN: 10,      coins: 15 },
  { id: 'lendaria', name: 'Lendária', color: '#FFA41C', oddsN: 100,     coins: 100 },
  { id: 'mitica',   name: 'Mítica',   color: '#FF4D7E', oddsN: 5000,    coins: 1500 },
  { id: 'divina',   name: 'Divina',   color: '#FF7AE0', oddsN: 1000000, coins: 25000,
    gradient: 'linear-gradient(120deg, #FF7AE0, #FFD23F 30%, #5CF2D0 55%, #6FA8FF 78%, #C68BFF)' },
];


/* ===========================================================
   4. WAIFUS

   >>> AQUI VOCÊ EDITA NOMES E IMAGENS <<<

   Campos:
   - id:     identificador único e fixo (minúsculas, sem espaços).
             NÃO mude depois de publicar, senão o progresso salvo
             dessa waifu se perde. O nome exibido pode mudar à vontade.
   - name:   nome exibido.
   - series: anime de origem.
   - rarity: id de uma raridade da lista RARITIES acima.
   - image:  caminho da imagem. Deixe '' para mostrar só as iniciais.
             Exemplo: image: 'images/zero-two.png'
             (crie uma pasta "images" ao lado do index.html).
             Tamanho ideal: retrato, algo como 400x420 px.

   Para adicionar uma waifu, copie uma linha e mude os campos.
   Todas as waifus da mesma raridade têm a mesma chance entre si.
   =========================================================== */

const WAIFUS = [
  // ---- Comum ----
  { id: 'hinata',   name: 'Hinata Hyuga',     series: 'Naruto',        rarity: 'comum', image: '' },
  { id: 'nami',     name: 'Nami',             series: 'One Piece',     rarity: 'comum', image: '' },
  { id: 'asuna',    name: 'Asuna',            series: 'Sword Art Online', rarity: 'comum', image: '' },
  { id: 'kagome',   name: 'Kagome Higurashi', series: 'Inuyasha',      rarity: 'comum', image: '' },
  { id: 'orihime',  name: 'Orihime Inoue',    series: 'Bleach',        rarity: 'comum', image: '' },
  { id: 'tohru',    name: 'Tohru Honda',      series: 'Fruits Basket', rarity: 'comum', image: '' },

  // ---- Rara ----
  { id: 'rem',      name: 'Rem',              series: 'Re:Zero',       rarity: 'rara', image: '' },
  { id: 'emilia',   name: 'Emilia',           series: 'Re:Zero',       rarity: 'rara', image: '' },
  { id: 'megumin',  name: 'Megumin',          series: 'KonoSuba',      rarity: 'rara', image: '' },
  { id: 'nezuko',   name: 'Nezuko Kamado',    series: 'Demon Slayer',  rarity: 'rara', image: '' },
  { id: 'mikasa',   name: 'Mikasa Ackerman',  series: 'Attack on Titan', rarity: 'rara', image: '' },

  // ---- Épica ----
  { id: 'marin',    name: 'Marin Kitagawa',   series: 'My Dress-Up Darling', rarity: 'epica', image: '' },
  { id: 'kaguya',   name: 'Kaguya Shinomiya', series: 'Kaguya-sama: Love Is War', rarity: 'epica', image: '' },
  { id: 'yor',      name: 'Yor Forger',       series: 'Spy x Family',  rarity: 'epica', image: '' },
  { id: 'aqua',     name: 'Aqua',             series: 'KonoSuba',      rarity: 'epica', image: '' },
  { id: 'violet',   name: 'Violet Evergarden', series: 'Violet Evergarden', rarity: 'epica', image: '' },
  { id: 'chizuru',  name: 'Chizuru Mizuhara', series: 'Rent-a-Girlfriend', rarity: 'epica', image: '' },

  // ---- Lendária ----
  { id: 'zero-two', name: 'Zero Two',         series: 'Darling in the Franxx', rarity: 'lendaria', image: '' },
  { id: 'makima',   name: 'Makima',           series: 'Chainsaw Man',  rarity: 'lendaria', image: '' },
  { id: 'asuka',    name: 'Asuka Langley',    series: 'Neon Genesis Evangelion', rarity: 'lendaria', image: '' },
  { id: 'rin',      name: 'Rin Tohsaka',      series: 'Fate/stay night', rarity: 'lendaria', image: '' },
  { id: 'erza',     name: 'Erza Scarlet',     series: 'Fairy Tail',    rarity: 'lendaria', image: '' },

  // ---- Mítica ----
  { id: 'rei',      name: 'Rei Ayanami',      series: 'Neon Genesis Evangelion', rarity: 'mitica', image: '' },
  { id: 'saber',    name: 'Saber',            series: 'Fate/stay night', rarity: 'mitica', image: '' },
  { id: 'frieren',  name: 'Frieren',          series: 'Sousou no Frieren', rarity: 'mitica', image: '' },

  // ---- Divina ----
  { id: 'holo',     name: 'Holo',             series: 'Spice and Wolf', rarity: 'divina', image: '' },
  { id: 'kurisu',   name: 'Kurisu Makise',    series: 'Steins;Gate',   rarity: 'divina', image: '' },
];


/* ===========================================================
   5. UPGRADES

   Cada upgrade tem níveis. O custo do próximo nível é:
       custo = baseCost * costGrowth ^ nívelAtual
   - value(nível): o efeito naquele nível.
   - format(valor): como o valor aparece na loja.
   Para criar um upgrade novo, adicione aqui e use-o na Engine.
   =========================================================== */

const UPGRADES = {
  luck: {
    name: 'Multiplicador de sorte',
    description: 'Aumenta a chance de tirar raridades mais altas.',
    baseCost: 25,
    costGrowth: 1.55,
    maxLevel: 30,
    value: level => 1 + level * 0.25,
    format: value => '×' + num(value, 2),
  },
  speed: {
    name: 'Redução de cooldown',
    description: 'Diminui a espera entre um giro e outro.',
    baseCost: 20,
    costGrowth: 1.5,
    maxLevel: 22,
    value: level => Math.max(CONFIG.minCooldownMs, CONFIG.baseCooldownMs * Math.pow(0.9, level)),
    format: value => num(value / 1000, 2) + ' s',
  },
};

function upgradeCost(id, level) {
  const up = UPGRADES[id];
  return Math.floor(up.baseCost * Math.pow(up.costGrowth, level));
}


/* ===========================================================
   6. ÍNDICES AUXILIARES (não precisa editar)
   =========================================================== */

const RARITY_BY_ID = {};
const RARITY_INDEX = {};
RARITIES.forEach((r, i) => { RARITY_BY_ID[r.id] = r; RARITY_INDEX[r.id] = i; });

const WAIFU_BY_ID = {};
const WAIFUS_BY_RARITY = {};
RARITIES.forEach(r => { WAIFUS_BY_RARITY[r.id] = []; });
WAIFUS.forEach(w => {
  if (!RARITY_BY_ID[w.rarity]) {
    console.warn('Waifu com raridade inexistente, ignorada:', w.id, w.rarity);
    return;
  }
  WAIFU_BY_ID[w.id] = w;
  WAIFUS_BY_RARITY[w.rarity].push(w);
});
const ALL_WAIFUS = Object.values(WAIFU_BY_ID);


/* ===========================================================
   7. SAVESYSTEM
   Único ponto de contato com o armazenamento. Hoje usa o
   localStorage do navegador. No futuro, troque load/save/clear
   por chamadas ao seu backend ou ao disco (Electron).
   =========================================================== */

const SaveSystem = {
  createDefault() {
    return {
      coins: 0,
      totalRolls: 0,
      upgrades: { luck: 0, speed: 0 },
      collection: {},   // { idDaWaifu: quantidade }
      bestId: null,     // maior raridade já encontrada
      history: [],      // ids dos últimos giros, do mais novo para o mais velho
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.saveKey);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  },

  save(state) {
    try {
      localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
    } catch (err) {
      /* armazenamento cheio ou bloqueado: o jogo continua sem salvar */
    }
  },

  clear() {
    try { localStorage.removeItem(CONFIG.saveKey); } catch (err) { /* ignora */ }
  },

  /** Valida um save antigo/corrompido e completa o que faltar. */
  normalize(loaded) {
    const state = this.createDefault();
    if (!loaded || typeof loaded !== 'object') return state;

    const toInt = (v, max = Infinity) => Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;

    state.coins = toInt(loaded.coins);
    state.totalRolls = toInt(loaded.totalRolls);

    Object.keys(UPGRADES).forEach(id => {
      const saved = loaded.upgrades && loaded.upgrades[id];
      state.upgrades[id] = toInt(saved, UPGRADES[id].maxLevel);
    });

    if (loaded.collection && typeof loaded.collection === 'object') {
      Object.entries(loaded.collection).forEach(([id, count]) => {
        if (WAIFU_BY_ID[id] && Number.isFinite(count) && count > 0) state.collection[id] = Math.floor(count);
      });
    }

    if (Array.isArray(loaded.history)) {
      state.history = loaded.history.filter(id => WAIFU_BY_ID[id]).slice(0, CONFIG.historySize);
    }

    state.bestId = WAIFU_BY_ID[loaded.bestId] && state.collection[loaded.bestId]
      ? loaded.bestId
      : Engine.deriveBest(state.collection);

    return state;
  },
};


/* ===========================================================
   8. ENGINE — regras de sorteio (não mexe no DOM)
   =========================================================== */

const Engine = {
  luck(state)       { return UPGRADES.luck.value(state.upgrades.luck); },
  cooldownMs(state) { return UPGRADES.speed.value(state.upgrades.speed); },

  /**
   * Probabilidade real de cada raridade (mesma ordem de RARITIES),
   * já aplicando a sorte. Soma sempre 1.
   */
  chances(luck) {
    // Checa da mais rara para a mais comum (como nos RNGs do Roblox):
    // cada raridade tem uma chance base de 1/oddsN, multiplicada pela sorte.
    // Com sorte ×1 os valores batem exatamente com o "1 em N" da tabela.
    const n = RARITIES.length;
    const result = new Array(n).fill(0);
    let remaining = 1;   // probabilidade que ainda não foi "tirada" por raridades mais raras
    let rarerSum = 0;    // soma das chances base das raridades mais raras já processadas

    for (let i = n - 1; i >= 0; i--) {
      const r = RARITIES[i];
      if (r.oddsN) {
        const base = 1 / r.oddsN;
        const conditional = base / Math.max(1e-9, 1 - rarerSum);
        const hit = Math.min(1, conditional * luck);
        result[i] = remaining * hit;
        remaining -= result[i];
        rarerSum += base;
      } else {
        result[i] = remaining;   // a raridade "sobra" fica com o que restou
        remaining = 0;
      }
    }
    return result;
  },

  /** Sorteia o índice de uma raridade, checando da mais rara para a mais comum. */
  pickRarityIndex(luck) {
    const chances = this.chances(luck);
    let roll = Math.random();
    for (let i = chances.length - 1; i >= 0; i--) {
      roll -= chances[i];
      if (roll < 0) return i;
    }
    return 0;
  },

  /** Sorteia uma waifu da raridade. Se a raridade estiver vazia, desce para a anterior. */
  pickWaifu(rarityIndex) {
    for (let i = rarityIndex; i >= 0; i--) {
      const pool = WAIFUS_BY_RARITY[RARITIES[i].id];
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    for (let i = rarityIndex + 1; i < RARITIES.length; i++) {
      const pool = WAIFUS_BY_RARITY[RARITIES[i].id];
      if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
    }
    return ALL_WAIFUS[0];
  },

  /** Waifu de maior raridade dentro da coleção (usado só para consertar saves). */
  deriveBest(collection) {
    let best = null;
    ALL_WAIFUS.forEach(w => {
      if (!collection[w.id]) return;
      if (!best || RARITY_INDEX[w.rarity] > RARITY_INDEX[best.rarity]) best = w;
    });
    return best ? best.id : null;
  },
};


/* ===========================================================
   9. UI — tudo que toca na tela
   =========================================================== */

/** Aplica as cores de uma raridade a um elemento (e a seus filhos). */
function applyTheme(node, rarity) {
  node.style.setProperty('--rc', rarity.color);
  node.style.setProperty('--rbg', rarity.gradient || rarity.color);
  if (rarity.gradient) node.style.setProperty('--rsoft', rarity.gradient);
  else node.style.removeProperty('--rsoft');
}


/** Atualiza a atmosfera da página de acordo com a raridade revelada. */
function rarityThemeKey(rarity) {
  return {
    comum: 'common',
    rara: 'rare',
    epica: 'epic',
    lendaria: 'legendary',
    mitica: 'mythic',
    divina: 'divine',
  }[rarity.id] || 'common';
}

function applyPageRarity(rarity, reveal = false) {
  const body = document.body;
  if (!body) return;

  body.style.setProperty('--rarity-color', rarity.color);

  // Converte hex (#RRGGBB) para rgba sem depender de filtros/blur.
  const hex = rarity.color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) || 163;
  const g = parseInt(hex.slice(2, 4), 16) || 169;
  const b = parseInt(hex.slice(4, 6), 16) || 194;
  body.style.setProperty('--rarity-soft', `rgba(${r},${g},${b},.10)`);
  body.style.setProperty('--rarity-strong', `rgba(${r},${g},${b},.24)`);

  body.classList.remove(
    'rarity-common',
    'rarity-rare',
    'rarity-epic',
    'rarity-legendary',
    'rarity-mythic',
    'rarity-divine'
  );
  body.classList.add('rarity-' + rarityThemeKey(rarity));

  if (reveal) {
    body.classList.remove('rarity-reveal');
    void body.offsetWidth;
    body.classList.add('rarity-reveal');

    window.clearTimeout(UI._rarityTimer);
    UI._rarityTimer = window.setTimeout(() => {
      body.classList.remove('rarity-reveal');
    }, rarity.id === 'divina' ? 1150 : 900);
  }
}

function makeTag(rarity) {
  const tag = el('span', 'tag', rarity.name);
  applyTheme(tag, rarity);
  return tag;
}

/** Coloca a imagem da waifu (ou as iniciais, se não houver imagem) no retrato. */
function fillPortrait(container, waifu) {
  container.textContent = '';
  if (!waifu.image) {
    container.textContent = initials(waifu.name);
    return;
  }
  const img = new Image();
  img.alt = waifu.name;
  img.decoding = 'async';
  img.onerror = () => { img.remove(); container.textContent = initials(waifu.name); };
  img.src = waifu.image;
  container.appendChild(img);
}

const UI = {
  els: {},
  shopItems: {},
  cards: {},
  groupCounts: {},
  animToken: 0,
  pending: null,
  revealing: false,
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  _cd: { ready: null, transform: '', text: '' },
  _fxTimer: null,
  _rarityTimer: null,

  init() {
    const $ = id => document.getElementById(id);
    this.els = {
      coins: $('stat-coins'), luck: $('stat-luck'), cooldown: $('stat-cooldown'), rolls: $('stat-rolls'),
      card: $('result-card'), portrait: $('result-portrait'), tag: $('result-rarity'),
      name: $('result-name'), series: $('result-series'), reward: $('result-reward'), badge: $('result-new'),
      btnRoll: $('btn-roll'), cdFill: $('cooldown-fill'), cdText: $('cooldown-text'),
      btnAuto: $('btn-auto'), autoLabel: $('auto-label'), history: $('history'),
      tabs: document.querySelectorAll('[data-view]'),
      views: document.querySelectorAll('[data-view-name]'),
      shopList: $('shop-list'), oddsBody: $('odds-body'),
      sumOwned: $('sum-owned'), sumRolls: $('sum-rolls'), sumBest: $('sum-best'),
      groups: $('collection-groups'), flash: $('flash'), btnReset: $('btn-reset'),
      summon: $('summon-scene'), summonCount: document.querySelector('.summon-count'),
      summonRarity: document.querySelector('.summon-rarity'), summonName: document.querySelector('.summon-name'),
      summonStatus: document.querySelector('.summon-status'),
    };

    this.bindEvents();
    this.buildShop();
    this.buildCollection();
    this.renderAll();
  },

  bindEvents() {
    const e = this.els;
    e.btnRoll.addEventListener('click', () => Game.roll());
    e.btnAuto.addEventListener('click', () => Game.toggleAuto());
    e.btnReset.addEventListener('click', () => Game.reset());
    e.tabs.forEach(btn => btn.addEventListener('click', () => this.showView(btn.dataset.view)));
    e.shopList.addEventListener('click', ev => {
      const btn = ev.target.closest('[data-buy]');
      if (btn) Game.buy(btn.dataset.buy);
    });

    // Barra de espaço gira (se o foco não estiver em botão/campo)
    document.addEventListener('keydown', ev => {
      if (ev.code !== 'Space' || ev.repeat) return;
      if (ev.target.closest && ev.target.closest('button, input, textarea, select, a')) return;
      ev.preventDefault();
      Game.roll();
    });
  },

  /* ---------- Render geral ---------- */

  renderAll() {
    const s = Game.state;
    this.renderStats();
    this.renderHistory();
    this.updateShop();
    this.updateOdds();
    this.updateCollection();
    this.renderAuto(Game.auto);
    this.renderCooldown(0, Game.cooldownTotal);

    // Reexibe o último giro salvo
    const lastId = s.history[0];
    if (lastId) {
      this.els.card.classList.remove('is-empty');
      this.showWaifu(WAIFU_BY_ID[lastId], null);
    }
  },

  renderStats() {
    const s = Game.state;
    this.els.coins.textContent = fmt(s.coins);
    this.els.luck.textContent = UPGRADES.luck.format(Engine.luck(s));
    this.els.cooldown.textContent = UPGRADES.speed.format(Engine.cooldownMs(s));
    this.els.rolls.textContent = fmt(s.totalRolls);
  },

  renderHistory() {
    const list = this.els.history;
    list.textContent = '';
    Game.state.history.forEach(id => {
      const w = WAIFU_BY_ID[id];
      const chip = el('li', 'chip');
      applyTheme(chip, RARITY_BY_ID[w.rarity]);
      chip.append(el('span', 'chip-dot'), w.name);
      list.appendChild(chip);
    });
  },

  renderAuto(on) {
    this.els.btnAuto.setAttribute('aria-pressed', String(on));
    this.els.autoLabel.textContent = on ? 'Auto-roll ligado' : 'Auto-roll desligado';
    // Em auto-roll o leitor de tela não anuncia cada giro
    this.els.card.setAttribute('aria-live', on ? 'off' : 'polite');
  },

  /** Barra de cooldown e estado do botão. Só toca no DOM quando algo muda. */
  renderCooldown(remaining, total) {
    const ready = remaining <= 0;
    const progress = ready ? 1 : 1 - remaining / total;
    const transform = 'scaleX(' + progress.toFixed(3) + ')';
    const text = ready ? 'Pronto' : num(remaining / 1000, 1) + ' s';

    if (transform !== this._cd.transform) { this.els.cdFill.style.transform = transform; this._cd.transform = transform; }
    if (text !== this._cd.text) { this.els.cdText.textContent = text; this._cd.text = text; }
    if (ready !== this._cd.ready) { this.els.btnRoll.setAttribute('aria-disabled', String(!ready)); this._cd.ready = ready; }
  },

  showView(name) {
    this.els.tabs.forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.view === name)));
    this.els.views.forEach(view => { view.hidden = view.dataset.viewName !== name; });
  },

  /* ---------- Resultado do giro ---------- */

  /** Mostra uma waifu no cartão principal. reward null = não mostra moedas. */
  showWaifu(waifu, reward, reveal = false) {
    const rarity = RARITY_BY_ID[waifu.rarity];
    const e = this.els;
    applyTheme(e.card, rarity);
    applyPageRarity(rarity, reveal);
    e.card.classList.toggle('is-hot', RARITY_INDEX[rarity.id] >= CONFIG.hotRarityIndex);
    e.tag.textContent = rarity.name;
    e.name.textContent = waifu.name;
    e.series.textContent = waifu.series;
    e.reward.textContent = reward == null ? '' : '+' + fmt(reward) + ' moedas';
    fillPortrait(e.portrait, waifu);
  },

  summonSequence(result, duration, done) {
    const scene = this.els.summon;
    if (!scene || this.reduceMotion) { done(); return; }

    const key = rarityThemeKey(result.rarity);
    const idx = RARITY_INDEX[result.rarity.id];
    const intensity = Math.max(1, idx + 1);
    const rarity = this.els.summonRarity;
    const name = this.els.summonName;

    scene.className = 'summon-scene summon-' + key;
    scene.style.setProperty('--summon-color', result.rarity.color);
    scene.style.setProperty('--summon-power', intensity);
    scene.style.setProperty('--summon-duration', duration + 'ms');
    rarity.textContent = result.rarity.name.toUpperCase();
    name.textContent = result.waifu.name;
    name.hidden = true;
    rarity.hidden = true;

    scene.classList.add('active');
    document.body.classList.add('summon-lock');

    // Uma única pré-animação. Quando termina, a carta aparece imediatamente.
    const beat = Math.max(280, duration / 3);
    const t1 = window.setTimeout(() => { scene.classList.add('phase-charge'); }, beat);
    const t2 = window.setTimeout(() => { scene.classList.add('phase-break'); }, beat * 2);
    const t3 = window.setTimeout(() => { scene.classList.add('impact'); }, Math.min(duration - 80, beat * 2.8));
    const t4 = window.setTimeout(() => {
      window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3);
      scene.classList.remove('active', 'impact', 'revealed', 'phase-charge', 'phase-break');
      document.body.classList.remove('summon-lock');
      done();
    }, duration);
  },

  /**
   * Animação de girar: embaralha nomes/cores rapidamente e revela o resultado.
   * O sorteio já aconteceu antes (em Game.roll); aqui é só visual.
   */
  playRoll(result, cooldownMs) {
    if (this.pending || this.revealing) return;
    this.pending = result;
    this.revealing = true;

    const token = ++this.animToken;
    const e = this.els;
    e.card.classList.remove('is-empty', 'pop', 'shake', 'card-materializing', 'rarity-reveal-card');
    e.badge.hidden = true;

    // Pré-animação curta + carta longa o bastante para leitura.
    const preDurations = { comum: 720, rara: 760, epica: 800, lendaria: 840, mitica: 900, divina: 980 };
    const cardDurations = { comum: 920, rara: 960, epica: 1000, lendaria: 1060, mitica: 1120, divina: 1220 };
    const duration = this.reduceMotion ? 0 : Math.min(preDurations[result.rarity.id] || 800, Math.max(660, cooldownMs + 80));
    const cardDuration = this.reduceMotion ? 0 : (cardDurations[result.rarity.id] || 1000);
    const start = performance.now();

    const finish = () => {
      if (token !== this.animToken) return;
      e.card.classList.remove('is-rolling', 'pop', 'shake', 'card-materializing', 'rarity-reveal-card');
      this.showWaifu(result.waifu, result.coins, true);
      e.badge.hidden = !result.isNew;

      const idx = RARITY_INDEX[result.rarity.id];
      e.card.style.setProperty('--card-reveal-color', result.rarity.color);
      e.card.style.setProperty('--card-reveal-power', String(Math.max(1, idx + 1)));
      void e.card.offsetWidth;
      e.card.classList.add('card-materializing', 'rarity-reveal-card');

      this.triggerRarityFX(result.rarity);
      if (idx >= CONFIG.hotRarityIndex) this.flash(result.rarity);

      window.setTimeout(() => {
        if (token !== this.animToken) return;
        e.card.classList.remove('rarity-reveal-card', 'card-materializing');
        this.revealing = false;
        this.commit(result);
      }, cardDuration);
    };

    if (duration <= 0) {
      this.showWaifu(result.waifu, result.coins, true);
      e.badge.hidden = !result.isNew;
      this.revealing = false;
      this.commit(result);
      return;
    }

    e.card.classList.add('is-rolling');
    this.summonSequence(result, duration, finish);

    const spin = () => {
      if (token !== this.animToken) return;
      if (performance.now() - start >= duration) return;
      if (this.els.summon && this.els.summon.classList.contains('active')) {
        setTimeout(spin, 110);
        return;
      }
      const w = ALL_WAIFUS[Math.floor(Math.random() * ALL_WAIFUS.length)];
      const r = RARITY_BY_ID[w.rarity];
      applyTheme(e.card, r);
      e.tag.textContent = r.name;
      e.name.textContent = w.name;
      e.series.textContent = '';
      e.reward.textContent = '';
      e.portrait.textContent = initials(w.name);
      setTimeout(spin, 110);
    };
    spin();
  },

  /** Atualiza contadores, histórico e coleção depois que o giro foi revelado. */
  commit(result) {
    if (this.pending !== result) return;
    this.pending = null;
    this.renderStats();
    this.renderHistory();
    this.updateCollection();
    this.updateShop();
  },

  flash(rarity) {
    const f = this.els.flash;
    applyTheme(f, rarity);
    f.classList.remove('on');
    void f.offsetWidth;
    f.classList.add('on');
  },

  /** Explosão visual da raridade: curta, intensa e baseada em transform/opacity. */
  triggerRarityFX(rarity) {
    const body = document.body;
    const root = document.querySelector('.rarity-fx');
    if (!root) return;

    const idx = RARITY_INDEX[rarity.id];
    const strength = [1, 1.15, 1.35, 1.65, 2.05, 2.7][idx] || 1;
    root.style.setProperty('--fx-color', rarity.color);
    root.style.setProperty('--fx-power', String(strength));
    root.dataset.rarity = rarity.id;

    root.replaceChildren();
    const count = [3, 4, 4, 5, 6, 7][idx] || 3;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      p.className = 'fx-particle';
      p.style.setProperty('--a', (360 / count * i + (Math.random() * 18 - 9)) + 'deg');
      p.style.setProperty('--d', (70 + Math.random() * 300 * strength) + 'px');
      p.style.setProperty('--s', (0.55 + Math.random() * 1.35) * strength);
      p.style.setProperty('--delay', (Math.random() * 110) + 'ms');
      p.style.setProperty('--dur', (420 + Math.random() * 420 / strength) + 'ms');
      p.textContent = i % 5 === 0 ? '✦' : '◆';
      root.appendChild(p);
    }

    root.classList.remove('burst');
    body.classList.remove('rarity-camera-hit');
    void root.offsetWidth;
    void body.offsetWidth;
    root.classList.add('burst');
    body.classList.add('rarity-camera-hit');

    window.clearTimeout(this._fxTimer);
    this._fxTimer = window.setTimeout(() => {
      root.classList.remove('burst');
      body.classList.remove('rarity-camera-hit');
      root.replaceChildren();
    }, idx === 5 ? 1500 : 950);
  },

  /* ---------- Loja ---------- */

  buildShop() {
    const list = this.els.shopList;
    list.textContent = '';
    Object.entries(UPGRADES).forEach(([id, up]) => {
      const item = el('li', 'shop-item');
      const head = el('div', 'shop-head');
      const level = el('span', 'shop-level');
      head.append(el('h3', 'shop-title', up.name), level);

      const value = el('p', 'shop-value');
      const btn = el('button', 'btn-buy');
      btn.type = 'button';
      btn.dataset.buy = id;

      item.append(head, el('p', 'shop-desc', up.description), value, btn);
      list.appendChild(item);
      this.shopItems[id] = { level, value, btn };
    });
  },

  updateShop() {
    const s = Game.state;
    Object.entries(UPGRADES).forEach(([id, up]) => {
      const ui = this.shopItems[id];
      const level = s.upgrades[id];
      const maxed = level >= up.maxLevel;

      ui.level.textContent = 'Nível ' + level + ' de ' + up.maxLevel;
      ui.value.textContent = maxed
        ? 'Agora: ' + up.format(up.value(level))
        : 'Agora: ' + up.format(up.value(level)) + '. Próximo nível: ' + up.format(up.value(level + 1)) + '.';

      if (maxed) {
        ui.btn.textContent = 'Nível máximo';
        ui.btn.disabled = true;
      } else {
        const cost = upgradeCost(id, level);
        ui.btn.textContent = 'Comprar por ' + fmt(cost) + ' moedas';
        ui.btn.disabled = s.coins < cost;
      }
    });
  },

  /* ---------- Chances ---------- */

  updateOdds() {
    const chances = Engine.chances(Engine.luck(Game.state));
    const body = this.els.oddsBody;
    body.textContent = '';
    RARITIES.forEach((r, i) => {
      const row = el('tr');
      const nameCell = el('td');
      nameCell.appendChild(makeTag(r));

      const chanceCell = el('td');
      chanceCell.append(formatOdds(chances[i]), el('br'), el('small', '', formatPercent(chances[i])));

      row.append(nameCell, chanceCell, el('td', '', '+' + fmt(r.coins)));
      body.appendChild(row);
    });
  },

  /* ---------- Coleção ---------- */

  buildCollection() {
    const root = this.els.groups;
    root.textContent = '';
    this.cards = {};
    this.groupCounts = {};

    for (let i = RARITIES.length - 1; i >= 0; i--) {   // da mais rara para a mais comum
      const rarity = RARITIES[i];
      const list = WAIFUS_BY_RARITY[rarity.id];
      if (!list.length) continue;

      const group = el('section', 'rarity-group');
      const head = el('h3', 'group-head');
      const count = el('span', 'group-count');
      head.append(makeTag(rarity), count);
      this.groupCounts[rarity.id] = count;

      const grid = el('div', 'grid');
      list.forEach(waifu => {
        const card = this.makeMiniCard(waifu, rarity);
        this.cards[waifu.id] = card;
        grid.appendChild(card.root);
      });

      group.append(head, grid);
      root.appendChild(group);
    }
  },

  makeMiniCard(waifu, rarity) {
    const root = el('article', 'mini is-locked');
    applyTheme(root, rarity);
    const portrait = el('div', 'portrait', '?');
    const name = el('div', 'mini-name', '???');
    const count = el('span', 'mini-count');
    count.hidden = true;
    root.append(portrait, name, count);
    return { root, portrait, name, count, shown: -1, waifu };
  },

  updateCollection() {
    const s = Game.state;
    let owned = 0;

    ALL_WAIFUS.forEach(w => {
      const n = s.collection[w.id] || 0;
      if (n > 0) owned++;
      const card = this.cards[w.id];
      if (!card || card.shown === n) return;      // só mexe no DOM se mudou
      card.shown = n;

      card.root.classList.toggle('is-locked', n === 0);
      card.count.hidden = n === 0;
      card.count.textContent = '×' + fmt(n);
      if (n === 0) {
        card.portrait.textContent = '?';
        card.name.textContent = '???';
      } else {
        card.name.textContent = w.name;
        if (!card.portrait.firstChild || card.portrait.textContent === '?') fillPortrait(card.portrait, w);
      }
    });

    RARITIES.forEach(r => {
      const label = this.groupCounts[r.id];
      if (!label) return;
      const list = WAIFUS_BY_RARITY[r.id];
      const got = list.filter(w => s.collection[w.id]).length;
      label.textContent = got + ' de ' + list.length;
    });

    this.els.sumOwned.textContent = owned + ' de ' + ALL_WAIFUS.length;
    this.els.sumRolls.textContent = fmt(s.totalRolls);

    const best = WAIFU_BY_ID[s.bestId];
    if (best) {
      this.els.sumBest.replaceChildren(makeTag(RARITY_BY_ID[best.rarity]), best.name);
    } else {
      this.els.sumBest.textContent = 'Nenhum ainda';
    }
  },
};


/* ===========================================================
   10. GAME — estado, loop e ações do jogador
   =========================================================== */

const Game = {
  state: null,
  auto: false,
  nextRollAt: 0,        // performance.now() em que o próximo giro é liberado
  cooldownTotal: CONFIG.baseCooldownMs,
  dirty: false,
  skipSave: false,

  init() {
    this.state = SaveSystem.normalize(SaveSystem.load());
    this.cooldownTotal = Engine.cooldownMs(this.state);
    UI.init();

    setInterval(() => this.tick(), CONFIG.tickMs);
    setInterval(() => this.save(), CONFIG.autosaveMs);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save(true);
    });
    window.addEventListener('pagehide', () => this.save(true));
  },

  /** Roda a cada CONFIG.tickMs: atualiza a barra e dispara o auto-roll. */
  tick() {
    const remaining = Math.max(0, this.nextRollAt - performance.now());
    UI.renderCooldown(remaining, this.cooldownTotal);
    if (this.auto && remaining === 0 && !UI.pending) this.roll();
  },

  /** Faz um giro (manual ou automático). Ignorado se ainda estiver em cooldown. */
  roll() {
    const now = performance.now();
    if (now < this.nextRollAt) return;

    const s = this.state;
    const rarityIndex = Engine.pickRarityIndex(Engine.luck(s));
    const waifu = Engine.pickWaifu(rarityIndex);
    const rarity = RARITY_BY_ID[waifu.rarity];

    const isNew = !s.collection[waifu.id];
    s.collection[waifu.id] = (s.collection[waifu.id] || 0) + 1;
    s.totalRolls += 1;
    s.coins += rarity.coins;

    const bestWaifu = WAIFU_BY_ID[s.bestId];
    if (!bestWaifu || RARITY_INDEX[rarity.id] >= RARITY_INDEX[bestWaifu.rarity]) s.bestId = waifu.id;

    s.history.unshift(waifu.id);
    if (s.history.length > CONFIG.historySize) s.history.length = CONFIG.historySize;

    this.cooldownTotal = Engine.cooldownMs(s);
    this.nextRollAt = now + this.cooldownTotal;
    this.dirty = true;

    UI.playRoll({ waifu, rarity, isNew, coins: rarity.coins }, this.cooldownTotal);
  },

  toggleAuto() {
    this.auto = !this.auto;
    UI.renderAuto(this.auto);
  },

  buy(id) {
    const up = UPGRADES[id];
    const s = this.state;
    if (!up) return;

    const level = s.upgrades[id];
    if (level >= up.maxLevel) return;
    const cost = upgradeCost(id, level);
    if (s.coins < cost) return;

    s.coins -= cost;
    s.upgrades[id] = level + 1;
    this.dirty = true;

    UI.renderStats();
    UI.updateShop();
    UI.updateOdds();
    this.save(true);
  },

  save(force = false) {
    if (this.skipSave) return;
    if (!this.dirty && !force) return;
    SaveSystem.save(this.state);
    this.dirty = false;
  },

  reset() {
    if (!confirm('Apagar todo o progresso? Isso não pode ser desfeito.')) return;
    this.skipSave = true;
    SaveSystem.clear();
    location.reload();
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
