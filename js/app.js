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
    heartBurst: document.getElementById("heartBurst"),
    revealFallback: document.getElementById("revealFallback"),
    events: document.getElementById("events"),
    musicBtn: document.getElementById("musicBtn"),
    bgMusic: document.getElementById("bgMusic"),
    petalField: document.getElementById("petalField"),
    mapsLink: document.getElementById("mapsLink"),
    langEn: document.getElementById("langEn"),
    langHi: document.getElementById("langHi"),
    langUr: document.getElementById("langUr"),
    countDays: document.getElementById("countDays"),
    countHours: document.getElementById("countHours"),
    countMinutes: document.getElementById("countMinutes"),
    countSeconds: document.getElementById("countSeconds"),
    bismillah: document.querySelector(".bismillah"),
    dateReveal: document.getElementById("dateReveal"),
    guestName: document.getElementById("guestName"),
    guestGreeting: document.getElementById("guestGreeting")
  };

  let lang = "en";
  let opening = false;
  let dateOpened = false;
  let scratchReady = false;
  let musicOn = false;
  let autoScrollOn = false;
  let autoScrollRaf = 0;
  let heroTyped = false;

  if (els.bgMusic) {
    els.bgMusic.volume = 0.55;
    els.bgMusic.loop = true;
  }

  function t(key) {
    const dict = W.i18n[lang] || W.i18n.en;
    return dict[key] != null ? dict[key] : W.i18n.en[key] || key;
  }

  function readGuestNameFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("name")) return null;
    const raw = params.get("name");
    if (raw == null) return null;
    const cleaned = String(raw)
      .replace(/[\u0000-\u001F\u007F]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
    return cleaned || null;
  }

  const guestNameFromUrl = readGuestNameFromUrl();

  function applyGuestName() {
    if (!els.guestGreeting || !els.guestName) return;
    if (!guestNameFromUrl) {
      els.guestGreeting.hidden = true;
      els.guestName.textContent = "";
      return;
    }
    els.guestName.textContent = guestNameFromUrl;
    els.guestGreeting.hidden = false;
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

    applyGuestName();
    renderEvents();
  }

  function setLang(next) {
    if (next === lang) return;
    lang = next;
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

    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#d9c7a8");
    base.addColorStop(0.28, "#c4b089");
    base.addColorStop(0.55, "#b7a07a");
    base.addColorStop(0.78, "#9f8a68");
    base.addColorStop(1, "#8d7a5c");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    const sheen = ctx.createLinearGradient(0, height * 0.05, width * 0.9, height);
    sheen.addColorStop(0, "rgba(255, 250, 240, 0.55)");
    sheen.addColorStop(0.35, "rgba(255, 255, 255, 0.08)");
    sheen.addColorStop(0.55, "rgba(120, 100, 70, 0.18)");
    sheen.addColorStop(1, "rgba(255, 248, 236, 0.28)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width * 0.42,
      height * 0.3,
      width * 0.04,
      width * 0.5,
      height * 0.48,
      width * 0.55
    );
    glow.addColorStop(0, "rgba(255, 252, 245, 0.5)");
    glow.addColorStop(0.55, "rgba(182, 154, 112, 0.12)");
    glow.addColorStop(1, "rgba(90, 74, 52, 0.28)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.14;
    for (let i = 0; i < 28; i += 1) {
      const x = width * ((i * 47) % 100) / 100;
      const y = height * ((i * 73) % 100) / 100;
      const r = width * (0.01 + (i % 4) * 0.006);
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.8, r, i * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 ? "#fff8ef" : "#6a5840";
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(255, 248, 236, 0.35)";
    ctx.lineWidth = Math.max(1, width * 0.004);
    ctx.beginPath();
    ctx.moveTo(width * 0.22, height * 0.28);
    ctx.quadraticCurveTo(width * 0.48, height * 0.18, width * 0.72, height * 0.34);
    ctx.stroke();
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
        if (alpha < 48) cleared += 1;
      }
    }
    return inside ? cleared / inside : 0;
  }

  function spawnHeartBurst() {
    if (!els.heartBurst || prefersReduced) return;
    els.heartBurst.innerHTML = "";
    els.heartBurst.classList.add("is-on");
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const bit = document.createElement("span");
      const angle = (Math.PI * 2 * i) / count;
      const dist = 36 + (i % 3) * 18;
      bit.style.setProperty("--hx", `${Math.cos(angle) * dist}px`);
      bit.style.setProperty("--hy", `${Math.sin(angle) * dist - 18}px`);
      bit.style.animationDelay = `${i * 0.04}s`;
      els.heartBurst.appendChild(bit);
    }
    window.setTimeout(() => {
      if (!els.heartBurst) return;
      els.heartBurst.classList.remove("is-on");
      els.heartBurst.innerHTML = "";
    }, 1400);
  }

  function finishReveal() {
    if (dateOpened) return;
    dateOpened = true;
    document.body.classList.remove("is-scratch-locking");
    if (els.scratchCanvas) {
      const ctx = els.scratchCanvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, els.scratchCanvas.width, els.scratchCanvas.height);
    }
    els.heartStage.classList.add("is-open");
    if (els.revealFallback) els.revealFallback.hidden = true;
    spawnHeartBurst();
    spawnPetals(els.heartPetals, prefersReduced ? 0 : 16);
  }

  function initScratch() {
    const canvas = els.scratchCanvas;
    const stage = els.heartStage;
    if (!canvas || !stage || scratchReady) return;

    try {
      localStorage.removeItem("afzal-shahin-scratch-revealed");
    } catch (e) {
      /* ignore */
    }

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

    function eraseSegment(from, to) {
      const path = heartPath(canvas.width, canvas.height);
      if (!ctx.isPointInPath(path, to.x, to.y) && !ctx.isPointInPath(path, from.x, from.y)) {
        return false;
      }
      const brush = Math.max(34, canvas.width * 0.11);
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (from.x === to.x && from.y === to.y) {
        ctx.beginPath();
        ctx.arc(to.x, to.y, brush * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = brush;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.lineWidth = brush * 0.55;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
      ctx.restore();
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      travel += Math.max(brush * 0.25, Math.sqrt(dx * dx + dy * dy));
      return true;
    }

    function eraseAt(from, to) {
      if (!from || !to) return false;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.ceil(dist / Math.max(6, canvas.width * 0.018)));
      let ok = false;
      let prev = from;
      for (let i = 1; i <= steps; i += 1) {
        const next = {
          x: from.x + (dx * i) / steps,
          y: from.y + (dy * i) / steps
        };
        if (eraseSegment(prev, next)) ok = true;
        prev = next;
      }
      return ok;
    }

    function maybeFinish() {
      const need = prefersReduced ? 24 : 48;
      const ratio = 0.65;
      if (travel < need) return;
      if (percentCleared(ctx, canvas.width, canvas.height) >= ratio) finishReveal();
    }

    function lockScroll(on) {
      document.body.classList.toggle("is-scratch-locking", !!on);
    }

    function start(event) {
      if (dateOpened) return;
      event.preventDefault();
      drawing = true;
      last = pointFromEvent(event);
      stage.classList.add("is-scratching");
      lockScroll(true);
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (e) {
        /* ignore */
      }
      eraseAt(last, last);
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
      lockScroll(false);
      maybeFinish();
    }

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("pointerleave", (event) => {
      if (drawing) end(event);
    });
    canvas.addEventListener(
      "touchmove",
      (event) => {
        if (drawing) event.preventDefault();
      },
      { passive: false }
    );
    canvas.addEventListener(
      "touchstart",
      (event) => {
        if (!dateOpened) event.preventDefault();
      },
      { passive: false }
    );

    sizeCanvas();
    window.setTimeout(sizeCanvas, 80);
    window.setTimeout(sizeCanvas, 400);
    window.addEventListener("resize", sizeCanvas);
    scratchReady = true;
  }

  function typeBismillah() {
    const node = els.bismillah;
    if (!node) return Promise.resolve();
    const full =
      node.getAttribute("data-full-text") ||
      node.textContent.trim() ||
      "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
    if (prefersReduced || heroTyped) {
      node.textContent = full;
      node.classList.remove("is-typing");
      heroTyped = true;
      return Promise.resolve();
    }
    heroTyped = true;
    node.textContent = "";
    node.classList.add("is-typing");
    const chars = Array.from(full);
    let i = 0;
    return new Promise((resolve) => {
      const tick = () => {
        if (i >= chars.length) {
          node.classList.remove("is-typing");
          resolve();
          return;
        }
        node.textContent += chars[i];
        i += 1;
        window.setTimeout(tick, 78);
      };
      window.setTimeout(tick, 280);
    });
  }

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function getScrollY() {
    return window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  function getViewportHeight() {
    if (window.visualViewport && window.visualViewport.height) {
      return window.visualViewport.height;
    }
    return window.innerHeight || document.documentElement.clientHeight || 0;
  }

  function getMaxScrollY() {
    const doc = document.documentElement;
    const body = document.body;
    const height = Math.max(
      doc.scrollHeight,
      body ? body.scrollHeight : 0,
      doc.offsetHeight,
      body ? body.offsetHeight : 0
    );
    return Math.max(0, height - getViewportHeight());
  }

  function setScrollY(y) {
    const top = Math.max(0, y);
    // iOS Safari: only use window.scrollTo — writing body+documentElement fights itself.
    window.scrollTo(0, top);
  }

  function unlockPageScroll() {
    document.body.classList.remove("is-sealed");
    document.body.classList.add("is-invitation-open");
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
    document.body.style.position = "";
    document.body.style.touchAction = "";
    // Force Safari to recompute scrollability after overflow:hidden.
    void document.body.offsetHeight;
  }

  function stopAutoScroll() {
    autoScrollOn = false;
    document.documentElement.classList.remove("is-auto-scrolling");
    if (autoScrollRaf) {
      cancelAnimationFrame(autoScrollRaf);
      autoScrollRaf = 0;
    }
  }

  function startAutoScroll() {
    // Keep auto-scroll even with iOS "Reduce Motion" — otherwise invites never scroll on many iPhones.
    if (autoScrollOn) return;
    unlockPageScroll();

    if (getMaxScrollY() < 8) {
      window.setTimeout(startAutoScroll, 300);
      return;
    }

    autoScrollOn = true;
    document.documentElement.classList.add("is-auto-scrolling");

    let last = performance.now();
    let expectedY = getScrollY();
    let stuckFrames = 0;
    let readyFrames = 0;
    const pxPerSec = isIOS ? 30 : 34;

    const cleanup = () => {
      document.documentElement.classList.remove("is-auto-scrolling");
      window.removeEventListener("wheel", onWheelHalt, true);
      window.removeEventListener("touchstart", onTouchStart, true);
      window.removeEventListener("touchmove", onTouchMove, true);
      window.removeEventListener("keydown", onKeyHalt, true);
    };

    const halt = () => {
      if (!autoScrollOn) return;
      stopAutoScroll();
      cleanup();
    };

    const onKeyHalt = (event) => {
      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "];
      if (keys.includes(event.key)) halt();
    };

    const onWheelHalt = () => halt();

    let touchStartY = null;
    const onTouchStart = (event) => {
      const y = event.touches && event.touches[0] ? event.touches[0].clientY : null;
      touchStartY = y;
    };
    const onTouchMove = (event) => {
      const y = event.touches && event.touches[0] ? event.touches[0].clientY : null;
      if (y == null || touchStartY == null) return;
      // Larger threshold on iOS to avoid cancelling from tiny finger jitter.
      if (Math.abs(y - touchStartY) > (isIOS ? 22 : 14)) halt();
    };

    const step = (now) => {
      if (!autoScrollOn) return;
      const dt = Math.min(50, Math.max(0, now - last)) / 1000;
      last = now;

      const maxY = getMaxScrollY();
      if (maxY < 8) {
        readyFrames += 1;
        if (readyFrames > 200) {
          halt();
          return;
        }
        autoScrollRaf = requestAnimationFrame(step);
        return;
      }

      const before = getScrollY();
      const delta = Math.max(0.5, pxPerSec * dt);
      const next = Math.min(maxY, before + delta);
      expectedY = next;
      setScrollY(next);

      const after = getScrollY();
      if (after < before + 0.25 && next < maxY - 2) {
        stuckFrames += 1;
        // Fallback nudge if Safari ignored scrollTo
        if (stuckFrames === 3) {
          try {
            window.scrollBy(0, Math.ceil(delta));
          } catch (e) {
            /* ignore */
          }
        }
        if (stuckFrames > 45) {
          halt();
          return;
        }
      } else {
        stuckFrames = 0;
      }

      if (next >= maxY - 2 || after >= maxY - 2) {
        halt();
        return;
      }
      autoScrollRaf = requestAnimationFrame(step);
    };

    window.addEventListener("wheel", onWheelHalt, { passive: true, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
    window.addEventListener("keydown", onKeyHalt, true);
    // Do NOT listen to "scroll" for halt — iOS rubber-banding false-triggers and kills auto-scroll.

    autoScrollRaf = requestAnimationFrame(step);
  }

  function openInvitation() {
    if (opening || els.cover.hidden) return;
    opening = true;
    els.openBtn.classList.add("is-pressed");
    els.invitation.hidden = false;
    if (els.bismillah && !prefersReduced) els.bismillah.textContent = "";
    requestAnimationFrame(() => {
      document.getElementById("opening").classList.add("is-visible");
      revealSections(els.invitation);
      initScratch();
      startAmbientPetals();
      if (!prefersReduced) spawnPetals(els.petalField, 14);
      setMusicPlaying(true);
      typeBismillah().then(() => {
        const kickoff = () => {
          if (document.body.classList.contains("is-sealed")) {
            window.setTimeout(kickoff, 120);
            return;
          }
          unlockPageScroll();
          window.setTimeout(() => {
            requestAnimationFrame(() => startAutoScroll());
          }, isIOS ? 900 : 700);
        };
        kickoff();
      });
    });

    const reveal = () => {
      els.cover.classList.add("is-open");
      window.setTimeout(() => {
        els.cover.hidden = true;
        unlockPageScroll();
      }, prefersReduced ? 0 : 2100);
    };

    if (prefersReduced) {
      reveal();
      return;
    }
    window.setTimeout(reveal, 180);
  }

  function setMusicPlaying(on) {
    musicOn = !!on;
    if (els.musicBtn) {
      els.musicBtn.classList.toggle("is-on", musicOn);
      els.musicBtn.setAttribute("aria-pressed", String(musicOn));
    }
    if (!els.bgMusic) return;
    if (musicOn) {
      const play = els.bgMusic.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => {
          musicOn = false;
          if (els.musicBtn) {
            els.musicBtn.classList.remove("is-on");
            els.musicBtn.setAttribute("aria-pressed", "false");
          }
        });
      }
    } else {
      els.bgMusic.pause();
    }
  }

  function toggleMusic() {
    setMusicPlaying(!musicOn);
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function tickCountdown() {
    const target = new Date(W.nikah.iso).getTime();
    const diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    if (els.countDays) els.countDays.textContent = pad2(days);
    if (els.countHours) els.countHours.textContent = pad2(hours);
    if (els.countMinutes) els.countMinutes.textContent = pad2(minutes);
    if (els.countSeconds) els.countSeconds.textContent = pad2(seconds);
  }

  function startCountdown() {
    tickCountdown();
    window.setInterval(tickCountdown, 1000);
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
  startCountdown();
})();
