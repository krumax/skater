/**
 * Einfaches horizontales Scroll-Carousel mit CSS snap.
 * Kein GSAP-Pinning — funktioniert zuverlässig überall.
 */
(function () {
  const track = document.querySelector('.vc-track');
  const cards = Array.from(document.querySelectorAll('.vc-card'));
  const dots  = Array.from(document.querySelectorAll('.vc-dot'));

  if (!track || !cards.length) return;

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

  setActive(0);
})();
