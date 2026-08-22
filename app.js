/**
 * Ko Sam Ja? — Kompletna logika kviza bez eksternih zavisnosti
 * Podržava Base64 odgovore, Web Audio sintetizator, Daily/Free modove,
 * Canvas Confetti i Wordle-Style dijeljenje rezultata.
 */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const dom = {
  daily: $('#btn-mode-daily'),
  free: $('#btn-mode-free'),
  sound: $('#btn-sound-toggle'),
  soundIcon: $('#sound-icon'),
  mode: $('#stat-mode-name'),
  points: $('#stat-current-points'),
  streak: $('#stat-streak'),
  total: $('#stat-total-score'),
  gameCard: $('.game-card'),
  categoryEmblem: $('#category-emblem'),
  categoryPanel: $('#category-panel'),
  categoryToggle: $('#category-toggle'),
  categoryBadge: $('#active-category-badge'),
  categoryList: $('#category-filter-list'),
  categoryListWrap: $('#category-list-wrap'),
  difficultyList: $('#difficulty-list'),
  questionCategoryTitle: $('#question-category-title'),
  questionDifficultyBadge: $('#question-difficulty-badge'),
  questionNumber: $('#question-number'),
  clueCount: $('#clues-revealed-count'),
  clues: $('#clues-container'),
  form: $('#guess-form'),
  input: $('#guess-input'),
  inputWrapper: $('#input-wrapper'),
  feedback: $('#feedback-msg'),
  reveal: $('#btn-reveal-clue'),
  skip: $('#btn-skip'),
  overlay: $('#modal-overlay'),
  closeModal: $('#btn-modal-close'),
  modalIcon: $('#modal-icon'),
  modalTitle: $('#modal-title'),
  modalSubtitle: $('#modal-subtitle'),
  modalAnswer: $('#modal-answer'),
  modalPoints: $('#modal-points'),
  modalClues: $('#modal-clues-used'),
  matrix: $('#modal-clue-matrix'),
  dailyMessage: $('#daily-timer-msg'),
  dailyCountdown: $('#daily-countdown'),
  dailyCountdownResult: $('#daily-countdown-result'),
  dailyCountdownTimer: $('#daily-countdown-timer'),
  secondaryActions: $('.secondary-actions'),
  share: $('#btn-share'),
  next: $('#btn-next-question'),
  help: $('#btn-help'),
  rulesOverlay: $('#rules-modal-overlay'),
  closeRules: $('#btn-rules-close'),
  rulesOk: $('#btn-rules-ok'),
  toast: $('#toast'),
  toastMessage: $('#toast-message')
};

const state = {
  questions: [],
  mode: 'daily',
  category: 'Sve',
  difficulty: 'sve',
  question: null,
  unlocked: 1,
  points: 5,
  questionNumber: 1,
  result: null,
  total: Number.parseInt(localStorage.getItem('ko_sam_ja_total_score') || '0', 10),
  streak: Number.parseInt(localStorage.getItem('ko_sam_ja_streak') || '0', 10),
  muted: localStorage.getItem('ko_sam_ja_muted') === 'true',
  freeOrder: [],
  freePosition: 0
};

const DIFFICULTY_LABELS = { easy: 'Lako', medium: 'Srednje', hard: 'Teško' };

// --- Web Audio Synthesizer ---
class SoundManager {
  constructor() { 
    this.context = null; 
  }

  start() {
    if (state.muted) return null;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.context = new AudioContext();
    }
    if (this.context?.state === 'suspended') this.context.resume();
    return this.context;
  }

  tone(frequency, duration, type = 'sine', delay = 0) {
    const context = this.start();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  success() {
    [523, 659, 784, 1047].forEach((frequency, index) => this.tone(frequency, 0.25, 'triangle', index * 0.07));
  }
  wrong() { 
    this.tone(180, 0.25, 'sawtooth'); 
  }
  unlock() { 
    this.tone(420, 0.14, 'square'); 
    this.tone(720, 0.2, 'square', 0.08); 
  }
}

const sound = new SoundManager();

// --- Normalizacija i Base64 ---
function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('bs-BA')
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function decodeBase64(value) {
  try {
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return value;
  }
}

function getAcceptedAnswers(question) {
  const aliases = Array.isArray(question.aliasEnc) ? question.aliasEnc : [];
  return [decodeBase64(question.odgovorEnc), ...aliases.map(decodeBase64)];
}

// Svodi strane pravopisne obrasce na približan bosanski fonetski zapis,
// tako da npr. "Thierry Henry" i "Tijeri Enri" postanu uporedivi.
function phoneticKey(normalized) {
  return normalized
    .replace(/tch/g, 'č')
    .replace(/sch/g, 'š')
    .replace(/sh/g, 'š')
    .replace(/ch/g, 'č')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/kh/g, 'h')
    .replace(/qu/g, 'kv')
    .replace(/ck/g, 'k')
    .replace(/wh/g, 'v')
    .replace(/oo/g, 'u')
    .replace(/ee/g, 'i')
    .replace(/ea/g, 'i')
    .replace(/ou/g, 'u')
    .replace(/ai/g, 'aj')
    .replace(/ey/g, 'i')
    .replace(/ay/g, 'aj')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/q/g, 'k')
    .replace(/(.)\1+/g, '$1');
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let previous = Array.from({ length: n + 1 }, (_, i) => i);
  let current = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    current[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }
    [previous, current] = [current, previous];
  }
  return previous[n];
}

function fuzzyMatchTolerance(length) {
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  if (length <= 11) return 2;
  return 3;
}

function isCorrectGuess(guess, question) {
  const accepted = getAcceptedAnswers(question);
  const normalizedGuess = normalize(guess);
  if (normalizedGuess.length === 0) return false;
  const phoneticGuess = phoneticKey(normalizedGuess);

  return accepted.some((answer) => {
    const normalizedAnswer = normalize(answer);
    if (normalizedAnswer === normalizedGuess) return true;

    const tolerance = Math.min(
      fuzzyMatchTolerance(normalizedAnswer.length),
      fuzzyMatchTolerance(normalizedGuess.length)
    );
    if (tolerance > 0 && levenshtein(normalizedAnswer, normalizedGuess) <= tolerance) return true;

    const phoneticAnswer = phoneticKey(normalizedAnswer);
    if (phoneticAnswer === phoneticGuess) return true;

    const phoneticTolerance = Math.min(
      fuzzyMatchTolerance(phoneticAnswer.length),
      fuzzyMatchTolerance(phoneticGuess.length)
    );
    if (phoneticTolerance > 0 && levenshtein(phoneticAnswer, phoneticGuess) <= phoneticTolerance) return true;

    return false;
  });
}

// Jednostavan deterministički PRNG (mulberry32) sjemenjen datumom, tako da
// svi igrači dobiju isti "nasumični" izbor kategorije/težine tog dana.
function seededRandom(seed) {
  let t = seed + 0x6D2B79F5;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function getDailySeed() {
  return Math.floor(Date.now() / 86400000);
}

function getDailyQuestion() {
  const dayIndex = getDailySeed();
  const random = seededRandom(dayIndex);

  const categories = [...new Set(state.questions.map((q) => q.kategorija))];
  const difficulties = ['easy', 'medium', 'hard'];
  const category = categories[Math.floor(random() * categories.length)];
  const difficulty = difficulties[Math.floor(random() * difficulties.length)];

  let pool = state.questions.filter((q) => q.kategorija === category && q.tezina === difficulty);
  if (!pool.length) pool = state.questions.filter((q) => q.kategorija === category);
  if (!pool.length) pool = state.questions;

  const question = pool[dayIndex % pool.length];
  return { question, category, difficulty };
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyStorageKey() {
  return `ko_sam_ja_daily_${getTodayKey()}`;
}

function readDailyResult() {
  try { 
    return JSON.parse(localStorage.getItem(getDailyStorageKey()) || 'null'); 
  } catch { 
    return null; 
  }
}

function saveStats() {
  localStorage.setItem('ko_sam_ja_total_score', String(state.total));
  localStorage.setItem('ko_sam_ja_streak', String(state.streak));
}

function pointsLabel(points) {
  return `${points} ${points === 1 ? 'bod' : points < 5 ? 'boda' : 'bodova'}`;
}

function popValue(el) {
  if (!el) return;
  el.classList.remove('value-pop');
  void el.offsetWidth;
  el.classList.add('value-pop');
}

function updateStats() {
  dom.mode.textContent = state.mode === 'daily' ? 'Dnevni izazov' : 'Slobodna igra';
  dom.points.textContent = state.points;

  if (dom.streak.dataset.value !== String(state.streak)) {
    dom.streak.dataset.value = String(state.streak);
    dom.streak.textContent = state.streak;
    popValue(dom.streak);
  }
  if (dom.total.dataset.value !== String(state.total)) {
    dom.total.dataset.value = String(state.total);
    dom.total.textContent = state.total;
    popValue(dom.total);
  }

  dom.categoryBadge.textContent = state.category;
  dom.daily.classList.toggle('active', state.mode === 'daily');
  dom.free.classList.toggle('active', state.mode === 'free');
}

const CATEGORY_ICONS = {
  'Sve': '🎭',
  'Sport': '⚽',
  'Geografija': '🌍',
  'Historija': '🏛️',
  'Film i muzika': '🎬',
  'Tehnologija': '💻',
  'Nauka': '🔬',
  'Književnost i umjetnost': '📖'
};

// --- Renderovanje ---
function renderClues(justUnlocked = 0) {
  if (!state.question) return;
  dom.clues.innerHTML = '';
  dom.questionCategoryTitle.textContent = state.question.kategorija || 'Ko sam ja?';
  if (dom.gameCard) dom.gameCard.dataset.category = state.question.kategorija || '';
  if (dom.categoryEmblem) {
    dom.categoryEmblem.textContent = CATEGORY_ICONS[state.question.kategorija] || '🎭';
  }
  if (dom.questionDifficultyBadge) {
    const difficulty = state.question.tezina;
    if (difficulty && DIFFICULTY_LABELS[difficulty]) {
      dom.questionDifficultyBadge.textContent = DIFFICULTY_LABELS[difficulty];
      dom.questionDifficultyBadge.dataset.difficulty = difficulty;
      dom.questionDifficultyBadge.classList.remove('hidden');
    } else {
      dom.questionDifficultyBadge.classList.add('hidden');
    }
  }

  state.question.tragovi.slice(0, 5).forEach((clueText, index) => {
    const clueNumber = index + 1;
    const unlocked = clueNumber <= state.unlocked;
    const pointsForThis = 6 - clueNumber;

    const clue = document.createElement('article');
    clue.className = `clue ${unlocked ? 'unlocked' : 'locked'}${clueNumber === justUnlocked ? ' just-unlocked' : ''}`;
    
    const badge = document.createElement('span');
    badge.className = 'clue-badge';
    badge.textContent = `Trag ${clueNumber} (${pointsForThis} b.)`;
    
    const text = document.createElement('p');
    text.className = 'clue-text';
    text.textContent = unlocked ? clueText : 'Ovaj trag je zaključan.';
    
    const status = document.createElement('span');
    status.className = 'clue-status';
    status.textContent = unlocked ? '🔓' : '🔒';
    
    clue.append(badge, text, status);
    dom.clues.appendChild(clue);
  });

  dom.clueCount.textContent = `${state.unlocked} / 5`;
  dom.points.textContent = state.points;
  dom.reveal.disabled = state.unlocked >= 5 || Boolean(state.result);
}

function setControls(enabled) {
  dom.input.disabled = !enabled;
  dom.reveal.disabled = !enabled || state.unlocked >= 5;
  dom.skip.disabled = !enabled;
  dom.form.querySelector('button').disabled = !enabled;
}

function showFeedback(message, type = 'info') {
  dom.feedback.textContent = message;
  dom.feedback.className = `feedback ${type}`;
}

function clearFeedback() {
  dom.feedback.textContent = '';
  dom.feedback.className = 'feedback hidden';
}

function resetQuestion(question, number = 1, options = {}) {
  const { focusInput = true, scrollToClues = false } = options;
  state.question = question;
  state.unlocked = 1;
  state.points = 5;
  state.questionNumber = number;
  state.result = null;
  dom.questionNumber.textContent = String(number).padStart(2, '0');
  dom.input.value = '';
  dom.input.placeholder = 'Upiši ime, grad ili pojam...';
  dom.input.classList.remove('solved');
  if (dom.gameCard) dom.gameCard.classList.remove('solved');
  clearFeedback();
  setControls(true);
  renderClues();
  updateStats();
  playCardTransition();
  if (scrollToClues && dom.clues) {
    dom.clues.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (focusInput && window.innerWidth > 768) {
    dom.input.focus();
  }
}

function markSolved() {
  if (dom.gameCard) dom.gameCard.classList.add('solved');
  dom.input.classList.add('solved');
  dom.clues.querySelectorAll('.clue.unlocked').forEach((clue) => clue.classList.add('solved'));
}

function playCardTransition() {
  if (!dom.gameCard) return;
  dom.gameCard.classList.remove('card-transition');
  void dom.gameCard.offsetWidth;
  dom.gameCard.classList.add('card-transition');
}

let dailyCountdownInterval = null;

function stopDailyCountdown() {
  if (dailyCountdownInterval) {
    clearInterval(dailyCountdownInterval);
    dailyCountdownInterval = null;
  }
}

function hideDailyCountdown() {
  stopDailyCountdown();
  if (dom.dailyCountdown) dom.dailyCountdown.classList.add('hidden');
  if (dom.form) dom.form.classList.remove('hidden');
  dom.feedback.classList.remove('hidden');
  if (dom.secondaryActions) dom.secondaryActions.classList.remove('hidden');
}

function msUntilNextDay() {
  const now = Date.now();
  return 86400000 - (now % 86400000);
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function showDailyCountdown(saved) {
  stopDailyCountdown();
  if (dom.form) dom.form.classList.add('hidden');
  dom.feedback.classList.add('hidden');
  if (dom.secondaryActions) dom.secondaryActions.classList.add('hidden');

  if (dom.dailyCountdownResult) {
    dom.dailyCountdownResult.textContent = saved.victory
      ? `🎉 Tačno! Osvojio/la si ${pointsLabel(saved.points)}.`
      : `🧠 Netačno. Odgovor: ${decodeBase64(state.question.odgovorEnc)}`;
    dom.dailyCountdownResult.className = `daily-countdown-result ${saved.victory ? 'victory' : 'defeat'}`;
  }

  if (dom.dailyCountdown) dom.dailyCountdown.classList.remove('hidden');

  const tick = () => {
    const remaining = msUntilNextDay();
    if (dom.dailyCountdownTimer) dom.dailyCountdownTimer.textContent = formatCountdown(remaining);
    if (remaining <= 1000) {
      stopDailyCountdown();
      if (state.mode === 'daily') startDaily();
    }
  };
  tick();
  dailyCountdownInterval = setInterval(tick, 1000);
}

function startDaily() {
  state.mode = 'daily';
  dom.categoryPanel.classList.add('hidden');
  hideDailyCountdown();
  const { question } = getDailyQuestion();
  const saved = readDailyResult();
  resetQuestion(question, 1, { focusInput: false });

  if (saved?.completed) {
    state.unlocked = saved.unlocked || 5;
    state.points = saved.points || 0;
    renderClues();
    setControls(false);
    showDailyCountdown(saved);
  }
  updateStats();
}

function startFree(options = {}) {
  state.mode = 'free';
  hideDailyCountdown();
  dom.categoryPanel.classList.remove('hidden');
  requestAnimationFrame(updateScrollFade);
  let pool = state.category === 'Sve'
    ? state.questions
    : state.questions.filter((q) => q.kategorija === state.category);
  if (state.difficulty !== 'sve') {
    pool = pool.filter((q) => q.tezina === state.difficulty);
  }

  if (!pool.length) {
    showToast('Nema pitanja za odabranu kategoriju i težinu.');
    return;
  }

  if (state.freeOrder.length === 0 || state.freePosition >= state.freeOrder.length) {
    state.freeOrder = [...pool].sort(() => Math.random() - 0.5);
    state.freePosition = 0;
  }

  const question = state.freeOrder[state.freePosition++];
  resetQuestion(question, state.freePosition, options);
  updateStats();
}

function revealNextClue() {
  if (state.unlocked >= 5 || state.result) return;
  state.unlocked += 1;
  state.points = Math.max(1, 6 - state.unlocked);
  sound.unlock();
  renderClues(state.unlocked);
  showFeedback(`Trag ${state.unlocked} otključan. Sada pojam vrijedi ${pointsLabel(state.points)}.`, 'info');
}

function submitGuess(event) {
  event.preventDefault();
  if (state.result || !state.question) return;
  sound.start();
  
  if (isCorrectGuess(dom.input.value, state.question)) {
    sound.success();
    state.result = { victory: true, points: state.points, unlocked: state.unlocked };
    state.total += state.points;
    state.streak += 1;
    saveStats();
    markSolved();

    if (state.mode === 'daily') {
      localStorage.setItem(getDailyStorageKey(), JSON.stringify({ completed: true, ...state.result }));
    }

    setControls(false);
    showResult(true, state.points, state.unlocked, state.mode === 'daily');
    
    if (window.confetti) {
      confetti({ 
        particleCount: 120, 
        spread: 75, 
        origin: { y: 0.62 }, 
        colors: ['#d8f36a', '#38bdf8', '#ff6b6b'] 
      });
    }
  } else {
    sound.wrong();
    dom.inputWrapper.classList.remove('shake');
    void dom.inputWrapper.offsetWidth;
    dom.inputWrapper.classList.add('shake');
    showFeedback('Nije tačno. Pokušaj ponovo ili otključaj sljedeći trag.', 'error');
    dom.input.select();
  }
  updateStats();
}

function skipQuestion() {
  if (state.result) {
    // Pitanje je već riješeno/preskočeno, modal je zatvoren bez klika na
    // "Sljedeći pojam" — Preskoči sada samo učitava novo pitanje.
    if (state.mode === 'daily') {
      state.mode = 'free';
      dom.daily.classList.remove('active');
      dom.free.classList.add('active');
      dom.categoryPanel.classList.remove('hidden');
    }
    startFree();
    return;
  }
  state.result = { victory: false, points: 0, unlocked: state.unlocked };
  state.streak = 0;
  saveStats();

  if (state.mode === 'daily') {
    localStorage.setItem(getDailyStorageKey(), JSON.stringify({ completed: true, ...state.result }));
  }

  setControls(false);
  showResult(false, 0, state.unlocked, state.mode === 'daily');
  updateStats();
}

function showResult(victory, points, clues, daily) {
  dom.modalIcon.textContent = victory ? '🎉' : '🧠';
  dom.modalTitle.textContent = victory ? 'Svaka čast!' : 'Dobar pokušaj!';
  dom.modalSubtitle.textContent = victory ? 'Uspješno si odgonetnuo/la pojam.' : 'Tačan odgovor je prikazan ispod. Sljedeći put ide još bolje!';
  dom.modalAnswer.textContent = decodeBase64(state.question.odgovorEnc);
  dom.modalPoints.textContent = pointsLabel(points);
  dom.modalClues.textContent = `${clues} / 5`;
  
  let matrixStr = '';
  for (let i = 1; i <= 5; i++) {
    if (i === clues && victory) matrixStr += '🟩';
    else if (i <= clues) matrixStr += '🟥';
    else matrixStr += '⬜';
  }
  dom.matrix.textContent = matrixStr;

  dom.dailyMessage.classList.toggle('hidden', !daily);
  dom.next.textContent = daily ? 'Pređi na slobodnu igru →' : 'Sljedeći pojam →';
  dom.next.classList.remove('hidden');
  dom.overlay.classList.remove('hidden');
}

function closeModal() {
  dom.overlay.classList.add('hidden');
  if (state.result && state.mode === 'daily') {
    showDailyCountdown(state.result);
    return;
  }
  // Ako je pitanje već riješeno (rezultat postoji) a korisnik je samo
  // zatvorio modal bez klika na "Sljedeći pojam", dugmad moraju ostati
  // funkcionalna — Preskoči tad ponaša se kao prelazak na novo pitanje.
  if (state.result) {
    dom.input.disabled = true;
    dom.form.querySelector('button').disabled = true;
    dom.reveal.disabled = true;
    dom.skip.disabled = false;
  }
}
function openRules() { if (dom.rulesOverlay) dom.rulesOverlay.classList.remove('hidden'); }
function closeRulesModal() { if (dom.rulesOverlay) dom.rulesOverlay.classList.add('hidden'); }

function nextFreeQuestion() {
  closeModal();
  if (state.mode === 'daily') {
    state.mode = 'free';
    dom.daily.classList.remove('active');
    dom.free.classList.add('active');
  }
  startFree();
}

function resultText() {
  const solvedClues = state.result?.victory ? state.result.unlocked : 0;
  let squares = '';
  for (let i = 1; i <= 5; i++) {
    if (i === solvedClues && state.result?.victory) squares += '🟩';
    else if (i <= state.result?.unlocked) squares += '🟥';
    else squares += '⬜';
  }

  return `Ko sam ja? ${state.mode === 'daily' ? '📅 Dnevni izazov' : '🎲 Slobodna igra'}\n${squares}\n${state.result?.points || 0}/5 bodova • ${state.result?.unlocked || state.unlocked}/5 tragova\n🔥 Streak: ${state.streak}\n\nIgraj i ti: ${window.location.href}`;
}

async function shareResult() {
  const text = resultText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 Rezultat je kopiran u međuspremnik!');
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast('📋 Rezultat je kopiran!');
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  dom.toastMessage.textContent = message;
  dom.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => dom.toast.classList.add('hidden'), 2600);
}

// --- Event Listeneri ---
function setupEvents() {
  if (dom.sound) {
    dom.sound.addEventListener('click', () => {
      state.muted = !state.muted;
      localStorage.setItem('ko_sam_ja_muted', state.muted);
      if (dom.soundIcon) dom.soundIcon.textContent = state.muted ? '🔇' : '🔊';
      dom.sound.setAttribute('aria-label', state.muted ? 'Uključi zvuk' : 'Isključi zvuk');
    });
  }

  if (dom.help) dom.help.addEventListener('click', openRules);
  if (dom.closeRules) dom.closeRules.addEventListener('click', closeRulesModal);
  if (dom.rulesOk) dom.rulesOk.addEventListener('click', closeRulesModal);
  if (dom.rulesOverlay) {
    dom.rulesOverlay.addEventListener('click', (e) => { 
      if (e.target === dom.rulesOverlay) closeRulesModal(); 
    });
  }

  if (dom.daily) dom.daily.addEventListener('click', startDaily);
  if (dom.free) dom.free.addEventListener('click', startFree);
  if (dom.form) dom.form.addEventListener('submit', submitGuess);
  if (dom.reveal) dom.reveal.addEventListener('click', revealNextClue);
  if (dom.skip) dom.skip.addEventListener('click', skipQuestion);
  if (dom.closeModal) dom.closeModal.addEventListener('click', closeModal);
  if (dom.next) dom.next.addEventListener('click', nextFreeQuestion);
  if (dom.share) dom.share.addEventListener('click', shareResult);
  if (dom.overlay) {
    dom.overlay.addEventListener('click', (e) => { 
      if (e.target === dom.overlay) closeModal(); 
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeRulesModal();
    }
  });

  if (dom.categoryToggle) {
    dom.categoryToggle.addEventListener('click', () => {
      if (window.innerWidth > 768) return;
      const isOpen = dom.categoryPanel.classList.toggle('category-open');
      dom.categoryToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  $$('.category-button').forEach((button) => button.addEventListener('click', () => {
    closeCategoryDropdown();
    if (button.classList.contains('active')) return;
    $$('.category-button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.category = button.dataset.category;
    state.freeOrder = [];
    if (dom.categoryBadge) {
      dom.categoryBadge.textContent = state.category;
      dom.categoryBadge.dataset.category = state.category;
    }
    if (dom.categoryPanel) {
      dom.categoryPanel.classList.remove('filter-pulse');
      void dom.categoryPanel.offsetWidth;
      dom.categoryPanel.classList.add('filter-pulse');
    }
    if (state.mode === 'free') startFree({ focusInput: false, scrollToClues: true });
  }));

  $$('.difficulty-button').forEach((button) => button.addEventListener('click', () => {
    closeCategoryDropdown();
    if (button.classList.contains('active')) return;
    $$('.difficulty-button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.difficulty = button.dataset.difficulty;
    state.freeOrder = [];
    if (state.mode === 'free') startFree({ focusInput: false, scrollToClues: true });
  }));

  if (dom.soundIcon) dom.soundIcon.textContent = state.muted ? '🔇' : '🔊';

  if (dom.categoryList && dom.categoryListWrap) {
    dom.categoryList.addEventListener('scroll', updateScrollFade);
    window.addEventListener('resize', updateScrollFade);
  }
}

function closeCategoryDropdown() {
  if (!dom.categoryPanel) return;
  dom.categoryPanel.classList.remove('category-open');
  if (dom.categoryToggle) dom.categoryToggle.setAttribute('aria-expanded', 'false');
}

function updateScrollFade() {
  const el = dom.categoryList;
  const wrap = dom.categoryListWrap;
  if (!el || !wrap) return;
  const scrollable = el.scrollWidth > el.clientWidth + 2;
  wrap.classList.toggle('scroll-start', scrollable && el.scrollLeft > 4);
  wrap.classList.toggle('scroll-end', scrollable && el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
}

// --- Inicijalizacija ---
async function init() {
  setupEvents();
  try {
    const response = await fetch('./data/questions.json');
    if (!response.ok) throw new Error('Pitanja nisu dostupna.');
    state.questions = await response.json();
    if (!state.questions.length) throw new Error('Baza pitanja je prazna.');
    startDaily();
  } catch (error) {
    console.error(error);
    dom.clues.innerHTML = '<p class="feedback error">Nije moguće učitati pitanja. Pokreni igru preko lokalnog servera ili GitHub Pages.</p>';
    setControls(false);
  }
}

init();