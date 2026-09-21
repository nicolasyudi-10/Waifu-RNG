/* =========================================================
   WAIFU RNG — VANILLA JS
   ========================================================= */

"use strict";

// ---------------------------------------------------------
// Banco de dados mock
// ---------------------------------------------------------

const WAIFUS = [
  {
    id: 1,
    nome: "Miku Nakano",
    anime: "The Quintessential Quintuplets",
    raridade: "Épica",
    imagemUrl: "https://placehold.co/600x800/25183f/f0e7ff?text=Miku%20Nakano",
    descricaoCurta: "A quintupleta reservada que ama história e encontra conforto em seus fones de ouvido."
  },
  {
    id: 2,
    nome: "Nino Nakano",
    anime: "The Quintessential Quintuplets",
    raridade: "Rara",
    imagemUrl: "https://placehold.co/600x800/3a182c/ffe8f2?text=Nino%20Nakano",
    descricaoCurta: "Confiante e direta, Nino protege ferozmente as pessoas que ama."
  },
  {
    id: 3,
    nome: "Yotsuba Nakano",
    anime: "The Quintessential Quintuplets",
    raridade: "Comum",
    imagemUrl: "https://placehold.co/600x800/183a2e/e4fff4?text=Yotsuba%20Nakano",
    descricaoCurta: "Energética e otimista, Yotsuba está sempre pronta para ajudar."
  },
  {
    id: 4,
    nome: "Itsuki Nakano",
    anime: "The Quintessential Quintuplets",
    raridade: "Rara",
    imagemUrl: "https://placehold.co/600x800/3d2520/fff0e7?text=Itsuki%20Nakano",
    descricaoCurta: "Determinada e estudiosa, Itsuki leva seus objetivos a sério."
  },
  {
    id: 5,
    nome: "Kaguya Shinomiya",
    anime: "Kaguya-sama: Love is War",
    raridade: "Lendária",
    imagemUrl: "https://placehold.co/600x800/3d1725/fff0b8?text=Kaguya%20Shinomiya",
    descricaoCurta: "Uma prodígio da elite que transforma cada conversa em uma batalha estratégica."
  },
  {
    id: 6,
    nome: "Chika Fujiwara",
    anime: "Kaguya-sama: Love is War",
    raridade: "Épica",
    imagemUrl: "https://placehold.co/600x800/38224d/f4e5ff?text=Chika%20Fujiwara",
    descricaoCurta: "Carismática, imprevisível e dona de uma energia que muda qualquer ambiente."
  },
  {
    id: 7,
    nome: "Hitori Gotoh",
    anime: "Bocchi the Rock!",
    raridade: "Comum",
    imagemUrl: "https://placehold.co/600x800/202c48/e9f3ff?text=Hitori%20Gotoh",
    descricaoCurta: "A guitarrista tímida conhecida como Bocchi, que se expressa através da música."
  },
  {
    id: 8,
    nome: "Nijika Ijichi",
    anime: "Bocchi the Rock!",
    raridade: "Comum",
    imagemUrl: "https://placehold.co/600x800/3b2920/fff0df?text=Nijika%20Ijichi",
    descricaoCurta: "A baterista alegre que mantém a Kessoku Band unida com seu espírito acolhedor."
  },
  {
    id: 9,
    nome: "Mai Sakurajima",
    anime: "Rascal Does Not Dream of Bunny Girl Senpai",
    raridade: "Lendária",
    imagemUrl: "https://placehold.co/600x800/30243e/f4edff?text=Mai%20Sakurajima",
    descricaoCurta: "Uma atriz admirada por todos, com uma personalidade madura e observadora."
  },
  {
    id: 10,
    nome: "Marin Kitagawa",
    anime: "My Dress-Up Darling",
    raridade: "Épica",
    imagemUrl: "https://placehold.co/600x800/421c3c/fff0fb?text=Marin%20Kitagawa",
    descricaoCurta: "Apaixonada por cosplay, Marin encara seus hobbies com entusiasmo contagiante."
  },
  {
    id: 11,
    nome: "Zero Two",
    anime: "Darling in the Franxx",
    raridade: "Lendária",
    imagemUrl: "https://placehold.co/600x800/451d35/fff0f4?text=Zero%20Two",
    descricaoCurta: "Uma piloto misteriosa e determinada, conhecida por sua personalidade marcante."
  },
  {
    id: 12,
    nome: "Nino Nakano — Festival",
    anime: "The Quintessential Quintuplets",
    raridade: "Rara",
    imagemUrl: "https://placehold.co/600x800/3d1d31/fff0f7?text=Nino%20Festival",
    descricaoCurta: "Uma variação especial de Nino com visual de festival e espírito competitivo."
  }
];

const RARITIES = [
  { nome: "Comum", chance: 50, className: "common" },
  { nome: "Rara", chance: 30, className: "rare" },
  { nome: "Épica", chance: 15, className: "epic" },
  { nome: "Lendária", chance: 5, className: "legendary" }
];

const RARITY_COST = 10;
const DAILY_REWARD = 50;
const STORAGE_KEY = "waifuRngStateV1";

// ---------------------------------------------------------
// Estado
// ---------------------------------------------------------

const defaultState = {
  gems: 100,
  rolls: 0,
  obtained: [],
  legendaryCount: 0,
  epicCount: 0,
  lastResultId: null,
  lastDailyClaim: null
};

let state = loadState();
let activeFilter = "all";
let currentResult = null;
let toastTimer = null;

// ---------------------------------------------------------
// DOM
// ---------------------------------------------------------

const $ = (selector) => document.querySelector(selector);

const elements = {
  gemCount: $("#gemCount"),
  rollCount: $("#rollCount"),
  collectionCount: $("#collectionCount"),
  legendaryCount: $("#legendaryCount"),
  epicCount: $("#epicCount"),
  progressText: $("#progressText"),
  progressPercent: $("#progressPercent"),
  progressBar: $("#progressBar"),
  rollButton: $("#rollButton"),
  freeGemsButton: $("#freeGemsButton"),
  dailyStatus: $("#dailyStatus"),
  errorMessage: $("#errorMessage"),
  collectionGrid: $("#collectionGrid"),
  collectionFilters: $("#collectionFilters"),
  summonPanel: $("#summonPanel"),
  summonStatus: $("#summonStatus"),
  lastResult: $("#lastResult"),
  lastResultTitle: $("#lastResultTitle"),
  lastRarity: $("#lastRarity"),
  modal: $("#resultModal"),
  modalCard: $("#resultModalCard"),
  modalImage: $("#modalImage"),
  modalImageWrap: $("#modalImageWrap"),
  modalRarity: $("#modalRarity"),
  modalName: $("#modalName"),
  modalAnime: $("#modalAnime"),
  modalDescription: $("#modalDescription"),
  modalId: $("#modalId"),
  modalAction: $("#modalAction"),
  closeModal: $("#closeModal"),
  toast: $("#toast")
};

// ---------------------------------------------------------
// Persistência
// ---------------------------------------------------------

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ...defaultState };

    const parsed = JSON.parse(saved);

    return {
      ...defaultState,
      ...parsed,
      gems: Number.isFinite(parsed.gems) ? parsed.gems : defaultState.gems,
      rolls: Number.isFinite(parsed.rolls) ? parsed.rolls : 0,
      obtained: Array.isArray(parsed.obtained) ? parsed.obtained : []
    };
  } catch (error) {
    console.warn("Não foi possível carregar o save:", error);
    return { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Não foi possível salvar o estado:", error);
  }
}

// ---------------------------------------------------------
// Utilitários
// ---------------------------------------------------------

function rarityMeta(rarity) {
  return RARITIES.find(item => item.nome === rarity) || RARITIES[0];
}

function getWaifuById(id) {
  return WAIFUS.find(waifu => waifu.id === id);
}

function hasObtained(id) {
  return state.obtained.includes(id);
}

function showError(message = "") {
  elements.errorMessage.textContent = message;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2400);
}

function getTodayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

// ---------------------------------------------------------
// RNG ponderado
// ---------------------------------------------------------

function rollRarity() {
  const random = Math.random() * 100;
  let accumulated = 0;

  for (const rarity of RARITIES) {
    accumulated += rarity.chance;
    if (random < accumulated) {
      return rarity.nome;
    }
  }

  return RARITIES[RARITIES.length - 1].nome;
}

function rollWaifu() {
  const rarity = rollRarity();
  const pool = WAIFUS.filter(waifu => waifu.raridade === rarity);

  if (!pool.length) {
    throw new Error(`Nenhuma waifu encontrada para a raridade "${rarity}".`);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------
// Renderização
// ---------------------------------------------------------

function updateUI() {
  const obtainedCount = state.obtained.length;

  elements.gemCount.textContent = state.gems;
  elements.rollCount.textContent = state.rolls;
  elements.collectionCount.textContent = `${obtainedCount}/${WAIFUS.length}`;
  elements.legendaryCount.textContent = state.legendaryCount;
  elements.epicCount.textContent = state.epicCount;

  const percent = Math.round((obtainedCount / WAIFUS.length) * 100);
  elements.progressText.textContent = `${obtainedCount} / ${WAIFUS.length} obtidas`;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;

  const canClaim = state.lastDailyClaim !== getTodayKey();
  elements.freeGemsButton.classList.toggle("claimed", !canClaim);
  elements.freeGemsButton.disabled = !canClaim;
  elements.dailyStatus.textContent = canClaim
    ? `+${DAILY_REWARD} gemas · disponível agora`
    : "Recompensa já coletada hoje";

  elements.rollButton.disabled = state.gems < RARITY_COST;

  renderCollection();
}

function renderCollection() {
  const filtered = activeFilter === "all"
    ? WAIFUS
    : WAIFUS.filter(waifu => waifu.raridade === activeFilter);

  elements.collectionGrid.innerHTML = filtered.map(waifu => {
    const unlocked = hasObtained(waifu.id);
    const meta = rarityMeta(waifu.raridade);

    return `
      <article class="waifu-card ${unlocked ? "" : "locked"}">
        ${unlocked ? "" : '<span class="lock-icon">🔒</span>'}
        <img
          class="waifu-image"
          src="${escapeAttribute(waifu.imagemUrl)}"
          alt="${escapeAttribute(unlocked ? waifu.nome : "Waifu bloqueada")}"
          loading="lazy"
        >
        <div class="waifu-info">
          <h3>${escapeHTML(unlocked ? waifu.nome : "???")}</h3>
          <p>${escapeHTML(unlocked ? waifu.anime : "Descubra esta personagem para revelar os dados.")}</p>
          <span class="card-rarity ${meta.className}">${meta.nome.toUpperCase()}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderLastResult(waifu) {
  const meta = rarityMeta(waifu.raridade);

  elements.lastResultTitle.textContent = waifu.nome;
  elements.lastRarity.textContent = meta.nome.toUpperCase();
  elements.lastRarity.className = `rarity-badge ${meta.className}`;

  elements.lastResult.innerHTML = `
    <div class="last-card reveal">
      <img src="${escapeAttribute(waifu.imagemUrl)}" alt="${escapeAttribute(waifu.nome)}">
      <div class="last-card-info">
        <h3>${escapeHTML(waifu.nome)}</h3>
        <p>${escapeHTML(waifu.anime)}</p>
        <span class="card-rarity ${meta.className}">${meta.nome.toUpperCase()}</span>
      </div>
    </div>
  `;
}

function renderDailyButton() {
  updateUI();
}

// ---------------------------------------------------------
// Modal de resultado
// ---------------------------------------------------------

function openResultModal(waifu) {
  currentResult = waifu;
  const meta = rarityMeta(waifu.raridade);

  elements.modalCard.className = `result-modal rarity-${meta.className}`;
  elements.modalImage.src = waifu.imagemUrl;
  elements.modalImage.alt = waifu.nome;
  elements.modalName.textContent = waifu.nome;
  elements.modalAnime.textContent = waifu.anime;
  elements.modalDescription.textContent = waifu.descricaoCurta;
  elements.modalRarity.textContent = meta.nome.toUpperCase();
  elements.modalId.textContent = `#${String(waifu.id).padStart(3, "0")}`;

  const alreadyOwned = hasObtained(waifu.id);
  elements.modalAction.textContent = alreadyOwned
    ? "Personagem já está no Waifudex"
    : "Adicionar ao Waifudex";
  elements.modalAction.disabled = alreadyOwned;
  elements.modalAction.style.opacity = alreadyOwned ? ".5" : "1";

  elements.modal.classList.add("show");
  elements.modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeResultModal() {
  elements.modal.classList.remove("show");
  elements.modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  currentResult = null;
}

// ---------------------------------------------------------
// Ações do jogo
// ---------------------------------------------------------

async function performRoll() {
  showError("");

  if (state.gems < RARITY_COST) {
    showError(`Gemas insuficientes. Você precisa de ${RARITY_COST} gemas.`);
    showToast("Gemas insuficientes!");
    return;
  }

  if (elements.rollButton.disabled) return;

  elements.rollButton.disabled = true;
  elements.summonPanel.classList.add("summoning");
  elements.summonStatus.textContent = "INVOCANDO...";
  elements.summonCore?.classList.add("summoning");

  // Pequeno suspense antes da revelação.
  await wait(1050);

  try {
    const waifu = rollWaifu();

    state.gems -= RARITY_COST;
    state.rolls += 1;
    state.lastResultId = waifu.id;

    if (!hasObtained(waifu.id)) {
      state.obtained.push(waifu.id);
    }

    if (waifu.raridade === "Lendária") state.legendaryCount += 1;
    if (waifu.raridade === "Épica") state.epicCount += 1;

    saveState();
    updateUI();
    renderLastResult(waifu);

    elements.summonStatus.textContent = `${waifu.raridade.toUpperCase()} ENCONTRADA`;
    openResultModal(waifu);
  } catch (error) {
    console.error(error);
    showError("Ocorreu um erro ao realizar a invocação.");
    showToast("Falha na invocação.");
  } finally {
    elements.summonPanel.classList.remove("summoning");
    elements.summonCore?.classList.remove("summoning");
    elements.rollButton.disabled = state.gems < RARITY_COST;
  }
}

function claimDailyGems() {
  showError("");

  const today = getTodayKey();

  if (state.lastDailyClaim === today) {
    showToast("Você já coletou a recompensa de hoje.");
    return;
  }

  state.gems += DAILY_REWARD;
  state.lastDailyClaim = today;

  saveState();
  updateUI();
  showToast(`+${DAILY_REWARD} gemas adicionadas à carteira!`);
}

function addCurrentToCollection() {
  if (!currentResult) return;

  if (!hasObtained(currentResult.id)) {
    state.obtained.push(currentResult.id);
    saveState();
    updateUI();
    showToast(`${currentResult.nome} adicionada ao Waifudex!`);
  }

  closeResultModal();
}

// ---------------------------------------------------------
// Eventos
// ---------------------------------------------------------

elements.rollButton.addEventListener("click", performRoll);
elements.freeGemsButton.addEventListener("click", claimDailyGems);
elements.closeModal.addEventListener("click", closeResultModal);
elements.modalAction.addEventListener("click", addCurrentToCollection);

elements.modal.addEventListener("click", (event) => {
  if (event.target === elements.modal) closeResultModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.modal.classList.contains("show")) {
    closeResultModal();
  }
});

elements.collectionFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;

  activeFilter = button.dataset.filter;

  document.querySelectorAll(".filter").forEach(filter => {
    filter.classList.toggle("active", filter === button);
  });

  renderCollection();
});

// ---------------------------------------------------------
// Segurança: escape básico para dados renderizados no HTML.
// ---------------------------------------------------------

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------
// Inicialização
// ---------------------------------------------------------

function init() {
  updateUI();

  if (state.lastResultId) {
    const lastWaifu = getWaifuById(state.lastResultId);
    if (lastWaifu) renderLastResult(lastWaifu);
  }
}

init();
