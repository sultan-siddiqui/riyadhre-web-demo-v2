(() => {
  // v:gsap
  var gsap = window.RRVendor.gsap;

  // v:gsap/ScrollTrigger
  var ScrollTrigger = window.RRVendor.ScrollTrigger;

  // v:gsap/SplitText
  var SplitText = window.RRVendor.SplitText;

  // v:lenis
  var lenis_default = window.RRVendor.Lenis;

  // src/engine/app.ts
  var $ = (s, r = document) => r.querySelector(s);
  var $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  var WIPE_KEY = "rr-wipe";
  var store = {
    set(v) {
      try {
        sessionStorage.setItem(WIPE_KEY, v);
      } catch {
      }
    }
  };
  gsap.registerPlugin(ScrollTrigger, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  function init(opts) {
    const html = document.documentElement;
    const site = $(".site");
    if (!site) return () => {
    };
    window.__rr = true;
    const rtl = html.dir === "rtl";
    const X = rtl ? -1 : 1;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    html.classList.add("js");
    html.classList.toggle("reduced", reduced);
    const ac = new AbortController();
    const on = (t, e, f, o = {}) => t?.addEventListener(e, f, { signal: ac.signal, ...o });
    const cleanups = [];
    const splits = [];
    let lenis = null;
    if (!reduced) {
      lenis = new lenis_default({ lerp: 0.105, wheelMultiplier: 1, anchors: false });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (t) => lenis?.raf(t * 1e3);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => {
        gsap.ticker.remove(tick);
        lenis?.destroy();
      });
    }
    const lock = (v) => {
      if (lenis) v ? lenis.stop() : lenis.start();
      const bar = innerWidth - html.clientWidth;
      if (v && bar > 0) document.body.style.paddingInlineEnd = head.style.paddingInlineEnd = `${bar}px`;
      if (!v) document.body.style.paddingInlineEnd = head.style.paddingInlineEnd = "";
      document.body.style.overflow = v ? "hidden" : "";
    };
    const head = $("[data-head]");
    const headH = () => $(".head")?.offsetHeight || 80;
    const scrollTo = (target, immediate = false) => {
      if (lenis) lenis.scrollTo(target, { offset: typeof target === "number" ? 0 : -headH() + 2, immediate, duration: 1.4 });
      else if (typeof target === "number") scrollToY(target);
      else target.scrollIntoView();
    };
    const scrollToY = (y) => window.scrollTo(0, y);
    const wipe = $("[data-wipe]");
    const bands = wipe ? $$("i", wipe) : [];
    let leaving = false;
    const arrive = () => {
      const arriving = html.classList.contains("is-arriving");
      if (!arriving || !bands.length) return 0;
      html.classList.remove("is-arriving");
      gsap.set(wipe, { visibility: "visible" });
      gsap.fromTo(bands, { scaleX: 1, transformOrigin: rtl ? "left" : "right" }, {
        scaleX: 0,
        duration: 0.95,
        ease: "expo.inOut",
        stagger: { each: 0.07, from: "end" },
        onComplete: () => {
          gsap.set(wipe, { visibility: "hidden" });
        }
      });
      return 0.45;
    };
    const leave = (href) => {
      if (leaving) return;
      leaving = true;
      const go = () => {
        if (opts.navigate) {
          html.classList.add("is-arriving");
          opts.navigate(href);
        } else {
          store.set("1");
          location.href = href;
        }
      };
      if (reduced || !bands.length) {
        if (opts.navigate) opts.navigate(href);
        else location.href = href;
        return;
      }
      gsap.set(wipe, { visibility: "visible" });
      gsap.fromTo(bands, { scaleX: 0, transformOrigin: rtl ? "right" : "left" }, { scaleX: 1, duration: 0.7, ease: "expo.inOut", stagger: 0.06, onComplete: go });
      setTimeout(() => {
        if (leaving) go();
      }, 1600);
    };
    on(window, "pageshow", (e) => {
      if (e.persisted) {
        leaving = false;
        html.classList.remove("is-arriving");
        gsap.set(wipe, { visibility: "hidden" });
        gsap.set(bands, { scaleX: 0 });
      }
    });
    on(document, "click", (e) => {
      const a = e.target.closest?.("a");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== "_self") return;
      const raw = a.getAttribute("href") || "";
      if (/^(mailto|tel):/.test(raw)) return;
      const u = new URL(a.href, location.href);
      if (u.protocol !== location.protocol || u.host !== location.host) return;
      const same = u.pathname.replace(/index\.html$/, "") === location.pathname.replace(/index\.html$/, "") && u.search === location.search;
      e.preventDefault();
      if (same && u.hash) {
        closeMenu();
        closeDrops();
        const t = u.hash === "#top" ? 0 : document.getElementById(decodeURIComponent(u.hash.slice(1)));
        if (t === 0) scrollTo(0);
        else if (t) {
          scrollTo(t);
          t.setAttribute("tabindex", "-1");
          t.focus({ preventScroll: true });
        }
        if (u.hash !== "#top") history.replaceState(null, "", u.hash);
        return;
      }
      if (same) {
        closeMenu();
        scrollTo(0);
        return;
      }
      leave(a.href);
    });
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - lastY;
      if (Math.abs(d) > 5) {
        const open = head.classList.contains("is-open") || html.classList.contains("menu-open");
        head.classList.toggle("is-hidden", d > 0 && y > 180 && !open);
        lastY = y;
      }
      head.classList.toggle("is-solid", y > 120);
    };
    on(window, "scroll", onScroll, { passive: true });
    onScroll();
    const drops = $$("[data-drop]");
    let closeT = 0;
    const closeDrops = (except) => {
      drops.forEach((d) => {
        if (d !== except) {
          d.classList.remove("is-open");
          $("button", d)?.setAttribute("aria-expanded", "false");
        }
      });
      if (!except) head.classList.remove("is-open");
    };
    const openDrop = (d) => {
      clearTimeout(closeT);
      closeDrops(d);
      d.classList.add("is-open");
      head.classList.add("is-open");
      $("button", d)?.setAttribute("aria-expanded", "true");
      if (!reduced) gsap.fromTo($$(".drop__list li, .drop__note", d), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.045, delay: 0.12, ease: "power3.out", overwrite: true });
    };
    drops.forEach((d) => {
      const b = $("button", d);
      if (fine) {
        on(d, "pointerenter", () => {
          if (!d.classList.contains("is-open")) openDrop(d);
          else clearTimeout(closeT);
        });
        on(d, "pointerleave", () => {
          closeT = window.setTimeout(() => closeDrops(), 220);
        });
      }
      on(b, "click", (e) => {
        if (d.classList.contains("is-open") && !(fine && e.detail > 0)) closeDrops();
        else openDrop(d);
      });
      on(d, "focusout", (e) => {
        if (!d.contains(e.relatedTarget)) closeDrops();
      });
    });
    on(document, "pointerdown", (e) => {
      if (!head.contains(e.target)) closeDrops();
    });
    const menu = $("[data-menu]");
    const burger = $("[data-burger]");
    let menuTl = null;
    const setMenu = (v) => {
      if (!menu || !burger || html.classList.contains("menu-open") === v) return;
      html.classList.toggle("menu-open", v);
      burger.setAttribute("aria-expanded", String(v));
      menu.setAttribute("aria-hidden", String(!v));
      menu.inert = !v;
      lock(v);
      const b = $$(".menu__bands i", menu), items = $$(".menu__nav a, .menu__title, .menu__foot", menu);
      menuTl?.kill();
      const dur = reduced ? 0.01 : 0.7;
      if (v) {
        head.classList.remove("is-hidden");
        head.dataset.was = head.dataset.on || "dark";
        head.classList.add("is-menu");
        head.dataset.on = "dark";
        menuTl = gsap.timeline().set(menu, { visibility: "visible" }).fromTo(b, { scaleX: 0, transformOrigin: rtl ? "left" : "right" }, { scaleX: 1, duration: dur, ease: "expo.inOut", stagger: 0.05 }).fromTo(items, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: dur, ease: "power3.out", stagger: 0.025 }, "-=0.25");
      } else {
        head.classList.remove("is-menu");
        menuTl = gsap.timeline({ onComplete: () => {
          gsap.set(menu, { visibility: "hidden" });
        } }).to(items, { autoAlpha: 0, duration: 0.2 }).to(b, { scaleX: 0, transformOrigin: rtl ? "right" : "left", duration: dur * 0.85, ease: "expo.inOut", stagger: 0.04 }, "<").add(() => {
          head.dataset.on = head.dataset.was || "dark";
        }, "-=0.3");
      }
    };
    const closeMenu = () => setMenu(false);
    on(burger, "click", () => setMenu(!html.classList.contains("menu-open")));
    on(window, "keydown", (e) => {
      if (e.key !== "Escape") return;
      if (html.classList.contains("menu-open")) {
        closeMenu();
        burger?.focus();
      }
      const o = $(".nav__item.is-open button");
      if (o) {
        closeDrops();
        o.focus();
      }
    });
    on(window, "resize", () => {
      if (innerWidth >= 1100) closeMenu();
    });
    let sand = null;
    let sandState = 0;
    const zones = /* @__PURE__ */ new Set();
    const sandEl = $("[data-sand]");
    const setSand = (v) => {
      sandState = v;
      sand?.setState(v);
    };
    const wakeSand = () => sand?.show(zones.size > 0);
    let dead = false;
    if (sandEl) {
      const start = async () => {
        try {
          const { Sand } = await opts.loadSand();
          if (dead) return;
          const s = new Sand({ canvas: $("canvas", sandEl), formations: sandEl.dataset.sand.split(","), rtl, reduced });
          const ok = await s.init();
          if (dead) {
            s.destroy();
            return;
          }
          if (!ok) {
            sandEl.classList.add("no-gl");
            return;
          }
          sand = s;
          sand.setState(sandState);
          sand.reveal();
          wakeSand();
        } catch {
          sandEl.classList.add("no-gl");
        }
      };
      setTimeout(start, 40);
    }
    const ctx = gsap.context(() => {
      $$("[data-tone]", site).forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: "top 44px",
          end: "bottom 44px",
          onToggle: (s) => {
            if (s.isActive) {
              if (html.classList.contains("menu-open")) head.dataset.was = el.dataset.tone;
              else head.dataset.on = el.dataset.tone;
            }
          }
        });
      });
      $$("[data-sand-zone]").forEach((el) => {
        ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (s) => {
          s.isActive ? zones.add(el) : zones.delete(el);
          wakeSand();
        } });
        if (el.getBoundingClientRect().top < innerHeight) zones.add(el);
      });
      if (reduced) {
        $$("[data-lines],[data-fade],.media[data-media]").forEach((e) => e.classList.add("is-in"));
        $$("[data-split]").forEach((e) => e.classList.add("is-split"));
        $$(".stratum").forEach((e, i) => e.classList.toggle("is-active", i === 0));
      } else motion();
    }, site);
    function motion() {
      const delay = arrive();
      $$("[data-lines]").forEach((el) => {
        const hero = el.dataset.lines === "hero";
        const lns = $$(".ln", el), inn = $$(".ln__in", el);
        lns.forEach((l) => l.classList.add("is-masked"));
        const tween = gsap.fromTo(inn, { yPercent: 125 }, {
          yPercent: 0,
          duration: 1.35,
          ease: "expo.out",
          stagger: 0.11,
          delay: hero ? delay + 0.1 : 0,
          paused: true,
          onStart: () => {
            el.classList.add("is-in");
          },
          onComplete: () => {
            lns.forEach((l) => l.classList.remove("is-masked"));
            gsap.set(inn, { clearProps: "transform" });
          }
        });
        if (hero) tween.play();
        else ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => {
          tween.play();
        } });
      });
      $$("[data-fade]").forEach((el) => {
        const hero = el.dataset.fade === "hero";
        gsap.fromTo(el, { autoAlpha: 0, y: 26 }, {
          autoAlpha: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          delay: hero ? delay + 0.55 : 0,
          onStart: () => {
            el.classList.add("is-in");
          },
          onComplete: () => {
            gsap.set(el, { clearProps: "transform,opacity,visibility" });
          },
          scrollTrigger: hero ? void 0 : { trigger: el, start: "top 90%", once: true }
        });
      });
      const doSplit = () => {
        if (dead) return;
        $$("[data-split]").forEach((el) => {
          const s = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "split-line" });
          splits.push(s);
          el.classList.add("is-split");
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              s.revert();
            }
          };
          gsap.set(s.lines, { yPercent: 125 });
          const run = () => {
            if (!done) gsap.to(s.lines, { yPercent: 0, duration: 1.25, ease: "expo.out", stagger: 0.09, onComplete: finish });
          };
          const st = ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: run });
          const w = innerWidth;
          on(window, "resize", () => {
            if (!done && Math.abs(innerWidth - w) > 4) {
              st.kill();
              finish();
            }
          });
        });
      };
      (document.fonts?.ready || Promise.resolve()).then(() => ctx.add(doSplit));
      $$(".media[data-media]").forEach((el) => {
        const img = $("img", el);
        const still = img && !img.hasAttribute("data-parallax");
        gsap.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.35,
          ease: "expo.inOut",
          onStart: () => {
            el.classList.add("is-in");
          },
          onComplete: () => {
            gsap.set(el, { clearProps: "clipPath" });
          },
          scrollTrigger: { trigger: el.parentElement, start: "top 84%", once: true }
        });
        if (still) gsap.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.9, ease: "expo.out", delay: 0.25, clearProps: "transform", scrollTrigger: { trigger: el.parentElement, start: "top 84%", once: true } });
      });
      $$("img[data-parallax]").forEach((img) => {
        const p = parseFloat(img.dataset.parallax) || 8;
        gsap.fromTo(img, { yPercent: -p / 2 }, { yPercent: p / 2, ease: "none", scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
      });
      $$("[data-words]").forEach((el) => {
        const words = (el.textContent || "").trim().split(/\s+/);
        el.textContent = "";
        words.forEach((w, i) => {
          const s = document.createElement("span");
          s.className = "w";
          s.textContent = w;
          el.append(s, i < words.length - 1 ? " " : "");
        });
        gsap.fromTo($$(".w", el), { opacity: 0.16 }, { opacity: 1, ease: "none", stagger: 0.5, scrollTrigger: { trigger: el, start: "top 78%", end: "bottom 52%", scrub: 0.6 } });
      });
      home();
      about();
      const mark = $("[data-mark] svg");
      if (mark) gsap.fromTo(mark, { yPercent: 34, opacity: 0.15 }, { yPercent: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: ".foot", start: "top 70%", end: "bottom bottom", scrub: true } });
    }
    function home() {
      const story = $("[data-story]");
      if (!story) return;
      const hero = $("[data-hero]");
      gsap.to($$(".hero__in > *, .hero__cue", hero), { yPercent: -18, autoAlpha: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: hero, start: "top top", end: "72% top", scrub: true } });
      ScrollTrigger.create({ trigger: hero, start: "top top", end: "bottom top", scrub: true, onUpdate: (s) => {
        if (s.progress < 1) setSand(gsap.utils.clamp(0, 1, (s.progress - 0.12) / 0.88));
      } });
      const steps = $$("[data-step]", story);
      const bars = $$(".story__bar i", story);
      let cur = -1;
      const show = (i) => {
        if (i === cur) return;
        const dir = i > cur ? 1 : -1;
        const prev = steps[cur];
        cur = i;
        if (prev) gsap.to(prev, { autoAlpha: 0, y: -26 * dir, duration: 0.45, ease: "power2.in", overwrite: true });
        steps.forEach((s, k) => {
          if (k !== i && s !== prev) gsap.set(s, { autoAlpha: 0 });
        });
        if (steps[i]) gsap.fromTo(steps[i], { autoAlpha: 0, y: 40 * dir }, { autoAlpha: 1, y: 0, duration: 0.95, delay: prev ? 0.32 : 0, ease: "power3.out", overwrite: true });
      };
      const seg = (p, a, b) => gsap.utils.clamp(0, 1, (p - a) / (b - a));
      ScrollTrigger.create({
        trigger: story,
        start: "top 55%",
        end: "bottom 60%",
        onUpdate: (s) => {
          const p = s.progress;
          show(p < 0.06 ? -1 : p < 0.38 ? 0 : p < 0.7 ? 1 : 2);
          [[0.06, 0.38], [0.38, 0.7], [0.7, 0.98]].forEach(([a, b], i) => bars[i]?.style.setProperty("--p", String(seg(p, a, b))));
          if (p > 0.1) setSand(1 + seg(p, 0.28, 0.46) + seg(p, 0.6, 0.78));
        }
      });
      const rating = $("[data-rating]");
      if (rating) {
        ScrollTrigger.create({ trigger: rating, start: "top bottom", end: "top 5%", onUpdate: (s) => setSand(3 + gsap.utils.clamp(0, 1, s.progress * 1.15 - 0.1)) });
        gsap.fromTo($("[data-grade]", rating), { autoAlpha: 0, scale: 0.86 }, { autoAlpha: 1, scale: 1, ease: "none", scrollTrigger: { trigger: rating, start: "top 30%", end: "top -18%", scrub: 0.5 } });
        const cv = $("[data-sand] canvas");
        if (cv) gsap.fromTo(cv, { y: 0 }, { y: () => -innerHeight, ease: "none", immediateRender: false, scrollTrigger: { trigger: rating, start: "bottom bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true } });
      }
      const frame = $("[data-film-frame]");
      if (frame) gsap.fromTo(frame, { clipPath: "inset(9% 15% 9% 15%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: frame, start: "top 92%", end: "top 8%", scrub: true } });
    }
    function about() {
      const ex = $("[data-expand]");
      if (ex) gsap.fromTo($("[data-expand-media]", ex), { clipPath: "inset(16% 14% 16% 14%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: ex, start: "top 75%", end: "top -25%", scrub: true } });
      if (ex) gsap.fromTo($(".vision__in", ex), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, ease: "power1.out", scrollTrigger: { trigger: ex, start: "top 8%", end: "top -30%", scrub: 0.4 } });
      const row = $("[data-faces]");
      if (row) gsap.fromTo(row, { x: 0 }, { x: () => -X * Math.max(0, row.scrollWidth - innerWidth), ease: "none", scrollTrigger: { trigger: row, start: "top 92%", end: "bottom 12%", scrub: 0.7, invalidateOnRefresh: true } });
    }
    const strata = $$("[data-stratum]");
    if (strata.length) {
      const wide = matchMedia("(min-width: 900px)");
      const act = (el) => strata.forEach((s) => s.classList.toggle("is-active", s === el));
      act(strata[0]);
      strata.forEach((s) => {
        on(s, "pointermove", (e) => {
          if (e.pointerType === "mouse" && (e.movementX || e.movementY)) act(s);
        });
        on(s, "focus", () => act(s));
        on(s, "click", (e) => {
          if (!fine && wide.matches && !s.classList.contains("is-active")) {
            e.preventDefault();
            act(s);
          }
        }, { capture: true });
      });
    }
    const vids = $$("video[data-autoplay]");
    if (vids.length && !reduced) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        const v = e.target;
        if (e.isIntersecting) {
          v.preload = "auto";
          v.play().catch(() => {
          });
        } else v.pause();
      }), { rootMargin: "10%" });
      vids.forEach((v) => {
        v.muted = true;
        io.observe(v);
      });
      cleanups.push(() => io.disconnect());
    }
    const player = $("[data-player]");
    const filmBtn = $("[data-film]");
    if (player && filmBtn) {
      const v = $("video", player);
      on(filmBtn, "click", () => {
        if (!v.src) v.src = filmBtn.dataset.film;
        player.showModal();
        lock(true);
        v.play().catch(() => {
        });
      });
      on(player, "close", () => {
        v.pause();
        lock(false);
      });
      on($("[data-close]", player), "click", () => player.close());
      on(player, "click", (e) => {
        if (e.target === player) player.close();
      });
    }
    $$("[data-bio]").forEach((b) => {
      const d = document.getElementById(b.dataset.bio);
      if (!d) return;
      const panel = $(".bio__panel", d);
      const close = () => {
        if (reduced) {
          d.close();
          return;
        }
        gsap.to(d, { backgroundColor: "rgba(51,38,30,0)", duration: 0.5 });
        gsap.to(panel, { xPercent: 101 * X, duration: 0.55, ease: "expo.in", onComplete: () => d.close() });
      };
      on(b, "click", () => {
        d.showModal();
        lock(true);
        panel.scrollTop = 0;
        if (reduced) return;
        gsap.fromTo(d, { backgroundColor: "rgba(51,38,30,0)" }, { backgroundColor: "rgba(51,38,30,0.62)", duration: 0.6 });
        gsap.fromTo(panel, { xPercent: 101 * X }, { xPercent: 0, duration: 0.85, ease: "expo.out" });
        gsap.fromTo($$(".bio__pic, h3, .bio__role, .body", panel), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.25, stagger: 0.06, ease: "power3.out" });
      });
      on($("[data-close]", d), "click", close);
      on(d, "click", (e) => {
        if (e.target === d) close();
      });
      on(d, "cancel", (e) => {
        e.preventDefault();
        close();
      });
      on(d, "close", () => {
        lock(false);
        b.focus({ preventScroll: true });
      });
    });
    const news = $("[data-news]");
    if (news) {
      const btns = $$("[data-filter]", news), rows = $$("[data-cat]", news);
      btns.forEach((b) => on(b, "click", () => {
        btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        const f = b.dataset.filter;
        rows.forEach((r) => {
          r.hidden = !!f && r.dataset.cat !== f;
        });
        const shown = rows.filter((r) => !r.hidden);
        if (!reduced) gsap.fromTo(shown, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06, ease: "power3.out", clearProps: "all" });
        ScrollTrigger.refresh();
      }));
    }
    $$("[data-job]").forEach((d) => {
      const sum = $("summary", d), body = $(".job__body", d);
      on(sum, "click", (e) => {
        if (reduced) {
          d.classList.toggle("is-open", !d.open);
          return;
        }
        e.preventDefault();
        const opening = !d.classList.contains("is-open");
        d.classList.toggle("is-open", opening);
        if (opening) d.open = true;
        gsap.to(body, { height: opening ? "auto" : 0, duration: 0.7, ease: "expo.out", startAt: opening ? { height: 0 } : void 0, overwrite: true, onComplete: () => {
          if (!opening) d.open = false;
          ScrollTrigger.refresh();
        } });
      });
    });
    const copy = $("[data-copy]");
    if (copy) on(copy, "click", async () => {
      const s = $("span", copy);
      const label = s.textContent;
      try {
        await navigator.clipboard.writeText(location.href);
        s.textContent = copy.dataset.copied;
        setTimeout(() => {
          s.textContent = label;
        }, 2400);
      } catch {
      }
    });
    const form = $("[data-contact]");
    if (form) {
      const check = (el) => {
        const bad = !el.value.trim() || el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        el.setAttribute("aria-invalid", String(bad));
        const err = document.getElementById(el.getAttribute("aria-describedby") || "");
        if (err) err.textContent = bad ? el.dataset.err : "";
        return !bad;
      };
      const req = $$("[required]", form);
      req.forEach((el) => on(el, "input", () => {
        if (el.getAttribute("aria-invalid") === "true") check(el);
      }));
      on(form, "submit", (e) => {
        e.preventDefault();
        const ok = req.map(check).every(Boolean);
        if (!ok) {
          req.find((el) => el.getAttribute("aria-invalid") === "true")?.focus();
          return;
        }
        const f = new FormData(form);
        const body = `${f.get("message")}

${f.get("name")}
${f.get("company") || ""}
${f.get("email")}`;
        location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(String(f.get("topic")))}&body=${encodeURIComponent(body)}`;
        const done = $(".contact__done", form);
        if (done) done.hidden = false;
      });
    }
    if (reduced) html.classList.remove("is-arriving");
    const hash = decodeURIComponent(location.hash.slice(1));
    const settle = () => {
      if (dead) return;
      ScrollTrigger.refresh();
      if (hash && hash !== "top") {
        const t = document.getElementById(hash);
        if (t) scrollTo(t, true);
      }
    };
    (document.fonts?.ready || Promise.resolve()).then(() => requestAnimationFrame(settle));
    on(window, "load", () => ScrollTrigger.refresh());
    return () => {
      dead = true;
      ac.abort();
      lock(false);
      html.classList.remove("menu-open");
      sand?.destroy();
      ctx.revert();
      splits.forEach((s) => s.revert());
      cleanups.forEach((f) => f());
      menuTl?.kill();
    };
  }

  // <stdin>
  var me = document.currentScript;
  var sandSrc = me.src.replace(/app\.js(\?.*)?$/, "sand.min.js");
  init({
    loadSand: () => new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = sandSrc;
      s.onload = () => resolve(window.RRSand);
      s.onerror = reject;
      document.head.append(s);
    })
  });
})();
