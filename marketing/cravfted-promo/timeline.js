window.__timelines = window.__timelines || {};

(function () {
  const DURATION = 24;
  const tl = gsap.timeline({ paused: true });

  function scene(id, start, end, fade) {
    const f = fade || 0.4;
    tl.set(`#${id}`, { autoAlpha: 1 }, start);
    tl.fromTo(`#${id}`, { opacity: 0 }, { opacity: 1, duration: f, ease: "power2.out" }, start);
    tl.to(`#${id}`, { opacity: 0, duration: f, ease: "power2.in" }, end - f);
    tl.set(`#${id}`, { autoAlpha: 0 }, end);
  }

  scene("scene-intro", 0, 1.6, 0.35);
  scene("scene-problem", 1.6, 5.2);
  scene("scene-json", 5.2, 9.4);
  scene("scene-sections", 9.4, 12.6);
  scene("scene-ai", 12.6, 16.6);
  scene("scene-pdf", 16.6, 20);
  scene("scene-outro", 20, DURATION, 0.01);
  tl.set("#scene-outro", { autoAlpha: 1 }, DURATION);

  // 1 · Brand intro
  tl.fromTo(".intro-mark", { scale: 0.62, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.7)" }, 0.12);
  tl.fromTo(".intro-wordmark", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.42);
  tl.fromTo(".intro-rule", { width: 0 }, { width: 230, duration: 0.55, ease: "power2.out" }, 0.7);

  // 2 · Problem
  tl.fromTo(".scene-problem .chips .chip", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.12, ease: "power2.out" }, 1.95);
  tl.fromTo(".scene-problem .hero", { y: 44, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: "power3.out" }, 2.45);
  tl.to(".scene-problem .chips .chip", { opacity: 0.22, y: -8, duration: 0.5, stagger: 0.06, ease: "power2.in" }, 3.85);
  tl.fromTo(".scene-problem .support", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }, 3.7);

  // 3 · JSON editor
  tl.fromTo(".json-frame", { x: 170, rotation: -3, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.95, ease: "power3.out" }, 5.4);
  tl.fromTo("#scene-json .caption-block > *", { x: -36, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, stagger: 0.1, ease: "power2.out" }, 6.05);
  tl.to(".scan-highlight", { opacity: 1, duration: 0.4 }, 6.7);
  tl.to(".scan-highlight", { opacity: 0, duration: 0.4 }, 8.55);

  // 4 · Sections
  tl.fromTo(".scene-sections .eyebrow", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 9.7);
  tl.fromTo(".card", { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.12, ease: "back.out(1.3)" }, 9.95);
  tl.to('.card[data-card="0"]', { x: 378, duration: 0.8, ease: "power2.inOut" }, 11.1);
  tl.to('.card[data-card="2"]', { x: -378, duration: 0.8, ease: "power2.inOut" }, 11.1);
  tl.fromTo(".scene-sections .caption, .scene-sections .subcaption", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, stagger: 0.1 }, 10.6);

  // 5 · AI assistant
  tl.fromTo(".ai-frame", { x: -170, rotation: 2, opacity: 0 }, { x: 0, rotation: 0, opacity: 1, duration: 0.95, ease: "power3.out" }, 12.8);
  tl.fromTo("#scene-ai .caption-block > *", { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, stagger: 0.1, ease: "power2.out" }, 13.5);
  tl.to(".chat-highlight", { opacity: 1, duration: 0.4 }, 14.1);
  tl.to(".chat-highlight", { opacity: 0, duration: 0.4 }, 15.7);

  // 6 · Deterministic export
  tl.fromTo(".pages", { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 16.8);
  tl.to(".page-back", { x: -50, rotation: 0, duration: 0.9, ease: "power2.inOut" }, 17.7);
  tl.to(".page-front", { x: 0, y: 0, rotation: 0, duration: 0.9, ease: "power2.inOut" }, 17.7);
  tl.fromTo(".checkmark", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(2.2)" }, 18.75);
  tl.fromTo(".scene-pdf .eyebrow, .scene-pdf .caption, .scene-pdf .subcaption", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.12 }, 17.4);

  // 7 · Outro
  tl.fromTo(".outro-mark", { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.65, ease: "back.out(1.7)" }, 20.15);
  tl.fromTo(".outro-wordmark", { y: 34, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 20.5);
  tl.fromTo(".outro-rule", { width: 0 }, { width: 260, duration: 0.55, ease: "power2.out" }, 20.85);
  tl.fromTo(".outro-tagline", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, 21.35);
  tl.fromTo(".outro-cta", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 22.0);

  window.__timelines.main = tl;
  window.__projectMeta = { duration: DURATION, fps: 24, width: 1920, height: 1080 };
})();
