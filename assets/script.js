/* ---------- Konfigurasi ---------- */
const CONFIG = {
  // Ulasan
  feedbackEmail: "chr5tt.dev@gmail.com",
  feedbackWhatsapp: "6285282660504",
  feedbackSubject: "Ulasan Birthday List",
  photoDir: "foto/",
  // Kalau file tidak ada, suara nada bawaan yang diputar.
  voiceDir: "suara/",
  voiceExts: ["mp3", "m4a", "ogg", "opus", "wav"],
  // Sandi
  getCode: () => String(new Date().getFullYear()),
};

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const COLORS = ["#FF8A80", "#7BDFB5", "#FFA45C", "#FFD66B", "#8EC5FF"];
const INK = "#2B2D42";

const $ = (selector) => document.querySelector(selector);

/* ---------- Data orang ---------- */
const people = PEOPLE.map((raw, index) => {
  const [year, month, day] = raw.date.split("-").map(Number);
  const words = raw.name.toLowerCase().split(" ");
  return {
    index,
    name: raw.name,
    year,
    month,
    day,
    // false kalau tanggal belum diisi (misalnya 0000-00-00)
    hasDate: month >= 1 && month <= 12 && day >= 1 && day <= 31,
    photo: raw.photo || `${words.slice(0, 2).join(".")}.jpg`,
    links: (raw.links || []).filter((l) => l && l.url),
    color: COLORS[index % COLORS.length],
  };
}).sort((a, b) => (b.hasDate - a.hasDate) || a.month - b.month || a.day - b.day);

const initials = (name) => name.split(" ").slice(0, 2).map((w) => w[0]).join("");
const photoUrl = (p) => CONFIG.photoDir + p.photo;
const formatDate = (p) => (p.hasDate ? `${p.day} ${MONTHS[p.month - 1]} ${p.year}` : "Tanggal belum diisi");
const shortDate = (p) => (p.hasDate ? `${p.day} ${MONTHS[p.month - 1].slice(0, 3)}` : "Belum diisi");
const findPerson = (index) => people.find((p) => p.index === Number(index));

// Warna tombol
const LINK_STYLES = { instagram: "ig", tiktok: "tt", whatsapp: "wa" };
const linkClass = (label) => LINK_STYLES[label.toLowerCase()] || "";

function fallbackAvatar(p) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>` +
    `<rect width='100' height='100' fill='${p.color}'/>` +
    `<text x='50' y='64' font-family='monospace' font-weight='bold' font-size='40' ` +
    `text-anchor='middle' fill='${INK}'>${initials(p.name)}</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

// Dipanggil oleh atribut onerror pada <img> saat foto belum ada di folder foto/.
function useFallback(img) {
  img.onerror = null;
  img.src = fallbackAvatar(findPerson(img.dataset.id));
}

function photoTag(p, extra = "") {
  return `<img class="ph" src="${photoUrl(p)}" data-id="${p.index}" onerror="useFallback(this)" alt="${p.name}" ${extra}>`;
}

// Hitung sisa hari.
function nextBirthday(p) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const next = new Date(today.getFullYear(), p.month - 1, p.day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return {
    days: Math.round((next - today) / 864e5),
    age: next.getFullYear() - p.year,
  };
}

/* ---------- Audio ---------- */
let audioCtx;
let muted = false;
let eqTimer;

function getAudio() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function beep(freq, duration, wave, delay = 0, volume = 0.15) {
  if (muted) return;
  try {
    const ctx = getAudio();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  } catch (err) {
    /* abaikan */
  }
}

// Melodi 8 nada
function playTune(p) {
  const scale = [0, 2, 4, 7, 9, 12];
  const waves = ["square", "triangle", "sine", "sawtooth", "triangle"];
  const root = 196 * Math.pow(2, ((p.index * 5) % 12) / 12);
  const wave = waves[p.index % waves.length];
  const step = 0.16 + (p.index % 4) * 0.03;

  let seed = p.index * 7919 + 13;
  const notes = [];
  for (let k = 0; k < 8; k++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    notes.push(scale[seed % scale.length]);
  }
  notes[notes.length - 1] = 0;

  notes.forEach((n, k) => beep(root * Math.pow(2, n / 12), step * 1.6, wave, k * step, 0.18));
  return notes.length * step * 1000;
}

/* ---------- Voice note ---------- */
const voicePlayer = new Audio();
const voiceCache = new Map(); // index orang -> alamat file yang berhasil, atau false kalau tidak ada VN
let voiceToken = 0;

voicePlayer.addEventListener("ended", () => $(".eq")?.classList.remove("on"));

// Elemen dibuka sekali di sini.
const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
document.addEventListener(
  "pointerdown",
  () => {
    voicePlayer.src = SILENT_WAV;
    voicePlayer.play().catch(() => {});
  },
  { once: true }
);

function voiceCandidates(p) {
  if (p.voice) return [CONFIG.voiceDir + p.voice];
  const base = p.photo.replace(/\.[^.]+$/, "");
  return CONFIG.voiceExts.map((ext) => `${CONFIG.voiceDir}${base}.${ext}`);
}

function stopVoice() {
  voiceToken++;
  voicePlayer.pause();
}

// Mengembalikan true kalau VN diputar (atau pemutaran digantikan permintaan yang lebih baru).
async function playVoice(p, token) {
  const cached = voiceCache.get(p.index);
  if (cached === false) return false;

  for (const url of cached ? [cached] : voiceCandidates(p)) {
    voicePlayer.src = url;
    try {
      await voicePlayer.play();
      if (token !== voiceToken) return true;
      voiceCache.set(p.index, url);
      return true;
    } catch (err) {
      if (token !== voiceToken) return true;
      if (err.name === "NotAllowedError") return false; // diblokir browser, bukan file tidak ada
    }
  }
  voiceCache.set(p.index, false);
  return false;
}

async function playForPerson(p) {
  if (muted) return;
  clearTimeout(eqTimer);
  voicePlayer.pause();
  const token = ++voiceToken;
  $(".eq")?.classList.add("on");

  if (await playVoice(p, token)) return; // VN diputar, equalizer berhenti saat VN selesai
  if (token !== voiceToken) return;

  // Tidak ada VN: pakai nada bawaan seperti semula.
  voicePlayer.pause();
  const duration = playTune(p);
  eqTimer = setTimeout(() => $(".eq")?.classList.remove("on"), duration + 300);
}

/* ---------- Intro (sandi) ---------- */
const intro = $("#intro");
const dialsEl = $("#dials");
const messageEl = $("#msg");
const xpEl = $("#xp");
const digits = [0, 0, 0, 0];
let unlocked = false;

function buildDials() {
  digits.forEach((_, k) => {
    const dial = document.createElement("div");
    dial.className = "dial";
    dial.innerHTML = `<button aria-label="naik">▲</button><output>0</output><button aria-label="turun">▼</button>`;
    const [up, output, down] = dial.children;
    up.onclick = () => turnDial(k, 1, output);
    down.onclick = () => turnDial(k, -1, output);
    dialsEl.append(dial);
  });
}

function turnDial(k, direction, output) {
  if (unlocked) return;
  digits[k] = (digits[k] + direction + 10) % 10;
  output.textContent = digits[k];
  beep(300 + digits[k] * 60, 0.06, "square");
  xpEl.style.width = digits.filter((d) => d > 0).length * 25 + "%";
  messageEl.textContent = "Petunjuk: tahun sekarang";
}

function submitCode() {
  if (unlocked) return;
  if (digits.join("") === CONFIG.getCode()) {
    unlock();
    return;
  }
  dialsEl.classList.remove("shake");
  void dialsEl.offsetWidth; // memulai ulang animasi
  dialsEl.classList.add("shake");
  messageEl.textContent = "SANDI SALAH, COBA LAGI";
  beep(150, 0.3, "sawtooth");
}

function unlock() {
  unlocked = true;
  clearInterval(decodeTimer);
  $("#decode").textContent = DECODE_TARGET;
  dialsEl.classList.add("ok");
  xpEl.style.width = "100%";
  messageEl.textContent = "CONGRATS! MEMBUKA...";
  [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.2, "square"), i * 120));
  confetti();
  setTimeout(() => intro.classList.add("open"), 900);
  setTimeout(() => {
    intro.style.display = "none";
    document.documentElement.classList.remove("intro-lock"); // halaman utama boleh di-scroll lagi
  }, 2100);
}

function confetti() {
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("i");
    piece.className = "conf";
    piece.style.cssText =
      `left:${Math.random() * 100}%;background:${COLORS[i % COLORS.length]};` +
      `animation-delay:${Math.random() * 0.5}s;animation-duration:${1.5 + Math.random() * 1.5}s`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 3500);
  }
}

function scatterStars() {
  for (let i = 0; i < 14; i++) {
    const star = document.createElement("i");
    star.className = "star";
    star.style.cssText =
      `left:${Math.random() * 95}%;top:${Math.random() * 95}%;` +
      `animation-delay:${Math.random() * 4}s;background:${COLORS[i % COLORS.length]}`;
    intro.prepend(star);
  }
}

// Judul berganti
const DECODE_TARGET = "HAPPY BIRTHDAY";
const GLYPHS = "01#@*+%&";
let frame = 0;
const decodeTimer = setInterval(() => {
  frame++;
  const revealed = Math.floor(frame / 3) % (DECODE_TARGET.length + 6);
  $("#decode").textContent = [...DECODE_TARGET]
    .map((ch, i) => (ch === " " || i < revealed ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
    .join("");
}, 90);

/* ---------- Daftar ---------- */
const monthSelect = $("#mon");
const searchInput = $("#q");
const grid = $("#grid");

function fillMonthOptions() {
  MONTHS.forEach((name, i) => monthSelect.insertAdjacentHTML("beforeend", `<option value="${i + 1}">${name}</option>`));
}

function renderList() {
  const query = searchInput.value.toLowerCase();
  const month = Number(monthSelect.value);
  const list = people.filter((p) => p.name.toLowerCase().includes(query) && (!month || p.month === month));

  grid.innerHTML = list.length
    ? list
      .map(
        (p, k) => `
      <article class="card" style="animation-delay:${k * 45}ms" data-id="${p.index}">
        ${photoTag(p)}
        <h3>${p.name}</h3>
        <span class="tag" style="background:${p.color}">🎂 ${shortDate(p)}</span>
      </article>`
      )
      .join("")
    : `<p class="empty px">TIDAK ADA HASIL</p>`;
}

function renderNextBirthday() {
  const next = people
    .filter((p) => p.hasDate)
    .map((p) => ({ p, ...nextBirthday(p) }))
    .sort((a, b) => a.days - b.days)[0];
  if (!next) {
    $("#next").style.display = "none";
    return;
  }
  const when = next.days === 0 ? "hari ini! 🎉" : `${next.days} hari lagi`;
  $("#next").innerHTML = `<span class="px small">ULTAH TERDEKAT</span><br><span class="next-name">${next.p.name}: ${when}</span>`;
  $("#next").onclick = () => openDetail(next.p);
}

/* ---------- Detail (modal) ---------- */
const modal = $("#modal");
const box = $("#box");

function linksHtml(p) {
  if (!p.links.length) return "";
  const buttons = p.links
    .map((l) => `<a class="btn ${linkClass(l.label)}" target="_blank" rel="noopener" href="${l.url}">${l.label}</a>`)
    .join("");
  return `<div class="row">${buttons}</div>`;
}

function openDetail(p) {
  const i = people.indexOf(p);
  let countdown = "Tanggal lahir belum diisi";
  if (p.hasDate) {
    const { days, age } = nextBirthday(p);
    countdown = days === 0 ? "Ulang tahun hari ini! 🎉" : `${days} hari lagi menuju usia ${age}`;
  }

  box.innerHTML = `
    <button class="x" id="cl" aria-label="Tutup">✕</button>
    ${photoTag(p, `style="background:${p.color}"`)}
    <h2>${p.name}</h2>
    <span class="tag" style="background:${p.color}">🎂 ${formatDate(p)}</span>
    <div class="info">${countdown}</div>
    ${linksHtml(p)}
    <div class="row">
      <button class="btn snd" id="sn"><span class="eq"><i></i><i></i><i></i></span> Putar suara</button>
    </div>
    <div class="nav">
      <button class="btn" id="pv" aria-label="Sebelumnya">◀</button>
      <button class="btn" id="nx" aria-label="Berikutnya">▶</button>
    </div>`;

  modal.classList.add("show");
  $("#cl").onclick = closeDetail;
  $("#sn").onclick = () => playForPerson(p);
  $("#pv").onclick = () => openDetail(people[(i - 1 + people.length) % people.length]);
  $("#nx").onclick = () => openDetail(people[(i + 1) % people.length]);
  playForPerson(p);
}

function closeDetail() {
  modal.classList.remove("show");
  clearTimeout(eqTimer);
  stopVoice();
}

/* ---------- Ulasan lewat email ---------- */
let rating = 0;

function openFeedback() {
  rating = 0;
  box.innerHTML = `
    <button class="x" id="cl" aria-label="Tutup">✕</button>
    <h2>Kirim Ulasan</h2>
    <p class="fb-note">Tulis pendapatmu. bisa sampaikan apa saja.</p>
    <form class="fb" id="fbForm" novalidate>
      <label>Nama
        <input type="text" id="fbName" maxlength="60" autocomplete="name" required>
      </label>
      <div class="fb-label">Penilaian (opsional)</div>
      <div class="stars" id="stars">
        ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-v="${n}" aria-label="${n} bintang">★</button>`).join("")}
      </div>
      <label>Isi Ulasan
        <textarea id="fbText" rows="5" maxlength="1500" required></textarea>
      </label>
      <div class="fb-error" id="fbErr" role="alert"></div>
      <div class="row">
        <button type="button" class="btn tt" id="fbGmail">Kirim lewat Gmail</button>
        <button type="button" class="btn wa" id="fbWa">Kirim lewat WhatsApp</button>
      </div>
    </form>`;

  modal.classList.add("show");
  $("#cl").onclick = closeDetail;
  $("#stars").onclick = (e) => {
    const star = e.target.closest("button");
    if (!star) return;
    rating = Number(star.dataset.v);
    document.querySelectorAll("#stars button").forEach((b) => b.classList.toggle("on", Number(b.dataset.v) <= rating));
    beep(400 + rating * 90, 0.08, "square");
  };
  $("#fbGmail").onclick = () => sendFeedback("gmail");
  $("#fbWa").onclick = () => sendFeedback("whatsapp");
  $("#fbText").focus();
}

function buildFeedback() {
  const name = $("#fbName").value.trim();
  const text = $("#fbText").value.trim();
  const body =
    `Nama: ${name || "-"}\n` +
    `Penilaian: ${rating ? rating + "/5" : "-"}\n\n` +
    `Ulasan:\n${text}`;
  const email = encodeURIComponent(CONFIG.feedbackEmail).replace("%40", "@");
  const subject = encodeURIComponent(CONFIG.feedbackSubject);
  const phone = CONFIG.feedbackWhatsapp.replace(/\D/g, "");
  const encodedBody = encodeURIComponent(body);
  return {
    name,
    text,
    // Gmail di browser komputer
    gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${encodedBody}`,
    // Aplikasi Gmail di iPhone/iPad
    gmailApp: `googlegmail:///co?to=${email}&subject=${subject}&body=${encodedBody}`,
    // Aplikasi email bawaan ponsel (di Android biasanya Gmail)
    mailto: `mailto:${email}?subject=${subject}&body=${encodedBody}`,
    whatsapp: `https://wa.me/${phone}?text=${encodeURIComponent(CONFIG.feedbackSubject + "\n\n" + body)}`,
  };
}

function sendFeedback(via) {
  const mail = buildFeedback();
  if (!mail.name) {
    $("#fbErr").textContent = "Nama wajib diisi.";
    $("#fbName").focus();
    return;
  }
  if (mail.text.length < 3) {
    $("#fbErr").textContent = "Isi ulasan dulu sebelum mengirim.";
    $("#fbText").focus();
    return;
  }
  $("#fbErr").textContent = "";
  if (via === "gmail") openGmail(mail);
  else window.open(mail.whatsapp, "_blank", "noopener");
}

function navigate(url) {
  window.location.href = url;
}

// Di ponsel membuka aplikasi Gmail. Di komputer membuka Gmail di browser.
function openGmail(mail) {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isAndroid) {
    navigate(mail.mailto);
  } else if (isIOS) {
    navigate(mail.gmailApp);
    // pakai aplikasi email bawaan.
    setTimeout(() => {
      if (!document.hidden) navigate(mail.mailto);
    }, 1200);
  } else {
    window.open(mail.gmail, "_blank", "noopener");
  }
}

/* ---------- Event ---------- */
$("#fbBtn").onclick = openFeedback;
searchInput.oninput = renderList;
monthSelect.onchange = renderList;
grid.onclick = (e) => {
  const card = e.target.closest(".card");
  if (card) openDetail(findPerson(card.dataset.id));
};
modal.onclick = (e) => {
  if (e.target === modal) closeDetail();
};
addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDetail();
});
$("#go").onclick = submitCode;
$("#mute").onclick = (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? "🔇 Hening" : "🔊 Suara";
  e.currentTarget.setAttribute("aria-pressed", muted);
};

/* ---------- Perlindungan ringan ---------- */
const isField = (e) => e.target instanceof Element && e.target.closest("input, textarea");
document.addEventListener("dragstart", (e) => e.preventDefault());
document.addEventListener("copy", (e) => { if (!isField(e)) e.preventDefault(); });
document.addEventListener("cut", (e) => { if (!isField(e)) e.preventDefault(); });

/* ---------- Mulai ---------- */
document.documentElement.classList.add("intro-lock"); // kunci scroll selama intro tampil
buildDials();
scatterStars();
fillMonthOptions();
$("#sub").textContent = `Nǐ hǎo, péngyǒu! artinya ya'ahowu dua.`;
renderList();
renderNextBirthday();
