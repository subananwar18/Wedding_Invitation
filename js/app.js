(function () {
  const W = window.WEDDING;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HEART_D =
    "M150 250 C150 250 28 168 28 96 C28 48 74 26 112 54 C132 70 150 96 150 96 C150 96 168 70 188 54 C226 26 272 48 272 96 C272 168 150 250 150 250 Z";

  const els = {
    html: document.documentElement,
    cover: document.getElementById("cover"),
    openBtn: document.getElementById("openBtn"),
    invitation: document.getElementById("invitation"),
    heartStage: document.getElementById("heartStage"),
    heartPetals: document.getElementById("heartPetals"),
    scratchCanvas: document.getElementById("scratchCanvas"),
    revealFallback: document.getElementById("revealFallback"),
    events: document.getElementById("events"),
    musicBtn: document.getElementById("musicBtn"),
    petalField: document.getElementById("petalField"),
    mapsLink: document.getElementById("mapsLink"),
    langEn: document.getElementById("langEn"),
    langHi: document.getElementById("langHi"),
    langUr: document.getElementById("langUr")
  };

  const savedLang = localStorage.getItem("wedding-lang");
  let lang = savedLang === "ur" || savedLang === "hi" ? savedLang : "en";
  let opening = false;
  let dateOpened = false;
  let scratchReady = false;
  let audioCtx = null;
  let padNodes = null;
  let musicOn = false;

  function t(key) {
    const dict = W.i18n[lang] || W.i18n.en;
    return dict[key] != null ? dict[key] : W.i18n.en[key] || key;
  }

  function applyI18n() {
    const dict = W.i18n[lang];
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (dict[key] != null) node.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-html]").forEach((node) => {
      const key = node.getAttribute("data-i18n-html");
      if (dict[key] != null) node.innerHTML = dict[key].replace(/\n/g, "<br />");
    });

    els.html.lang = lang === "ur" ? "ur" : lang === "hi" ? "hi" : "en";
    // Keep page chrome LTR so ENG | हिन्दी | URDU never reverse.
    els.html.dir = "ltr";
    const contentDir = lang === "ur" ? "rtl" : "ltr";
    if (els.invitation) els.invitation.dir = contentDir;
    if (els.cover) els.cover.dir = contentDir;
    if (els.langEn) {
      els.langEn.classList.toggle("is-active", lang === "en");
      els.langEn.setAttribute("aria-pressed", String(lang === "en"));
    }
    if (els.langHi) {
      els.langHi.classList.toggle("is-active", lang === "hi");
      els.langHi.setAttribute("aria-pressed", String(lang === "hi"));
    }
    if (els.langUr) {
      els.langUr.classList.toggle("is-active", lang === "ur");
      els.langUr.setAttribute("aria-pressed", String(lang === "ur"));
    }

    els.openBtn.setAttribute("aria-label", t("openAria"));
    els.musicBtn.setAttribute("aria-label", t("musicAria"));
    if (els.heartStage) els.heartStage.setAttribute("aria-label", t("scratchAria"));
    if (els.events) els.events.setAttribute("aria-label", t("programmeAria"));

    renderEvents();
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
    localStorage.setItem("wedding-lang", lang);
    if (els.invitation && !els.invitation.hidden) {
      els.invitation.classList.add("is-lang-switching");
      window.setTimeout(() => {
        applyI18n();
        els.invitation.classList.remove("is-lang-switching");
      }, prefersReduced ? 0 : 180);
    } else {
      applyI18n();
    }
  }

  function preloadArt() {
    document.querySelectorAll("#invitation img").forEach((img) => {
      if (!img.src) return;
      const warm = new Image();
      warm.src = img.src;
      if (img.decode) img.decode().catch(() => {});
    });
  }

  function renderEvents() {
    if (!els.events) return;
    const alreadyOpen = !els.invitation.hidden;
    els.events.innerHTML = "";
    W.events.forEach((event) => {
      const card = document.createElement("article");
      card.className = "event-card fade-section" + (alreadyOpen ? " is-visible" : "");
      card.id = "event-" + event.id;
      const day = t(event.dayKey);
      const date =
        lang === "ur" ? event.dateUr : lang === "hi" ? event.dateHi : event.date;
      const time =
        lang === "ur" ? event.timeUr : lang === "hi" ? event.timeHi : event.time;
      card.innerHTML =
        '<div class="event-art fade-art float-art">' +
        '<img class="watercolor" src="' +
        event.image +
        '" alt="" />' +
        "</div>" +
        '<h3 class="event-title fade-item">' +
        t(event.titleKey) +
        "</h3>" +
        '<p class="event-meta fade-item">' +
        day +
        ", " +
        date +
        "</p>" +
        '<p class="event-time fade-item">' +
        time +
        "</p>";
      els.events.appendChild(card);
    });
    if (alreadyOpen) revealSections(els.events);
  }

  function spawnPetals(host, count) {
    if (!host || prefersReduced) return;
    const colors = ["#dce5d8", "#899486", "#a8b4a2", "#c9a49a", "#b69a70"];
    for (let i = 0; i < count; i += 1) {
      const p = document.createElement("span");
      p.className = "petal";
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 4.2 + Math.random() * 4 + "s";
      p.style.animationDelay = Math.random() * 0.8 + "s";
      p.style.transform = "rotate(" + Math.random() * 80 + "deg)";
      p.style.width = 6 + Math.random() * 8 + "px";
      p.style.height = 9 + Math.random() * 10 + "px";
      host.appendChild(p);
      window.setTimeout(() => p.remove(), 9000);
    }
  }

  function startAmbientPetals() {
    if (prefersReduced || !els.petalField) return;
    const drip = () => {
      if (document.hidden) return;
      spawnPetals(els.petalField, 1);
    };
    drip();
    window.setInterval(drip, 5600);
  }

  function revealSections(root) {
    const nodes = [...(root || document).querySelectorAll(".fade-section")].filter(
      (node) => !node.closest("[hidden]")
    );
    if (prefersReduced) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((n) => io.observe(n));
  }

  function heartPath(width, height) {
    const path = new Path2D();
    path.addPath(new Path2D(HEART_D), new DOMMatrix().scale(width / 300, height / 280));
    return path;
  }

  function paintHeartCover(ctx, width, height) {
    const path = heartPath(width, height);
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.clip(path);

    const base = ctx.createLinearGradient(0, height * 0.1, width, height);
    base.addColorStop(0, "#c8d2c4");
    base.addColorStop(0.4, "#a8b49f");
    base.addColorStop(0.72, "#b69a70");
    base.addColorStop(1, "#899486");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.34,
      width * 0.04,
      width * 0.5,
      height * 0.46,
      width * 0.52
    );
    glow.addColorStop(0, "rgba(248, 250, 246, 0.62)");
    glow.addColorStop(0.5, "rgba(182, 154, 112, 0.22)");
    glow.addColorStop(1, "rgba(137, 148, 134, 0.45)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 12; i += 1) {
      const x = width * (0.2 + ((i * 37) % 60) / 100);
      const y = height * (0.22 + ((i * 53) % 55) / 100);
      const r = width * (0.018 + (i % 3) * 0.012);
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.72, i * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "#f4f7f2" : "#6f7d6c";
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function percentCleared(ctx, width, height) {
    const path = heartPath(width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    let inside = 0;
    let cleared = 0;
    const step = 4;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if (!ctx.isPointInPath(path, x, y)) continue;
        inside += 1;
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha < 40) cleared += 1;
      }
    }
    return inside ? cleared / inside : 0;
  }

  function finishReveal() {
    if (dateOpened) return;
    dateOpened = true;
    els.heartStage.classList.add("is-open");
    if (els.revealFallback) els.revealFallback.hidden = true;
    spawnPetals(els.heartPetals, prefersReduced ? 0 : 14);
  }

  function initScratch() {
    const canvas = els.scratchCanvas;
    const stage = els.heartStage;
    if (!canvas || !stage || scratchReady) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let drawing = false;
    let last = null;
    let travel = 0;

    function sizeCanvas() {
      if (dateOpened) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 40) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      paintHeartCover(ctx, canvas.width, canvas.height);
    }

    function pointFromEvent(event) {
      const touch = event.touches ? event.touches[0] : event;
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((touch.clientX - rect.left) / rect.width) * canvas.width,
        y: ((touch.clientY - rect.top) / rect.height) * canvas.height
      };
    }

    function eraseAt(from, to) {
      const path = heartPath(canvas.width, canvas.height);
      if (!ctx.isPointInPath(path, to.x, to.y) && !ctx.isPointInPath(path, from.x, from.y)) {
        return false;
      }
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(30, canvas.width * 0.1);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      travel += Math.sqrt(dx * dx + dy * dy);
      return true;
    }

    function maybeFinish() {
      const need = prefersReduced ? 30 : 60;
      const ratio = prefersReduced ? 0.35 : 0.5;
      if (travel < need) return;
      if (percentCleared(ctx, canvas.width, canvas.height) >= ratio) finishReveal();
    }

    function start(event) {
      if (dateOpened) return;
      event.preventDefault();
      drawing = true;
      last = pointFromEvent(event);
      travel = 0;
      stage.classList.add("is-scratching");
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (e) {
        /* ignore */
      }
    }

    function move(event) {
      if (!drawing || dateOpened) return;
      event.preventDefault();
      const next = pointFromEvent(event);
      eraseAt(last, next);
      last = next;
      maybeFinish();
    }

    function end(event) {
      if (!drawing) return;
      if (event) event.preventDefault();
      drawing = false;
      last = null;
      maybeFinish();
    }

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener(
      "touchmove",
      (event) => {
        if (drawing) event.preventDefault();
      },
      { passive: false }
    );

    sizeCanvas();
    window.setTimeout(sizeCanvas, 80);
    window.setTimeout(sizeCanvas, 400);
    window.addEventListener("resize", sizeCanvas);
    scratchReady = true;
  }

  function openInvitation() {
    if (opening || els.cover.hidden) return;
    opening = true;
    els.openBtn.classList.add("is-pressed");
    els.invitation.hidden = false;
    requestAnimationFrame(() => {
      document.getElementById("opening").classList.add("is-visible");
      revealSections(els.invitation);
      initScratch();
      startAmbientPetals();
      if (!prefersReduced) spawnPetals(els.petalField, 14);
    });

    const reveal = () => {
      els.cover.classList.add("is-open");
      window.setTimeout(() => {
        els.cover.hidden = true;
        document.body.classList.remove("is-sealed");
      }, prefersReduced ? 0 : 2100);
    };

    if (prefersReduced) {
      reveal();
      return;
    }
    window.setTimeout(reveal, 180);
  }

  function startPad() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = audioCtx || new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
    if (padNodes) return;
    const master = audioCtx.createGain();
    master.gain.value = 0.04;
    master.connect(audioCtx.destination);
    const freqs = [196, 246.94, 293.66];
    padNodes = freqs.map((freq, i) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = freq;
      g.gain.value = 0.22 - i * 0.05;
      osc.connect(g);
      g.connect(master);
      osc.start();
      return osc;
    });
  }

  function stopPad() {
    if (!padNodes) return;
    padNodes.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        /* already stopped */
      }
    });
    padNodes = null;
  }

  function toggleMusic() {
    musicOn = !musicOn;
    els.musicBtn.classList.toggle("is-on", musicOn);
    els.musicBtn.setAttribute("aria-pressed", String(musicOn));
    if (musicOn) startPad();
    else stopPad();
  }

  els.openBtn.addEventListener("click", openInvitation);
  els.musicBtn.addEventListener("click", toggleMusic);
  if (els.revealFallback) els.revealFallback.addEventListener("click", finishReveal);
  if (els.mapsLink) els.mapsLink.href = W.venue.mapsUrl;
  if (els.langEn) els.langEn.addEventListener("click", () => setLang("en"));
  if (els.langHi) els.langHi.addEventListener("click", () => setLang("hi"));
  if (els.langUr) els.langUr.addEventListener("click", () => setLang("ur"));

  applyI18n();
  preloadArt();
})();
