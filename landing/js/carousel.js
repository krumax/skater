/**
 * Horizontales Scroll-Carousel mit CSS snap.
 * - Auto-Advance: startet 2s nach Seitenload, wechselt alle 3s zur nächsten Card
 * - Pausiert bei Hover, Touch oder manuellem Dot-Klick (5s Cooldown)
 * - Hover-Gesten: Links-Hover scrollt nach links, Rechts-Hover scrollt nach rechts
 */
(function () {
  const track   = document.querySelector('.vc-track');
  const cards   = Array.from(document.querySelectorAll('.vc-card'));
  const dots    = Array.from(document.querySelectorAll('.vc-dot'));
  const section = document.querySelector('.vc-section');

  if (!track || !cards.length) return;

  let currentIdx    = 0;
  let autoTimer     = null;
  let pauseTimer    = null;
  let hoverScroll   = null;
  let isPaused      = false;
  const AUTO_DELAY  = 2000;  // ms bis erster Schritt
  const AUTO_INTERVAL = 3000; // ms zwischen Schritten
  const PAUSE_AFTER_INTERACTION = 5000; // ms Pause nach User-Interaktion
  const scrollSpeed = 8;

  function setActive(idx) {
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    cards.forEach((c, i) => c.classList.toggle('active', i === idx));
    currentIdx = idx;
  }

  function goTo(idx) {
    const target = cards[idx];
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  }

  function advance() {
    const next = (currentIdx + 1) % cards.length;
    goTo(next);
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => {
      if (!isPaused) advance();
    }, AUTO_INTERVAL);
  }

  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  // Pause auto-advance temporarily after user interaction
  function pauseTemporarily() {
    isPaused = true;
    if (pauseTimer) clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => { isPaused = false; }, PAUSE_AFTER_INTERACTION);
  }

  // IntersectionObserver: welche Card ist sichtbar?
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = cards.indexOf(entry.target);
        if (idx !== -1) setActive(idx);
      }
    });
  }, { root: track, threshold: 0.5, rootMargin: '0px -20% 0px -20%' });

  cards.forEach(c => observer.observe(c));

  // Dot-Klick scrollt zur Card und pausiert Auto
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      pauseTemporarily();
      goTo(i);
    });
  });

  // Pause on hover over the section
  if (section) {
    section.addEventListener('mouseenter', () => { isPaused = true; });
    section.addEventListener('mouseleave', () => {
      // Resume only if no manual pause is active
      if (!pauseTimer) isPaused = false;
    });
  }

  // Pause on touch (mobile swipe)
  track.addEventListener('touchstart', pauseTemporarily, { passive: true });

  // Hover-Gesten: Links/Rechts-Bereich zum Scrollen
  function startHoverScroll(direction) {
    pauseTemporarily();
    if (hoverScroll) clearInterval(hoverScroll);
    hoverScroll = setInterval(() => {
      track.scrollLeft += direction === 'left' ? -scrollSpeed : scrollSpeed;
    }, 16);
  }

  function stopHoverScroll() {
    if (hoverScroll) { clearInterval(hoverScroll); hoverScroll = null; }
  }

  if (section) {
    const leftZone = document.createElement('div');
    leftZone.style.cssText = `position:absolute;left:0;top:0;width:20%;height:100%;cursor:w-resize;z-index:10;`;
    leftZone.addEventListener('mouseenter', () => startHoverScroll('left'));
    leftZone.addEventListener('mouseleave', stopHoverScroll);

    const rightZone = document.createElement('div');
    rightZone.style.cssText = `position:absolute;right:0;top:0;width:20%;height:100%;cursor:e-resize;z-index:10;`;
    rightZone.addEventListener('mouseenter', () => startHoverScroll('right'));
    rightZone.addEventListener('mouseleave', stopHoverScroll);

    section.style.position = 'relative';
    section.appendChild(leftZone);
    section.appendChild(rightZone);
  }

  // Kick off: initial delay, then regular interval
  setActive(0);
  setTimeout(() => {
    startAuto();
  }, AUTO_DELAY);
})();
