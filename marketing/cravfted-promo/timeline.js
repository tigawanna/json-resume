window.__timelines = window.__timelines || {};

(function () {
  const DURATION = 30;
  const tl = gsap.timeline({ paused: true });

  function scene(id, start, end, fade) {
    const f = fade || 0.4;
    tl.set(`#${id}`, { autoAlpha: 1 }, start);
    tl.fromTo(`#${id}`, { opacity: 0 }, { opacity: 1, duration: f, ease: "power2.out" }, start);
    tl.to(`#${id}`, { opacity: 0, duration: f, ease: "power2.in" }, end - f);
    tl.set(`#${id}`, { autoAlpha: 0 }, end);
  }

  scene("scene-intro", 0, 1.5, 0.35);
  scene("scene-problem", 1.5, 4.5);
  scene("scene-start", 4.5, 7);
  scene("scene-jd", 7, 10.5);
  scene("scene-assistant", 10.5, 13.5);
  scene("scene-aitab", 13.5, 16.5);
  scene("scene-tailor", 16.5, 20.5);
  scene("scene-letter", 20.5, 23.5);
  scene("scene-pdf", 23.5, 26);
  scene("scene-outro", 26, DURATION, 0.01);
  tl.set("#scene-outro", { autoAlpha: 1 }, DURATION);

  function copyIn(selector, at, from) {
    tl.fromTo(
      `${selector} > *`,
      { x: from, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.55, stagger: 0.1, ease: "power2.out" },
      at,
    );
  }

  // 1 · Brand intro
  tl.fromTo(
    ".intro-mark",
    { scale: 0.62, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.7)" },
    0.1,
  );
  tl.fromTo(
    ".intro-wordmark",
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    0.4,
  );
  tl.fromTo(".intro-rule", { width: 0 }, { width: 230, duration: 0.55, ease: "power2.out" }, 0.67);

  // 2 · Problem
  tl.fromTo(
    ".scene-problem .chip",
    { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.45, stagger: 0.12, ease: "power2.out" },
    1.8,
  );
  tl.fromTo(
    ".scene-problem .hero",
    { y: 44, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
    2.2,
  );
  tl.fromTo(
    ".scene-problem .support",
    { y: 18, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
    3.2,
  );
  tl.to(".scene-problem .chip", { opacity: 0.22, y: -8, duration: 0.5, stagger: 0.06 }, 3.4);

  // 3 · Dashboard
  tl.fromTo(
    ".start-frame",
    { x: -120, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.85, ease: "power3.out" },
    4.65,
  );
  copyIn("#scene-start .caption-block", 5.2, 40);

  // 4 · Paste the job description
  tl.fromTo(
    ".jd-frame",
    { x: 140, rotation: 2, opacity: 0 },
    { x: 0, rotation: 0, opacity: 1, duration: 0.85, ease: "power3.out" },
    7.15,
  );
  copyIn("#scene-jd .caption-block", 7.8, -40);

  // 5 · Assistant picks a résumé
  tl.fromTo(
    ".assistant-frame",
    { x: 120, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
    10.65,
  );
  copyIn("#scene-assistant .caption-block", 11.2, -40);

  // 6 · AI workbench
  tl.fromTo(
    ".aitab-frame",
    { y: 70, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
    13.65,
  );
  copyIn("#scene-aitab .caption-block", 14.3, 0);

  // 7 · Tailoring with visible diff
  tl.fromTo(
    ".tailor-frame",
    { scale: 1.04, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.9, ease: "power3.out" },
    16.65,
  );
  copyIn("#scene-tailor .caption-block", 17.5, 0);

  // 8 · Cover letter
  tl.fromTo(
    ".letter-frame",
    { x: -120, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
    20.65,
  );
  copyIn("#scene-letter .caption-block", 21.2, 40);

  // 9 · Deterministic export
  tl.fromTo(
    ".pages",
    { y: 60, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
    23.65,
  );
  tl.to(".page-back", { x: -50, rotation: 0, duration: 0.8, ease: "power2.inOut" }, 24.5);
  tl.to(".page-front", { x: 0, y: 0, rotation: 0, duration: 0.8, ease: "power2.inOut" }, 24.5);
  tl.fromTo(
    ".checkmark",
    { scale: 0, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(2.2)" },
    25.1,
  );
  tl.fromTo(
    ".scene-pdf .eyebrow, .pdf-copy, .pdf-sub",
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 },
    24.1,
  );

  // 10 · Outro
  tl.fromTo(
    ".outro-mark",
    { scale: 0.6, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.65, ease: "back.out(1.7)" },
    26.15,
  );
  tl.fromTo(
    ".outro-wordmark",
    { y: 34, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
    26.5,
  );
  tl.fromTo(".outro-rule", { width: 0 }, { width: 260, duration: 0.55, ease: "power2.out" }, 26.85);
  tl.fromTo(
    ".outro-tagline",
    { y: 26, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
    27.3,
  );
  tl.fromTo(".outro-cta", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 28);

  window.__timelines.main = tl;
  window.__projectMeta = { duration: DURATION, fps: 24, width: 1920, height: 1080 };
})();
