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
    afterReveal: document.getElementById("afterReveal"),
    heartStage: document.getElementById("heartStage"),
    heartSecret: document.getElementById("heartSecret"),
    heartPetals: document.getElementById("heartPetals"),
    scratchCanvas: document.getElementById("scratchCanvas"),
    events: document.getElementById("events"),
    eventNav: document.getElementById("eventNav"),
    langBtn: document.getElementById("langBtn"),
    musicBtn: document.getElementById("musicBtn"),
    todayMsg: document.getElementById("todayMsg"),
    countRow: document.getElementById("countRow")
  };

  let lang = "en";
  let opening = false;
  let dateOpened = false;
  let scratchReady = false;
  let audioCtx = null;
  let padNodes = null;
  let musicOn = false;
  let countdownTimer = null;

  function mapsUrl() {
    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(W.venue.query)
    );
  }

  function applyI18n() {
    const dict = W.i18n[lang];
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (dict[key] != null) node.textContent = dict[key];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      const key = node.getAttribute("data-i18n-placeholder");
      if (dict[key] != null) node.setAttribute("placeholder", dict[key]);
    });
    els.html.lang = lang === "ur" ? "ur" : "en";
    els.html.dir = lang === "ur" ? "rtl" : "ltr";
  }

  function fillStatic() {
    const g = W.couple;
    document.getElementById("groomName").textContent = g.groomsName;
    document.getElementById("brideName").textContent = g.bridesName;
    document.getElementById("groomMeta").innerHTML =
      g.groomsParents + "<br>" + g.groomsEducation + " · " + g.groomsProfession;
    document.getElementById("brideMeta").innerHTML =
      g.bridesParents + "<br>" + g.bridesEducation + " · " + g.bridesProfession;
    document.getElementById("verseArabic").textContent = W.verse.arabic;
    document.getElementById("verseRef").textContent = "— " + W.verse.reference;
    document.getElementById("venueName").textContent = W.venue.name;
    document.getElementById("venueAddress").textContent = W.venue.address;
    document.getElementById("revealDate").textContent = W.datetime.displayDate;
    document.getElementById("revealMeta").textContent =
      W.datetime.displayDay + " · " + W.datetime.displayTime;
    document.getElementById("finaleDate").textContent =
      W.datetime.displayDate + " · " + W.datetime.displayTime;
    document.getElementById("mapsLink").href = mapsUrl();
    document.getElementById("finaleMaps").href = mapsUrl();
    document.getElementById("sealGroom").textContent = g.groomsName.charAt(0);
    document.getElementById("sealBride").textContent = g.bridesName.charAt(0);
    els.openBtn.setAttribute(
      "aria-label",
      "Open invitation for " + g.groomsName + " and " + g.bridesName
    );
    renderEvents();
    applyI18n();
    preloadArt();
  }

  function preloadArt() {
    const imgs = document.querySelectorAll(
      "#invitation img, .watercolor, .event-illust, .wash-img"
    );
    imgs.forEach((img) => {
      if (!img.src) return;
      const warm = new Image();
      warm.src = img.src;
      if (img.decode) {
        img.decode().catch(() => {});
      }
    });
  }

  function renderEvents() {
    els.events.innerHTML = "";
    els.eventNav.innerHTML = "";
    W.events.forEach((event, i) => {
      const num = String(i + 1).padStart(2, "0");
      const panel = document.createElement("article");
      panel.className = "event-panel fade-section";
      panel.id = "event-" + event.id;
      panel.innerHTML =
        '<span class="ornament fade-item" aria-hidden="true">✦</span>' +
        '<img class="event-illust watercolor fade-art" src="' +
        event.image +
        '" alt="" />' +
        '<h3 class="event-title fade-item">' +
        event.title +
        "</h3>" +
        '<p class="event-date fade-item">' +
        event.date +
        "</p>" +
        '<p class="event-time fade-item">' +
        event.time +
        "</p>" +
        '<p class="event-note fade-item">' +
        event.note +
        "</p>" +
        '<p class="event-venue fade-item">' +
        W.venue.name +
        "</p>";
      els.events.appendChild(panel);

      const link = document.createElement("a");
      link.href = "#event-" + event.id;
      link.textContent = num;
      link.dataset.target = "event-" + event.id;
      els.eventNav.appendChild(link);
    });
  }

  function spawnPetals(host, count) {
    if (!host || prefersReduced) return;
    const colors = ["#f7f1e6", "#a5b19a", "#b7a06a", "#d8c4bc", "#e7efe0"];
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
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -12% 0px" }
    );
    nodes.forEach((n) => io.observe(n));
  }

  function scrollToCelebration() {
    const target = document.getElementById("celebration");
    if (!target) return;
    target.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start"
    });
  }

  function initParallax() {
    if (prefersReduced) return;
    const flora = document.querySelectorAll(".flora");
    window.addEventListener(
      "scroll",
      () => {
        const y = window.scrollY;
        flora.forEach((el, i) => {
          const speed = i % 2 === 0 ? 0.04 : -0.03;
          el.style.transform = el.classList.contains("flora-br")
            ? "rotate(178deg) translate3d(0," + y * speed + "px,0)"
            : "translate3d(0," + y * speed + "px,0)";
        });
      },
      { passive: true }
    );
  }

  function initEventNav() {
    const links = [...els.eventNav.querySelectorAll("a")];
    if (!links.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((a) =>
            a.classList.toggle("is-active", a.dataset.target === entry.target.id)
          );
        });
      },
      { threshold: 0.55 }
    );
    W.events.forEach((event) => {
      const panel = document.getElementById("event-" + event.id);
      if (panel) io.observe(panel);
    });
  }

  function remaining() {
    let ms = new Date(W.datetime.iso).getTime() - Date.now();
    if (ms <= 0) return null;
    const days = Math.floor(ms / 86400000);
    ms -= days * 86400000;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return { days, minutes, seconds };
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tickCountdown() {
    const left = remaining();
    if (!left) {
      els.countRow.hidden = true;
      els.todayMsg.hidden = false;
      if (countdownTimer) window.clearInterval(countdownTimer);
      return;
    }
    document.getElementById("cDays").textContent = pad(left.days);
    document.getElementById("cMinutes").textContent = pad(left.minutes);
    document.getElementById("cSeconds").textContent = pad(left.seconds);
  }

  function startCountdown() {
    tickCountdown();
    if (countdownTimer) window.clearInterval(countdownTimer);
    countdownTimer = window.setInterval(tickCountdown, 1000);
  }

  function heartPath(width, height) {
    const path = new Path2D();
    path.addPath(
      new Path2D(HEART_D),
      new DOMMatrix().scale(width / 300, height / 280)
    );
    return path;
  }

  function paintHeartCover(ctx, width, height) {
    const path = heartPath(width, height);
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.clip(path);
    const glow = ctx.createRadialGradient(
      width * 0.5,
      height * 0.38,
      width * 0.08,
      width * 0.5,
      height * 0.46,
      width * 0.52
    );
    glow.addColorStop(0, "#d9c2ba");
    glow.addColorStop(0.45, "#c4b496");
    glow.addColorStop(1, "#8f9d84");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
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
    spawnPetals(els.heartPetals, prefersReduced ? 0 : 18);
    els.afterReveal.hidden = false;
    requestAnimationFrame(() => {
      revealSections(els.afterReveal);
      initEventNav();
    });
    startCountdown();

    const wait = prefersReduced ? 0 : 3000;
    const onUserScroll = () => {
      window.clearTimeout(celebrateTimer);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
    };
    const celebrateTimer = window.setTimeout(() => {
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
      scrollToCelebration();
    }, wait);
    window.setTimeout(() => {
      window.addEventListener("wheel", onUserScroll, { passive: true });
      window.addEventListener("touchmove", onUserScroll, { passive: true });
    }, 450);
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
      const x = ((touch.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((touch.clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
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
      ctx.lineWidth = Math.max(28, canvas.width * 0.09);
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
      const need = prefersReduced ? 36 : 70;
      const ratio = prefersReduced ? 0.28 : 0.4;
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
    master.gain.value = 0.045;
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
  els.langBtn.addEventListener("click", () => {
    lang = lang === "en" ? "ur" : "en";
    applyI18n();
  });
  els.musicBtn.addEventListener("click", toggleMusic);

  fillStatic();
  initParallax();
})();
