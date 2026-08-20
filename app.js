/* Ko sam ja? - logika kviza bez eksternih runtime biblioteka. */

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
  categoryBadge: $('#active-category-badge'),
  categoryList: $('#category-filter-list'),
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
  share: $('#btn-share'),
  next: $('#btn-next-question'),
  toast: $('#toast'),
  toastMessage: $('#toast-message')
};
  help: $('#btn-help'),
  rulesOverlay: $('#rules-modal-overlay'),
  closeRules: $('#btn-rules-close'),
  rulesOk: $('#btn-rules-ok'),

const state = {
  questions: [],
  mode: 'daily',
  category: 'Sve',
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

class SoundManager {
  constructor() { this.context = null; }

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
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.16, start + .02);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  success() { [523, 659, 784, 1047].forEach((frequency, index) => this.tone(frequency, .25, 'triangle', index * .07)); }
  wrong() { this.tone(180, .25, 'sawtooth'); }
  unlock() { this.tone(420, .14, 'square'); this.tone(720, .2, 'square', .08); }
}

const sound = new SoundManager();

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
  const bytes = Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function getAcceptedAnswers(question) {
  const aliases = Array.isArray(question.aliasEnc) ? question.aliasEnc : [];
  return [decodeBase64(question.odgovorEnc), ...aliases.map(decodeBase64)];
}

function isCorrectGuess(guess, question) {
  const accepted = getAcceptedAnswers(question);
  const normalizedGuess = normalize(guess);
  return normalizedGuess.length > 0 && accepted.some((answer) => normalize(answer) === normalizedGuess);
}

function getDailyIndex() {
  return Math.floor(Date.now() / 86400000) % state.questions.length;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyStorageKey() { return `ko_sam_ja_daily_${getTodayKey()}`; }

function readDailyResult() {
  try { return JSON.parse(localStorage.getItem(getDailyStorageKey()) || 'null'); } catch { return null; }
}

function saveStats() {
  localStorage.setItem('ko_sam_ja_total_score', String(state.total));
  localStorage.setItem('ko_sam_ja_streak', String(state.streak));
}

function pointsLabel(points) { return `${points} ${points === 1 ? 'bod' : points < 5 ? 'boda' : 'bodova'}`; }

function updateStats() {
  dom.mode.textContent = state.mode === 'daily' ? 'Dnevni izazov' : 'Slobodna igra';
  dom.points.textContent = state.points;
  dom.streak.textContent = `🔥 ${state.streak}`;
  dom.total.textContent = state.total;
  dom.categoryBadge.textContent = state.category;
  dom.daily.classList.toggle('active', state.mode === 'daily');
  dom.free.classList.toggle('active', state.mode === 'free');
}

function renderClues(justUnlocked = 0) {
  if (!state.question) return;
  dom.clues.innerHTML = '';
  state.question.tragovi.slice(0, 5).forEach((clueText, index) => {
    const clueNumber = index + 1;
    const unlocked = clueNumber <= state.unlocked;
    const clue = document.createElement('article');
    clue.className = `clue ${unlocked ? 'unlocked' : 'locked'}${clueNumber === justUnlocked ? ' just-unlocked' : ''}`;
    const number = document.createElement('span');
    number.className = 'clue-number'; number.textContent = clueNumber;
    const text = document.createElement('p');
    text.className = 'clue-text'; text.textContent = unlocked ? clueText : 'Ovaj trag je zaključan.';
    const status = document.createElement('span');
    status.className = 'clue-status'; status.textContent = unlocked ? '●' : '🔒';
    clue.append(number, text, status);
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

function clearFeedback() { dom.feedback.textContent = ''; dom.feedback.className = 'feedback hidden'; }

function resetQuestion(question, number = 1) {
  state.question = question;
  state.unlocked = 1;
  state.points = 5;
  state.questionNumber = number;
  state.result = null;
  dom.questionNumber.textContent = String(number).padStart(2, '0');
  dom.input.value = '';
  dom.input.placeholder = 'Upiši ime ili pojam...';
  clearFeedback();
  setControls(true);
  renderClues();
  updateStats();
  dom.input.focus();
}

function startDaily() {
  state.mode = 'daily';
  const question = state.questions[getDailyIndex()];
  const saved = readDailyResult();
  resetQuestion(question, getDailyIndex() + 1);
  if (saved?.completed) {
    state.unlocked = saved.unlocked || 5;
    state.points = saved.points || 0;
    renderClues();
    setControls(false);
    showResult(saved.victory, saved.points, saved.unlocked, true);
  }
  updateStats();
}

function startFree() {
  state.mode = 'free';
  const pool = state.category === 'Sve' ? state.questions : state.questions.filter((question) => question.kategorija === state.category);
  if (!pool.length) { showToast('Nema pitanja u ovoj kategoriji.'); return; }
  if (state.freeOrder.length === 0 || state.freePosition >= state.freeOrder.length) {
    state.freeOrder = [...pool].sort(() => Math.random() - .5);
    state.freePosition = 0;
  } else if (!state.freeOrder.includes(state.question)) {
    state.freeOrder = [...pool].sort(() => Math.random() - .5);
    state.freePosition = 0;
  }
  const question = state.freeOrder[state.freePosition++];
  resetQuestion(question, state.freePosition);
  updateStats();
}

function revealNextClue() {
  if (state.unlocked >= 5 || state.result) return;
  state.unlocked += 1;
  state.points = Math.max(1, 6 - state.unlocked);
  sound.unlock();
  renderClues(state.unlocked);
  showFeedback(`Trag ${state.unlocked} je otključan. Sada možeš osvojiti ${pointsLabel(state.points)}.`, 'info');
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
    if (state.mode === 'daily') localStorage.setItem(getDailyStorageKey(), JSON.stringify({ completed: true, ...state.result }));
    setControls(false);
    showResult(true, state.points, state.unlocked, state.mode === 'daily');
    if (window.confetti) confetti({ particleCount: 130, spread: 75, origin: { y: .62 }, colors: ['#d8f36a', '#72c6d3', '#ff806c'] });
  } else {
    sound.wrong();
    dom.inputWrapper.classList.remove('shake');
    void dom.inputWrapper.offsetWidth;
    dom.inputWrapper.classList.add('shake');
    showFeedback('Nije to. Pokušaj ponovo ili otključaj novi trag.', 'error');
    dom.input.select();
  }
  updateStats();
}

function skipQuestion() {
  if (state.result) return;
  state.result = { victory: false, points: 0, unlocked: state.unlocked };
  state.streak = 0;
  saveStats();
  if (state.mode === 'daily') localStorage.setItem(getDailyStorageKey(), JSON.stringify({ completed: true, ...state.result }));
  setControls(false);
  showResult(false, 0, state.unlocked, state.mode === 'daily');
  updateStats();
}

function showResult(victory, points, clues, daily) {
  dom.modalIcon.textContent = victory ? '🎉' : '🧠';
  dom.modalTitle.textContent = victory ? 'Svaka čast!' : 'Dobar pokušaj!';
  dom.modalSubtitle.textContent = victory ? 'Tačno si pogodio/la pojam.' : 'Tačan odgovor je ispod. Sljedeći put ide još bolje.';
  dom.modalAnswer.textContent = decodeBase64(state.question.odgovorEnc);
  dom.modalPoints.textContent = pointsLabel(points);
  dom.modalClues.textContent = `${clues} / 5`;
  dom.matrix.textContent = `${'🟩'.repeat(victory ? clues : 0)}${'⬜'.repeat(5 - (victory ? clues : 0))}`;
  dom.dailyMessage.classList.toggle('hidden', !daily);
  dom.next.textContent = daily ? 'Pređi na slobodnu igru →' : 'Sljedeći pojam →';
  dom.next.classList.remove('hidden');
  dom.overlay.classList.remove('hidden');
}

function closeModal() { dom.overlay.classList.add('hidden'); }

function nextFreeQuestion() { closeModal(); startFree(); }

function resultText() {
  const solvedClues = state.result?.victory ? state.result.unlocked : 0;
  const squares = `${'🟩'.repeat(solvedClues)}${'⬜'.repeat(5 - solvedClues)}`;
  return `Ko sam ja? ${state.mode === 'daily' ? 'Dnevni izazov' : 'Slobodna igra'}\n${squares}\n${state.result?.points || 0}/5 bodova • ${state.result?.unlocked || state.unlocked}/5 tragova`;
}

async function shareResult() {
  const text = resultText();
  try {
    await navigator.clipboard.writeText(text);
    showToast('Rezultat je kopiran u međuspremnik.');
  } catch {
    const area = document.createElement('textarea'); area.value = text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
    showToast('Rezultat je kopiran.');
  }
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  dom.toastMessage.textContent = message;
  dom.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => dom.toast.classList.add('hidden'), 2600);
}

function setupEvents() {
  dom.sound.addEventListener('click', () => { state.muted = !state.muted; localStorage.setItem('ko_sam_ja_muted', state.muted); dom.soundIcon.textContent = state.muted ? '🔇' : '🔊'; dom.sound.setAttribute('aria-label', state.muted ? 'Uključi zvuk' : 'Isključi zvuk'); });
  dom.daily.addEventListener('click', startDaily);
  dom.free.addEventListener('click', startFree);
  dom.form.addEventListener('submit', submitGuess);
  dom.reveal.addEventListener('click', revealNextClue);
  dom.skip.addEventListener('click', skipQuestion);
  dom.closeModal.addEventListener('click', closeModal);
  dom.next.addEventListener('click', nextFreeQuestion);
  dom.share.addEventListener('click', shareResult);
  dom.overlay.addEventListener('click', (event) => { if (event.target === dom.overlay) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
  $$('.category-button').forEach((button) => button.addEventListener('click', () => {
    $$('.category-button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active'); state.category = button.dataset.category; state.freeOrder = []; dom.categoryBadge.textContent = state.category;
    if (state.mode === 'free') startFree();
  }));
  dom.soundIcon.textContent = state.muted ? '🔇' : '🔊';
}

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
    dom.clues.innerHTML = '<p class="feedback error">Nije moguće učitati pitanja. Pokreni igru preko lokalnog servera.</p>';
    setControls(false);
  }
}

init();