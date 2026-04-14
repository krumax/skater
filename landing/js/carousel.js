/**
 * Horizontales Scroll-Carousel mit CSS snap.
 * Hover-Gesten: Links-Hover scrollt nach links, Rechts-Hover scrollt nach rechts.
 */
(function () {
  const track = document.querySelector('.vc-track');
  const cards = Array.from(document.querySelectorAll('.vc-card'));
  const dots  = Array.from(document.querySelectorAll('.vc-dot'));
  const section = document.querySelector('.vc-section');

  if (!track || !cards.length) return;

  let scrollInterval = null;
  const scrollSpeed = 8; // px pro Frame

  function setActive(idx) {
    dots.forEach((d, i) => d.classList.toggle('active', i === idx));
    cards.forEach((c, i) => c.classList.toggle('active', i === idx));
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

  // Dot-Klick scrollt zur Card
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    });
  });

  // Hover-Gesten: Links/Rechts-Bereich zum Scrollen
  function startScroll(direction) {
    if (scrollInterval) clearInterval(scrollInterval);
    scrollInterval = setInterval(() => {
      track.scrollLeft += direction === 'left' ? -scrollSpeed : scrollSpeed;
    }, 16); // ~60fps
  }

  function stopScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  }

  // Hover-Zonen: linke und rechte 20% der Section
  if (section) {
    const leftZone = document.createElement('div');
    leftZone.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: 20%;
      height: 100%;
      cursor: w-resize;
      z-index: 10;
    `;
    leftZone.addEventListener('mouseenter', () => startScroll('left'));
    leftZone.addEventListener('mouseleave', stopScroll);

    const rightZone = document.createElement('div');
    rightZone.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      width: 20%;
      height: 100%;
      cursor: e-resize;
      z-index: 10;
    `;
    rightZone.addEventListener('mouseenter', () => startScroll('right'));
    rightZone.addEventListener('mouseleave', stopScroll);

    section.style.position = 'relative';
    section.appendChild(leftZone);
    section.appendChild(rightZone);
  }

  setActive(0);
})();
