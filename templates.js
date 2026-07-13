// Body markup templates. Each function returns an HTML string built from SITE_CONFIG.
// Only pages that use <div id="app"></div> in their <body> get rendered by these.
// Legacy pages (with existing content) are left alone so this refactor is non-destructive.

const templates = (() => {
  const cfg = window.SITE_CONFIG;

  function nav() {
    return `
      <nav class="nav nav--hero">
        <a href="#" class="nav__name">Ben Sauberman</a>
        <ul class="nav__links">
          <li><a href="#work">Photography</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#map-section">Map</a></li>
          <li><a href="#notes">Notes</a></li>
        </ul>
        <button class="nav__hamburger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </nav>
      <div class="mobile-nav">
        <a href="#work">Photography</a>
        <a href="#about">About</a>
        <a href="#map-section">Map</a>
        <a href="#notes">Notes</a>
      </div>
    `;
  }

  function hero() {
    return `
      <section class="hero">
        <img class="hero__image" src="images/hero.webp" alt="Hero photo"
             onerror="this.outerHTML='<div class=\\'hero__placeholder\\'>Add hero.webp to /images</div>'" />
        <div class="hero__overlay"></div>
        <div class="hero__content">
          <h1 class="hero__title">Ben Sauberman</h1>
          <p class="hero__subtitle">Landscape &amp; Trail Photography</p>
        </div>
        <div class="hero__scroll">
          <span>Scroll</span>
          <div class="hero__scroll-line"></div>
        </div>
      </section>
    `;
  }

  function filterButton(id, label, active = false) {
    return `<button class="filters__btn${active ? ' filters__btn--active' : ''}" data-filter="${id}">${label}</button>`;
  }

  function work() {
    // Reversed so newest collections appear at top of dropdown
    const dated = [...cfg.collections].reverse();
    const staticBtns = cfg.staticFilters.map((f, i) =>
      filterButton(f.id, f.label, f.id === 'all')
    ).join('\n        ');
    const seriesBtns = cfg.series.map(s => filterButton(s.id, s.label)).join('\n        ');
    const datedBtns = dated.map(c =>
      filterButton(c.id, `${c.dateLabel} - ${c.placeLabel}`)
    ).join('\n        ');

    return `
      <section id="work" class="section">
        <p class="section__label">Selected Work</p>
        <div class="filters">
          <button class="filters__toggle" id="filters-toggle" aria-expanded="false">
            <span class="filters__current">All Collections</span>
            <span class="filters__chevron"></span>
          </button>
          <div class="filters__menu" id="filters-menu">
        ${staticBtns}
        ${seriesBtns}
        ${datedBtns}
          </div>
        </div>
        <div id="gallery" class="gallery"></div>
      </section>
    `;
  }

  function about() {
    return `
      <section id="about" class="section about">
        <p class="section__label">About</p>
        <div class="about__inner">
          <a class="about__photo-link" href="images/highway-1/DSCF9292-full.webp" target="_blank">
            <img class="about__photo" src="images/highway-1/DSCF9292-thumb.webp" alt="Ben Sauberman" loading="lazy" />
          </a>
          <div>
            <p class="about__text">
              Ben Sauberman is a software engineer and outdoor enthusiast based in Boulder, Colorado.
              He shoots on a Fujifilm X-E4 with a 27mm pancake lens; a compact setup to capture
              adventures on the trail and road.
            </p>
            <p class="about__gear">Fujifilm X-E4 · Fujinon XF 27mm F2.8 R WR</p>
            <p class="about__follow">Follow along on Instagram
              <a class="about__follow-link" href="https://instagram.com/${cfg.instagram}" target="_blank" rel="noopener">@${cfg.instagram}</a>
            </p>
          </div>
        </div>
      </section>
    `;
  }

  function mapSection() {
    return `
      <section id="map-section" class="section map-section">
        <p class="section__label">Map</p>
        <div id="map" class="map"></div>
      </section>
    `;
  }

  function notes() {
    return `
      <section id="notes" class="section notes">
        <p class="section__label">Notes</p>
        <form class="notes__form" id="notes-form">
          <input class="notes__input notes__input--name" type="text" placeholder="Your name" maxlength="50" />
          <textarea class="notes__input notes__input--message" placeholder="Leave a note..." maxlength="500" rows="3"></textarea>
          <button class="notes__submit" type="submit">Post</button>
        </form>
        <div class="notes__list" id="notes-list"></div>
      </section>
    `;
  }

  function footer() {
    return `
      <footer class="footer">
        <div class="footer__inner">
          <div class="footer__brand">
            <span class="footer__copy">&copy; 2026 Ben Sauberman</span>
            <span class="footer__tagline">Shot on Fujifilm X-E4</span>
          </div>
          <a class="footer__link" href="mailto:${cfg.email}">${cfg.email}</a>
          <a class="footer__link" href="https://instagram.com/${cfg.instagram}" target="_blank" rel="noopener">@${cfg.instagram}</a>
        </div>
      </footer>
    `;
  }

  function lightbox() {
    return `
      <div class="lightbox">
        <button class="lightbox__close">&times;</button>
        <button class="lightbox__nav lightbox__nav--prev">&lsaquo;</button>
        <div class="lightbox__content">
          <img class="lightbox__img" src="" alt="" />
          <div class="lightbox__info">
            <p class="lightbox__title"></p>
            <p class="lightbox__details"></p>
            <button class="lightbox__like" id="lightbox-like">
              <svg class="lightbox__like-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span class="lightbox__like-count" id="lightbox-like-count"></span>
            </button>
          </div>
        </div>
        <button class="lightbox__nav lightbox__nav--next">&rsaquo;</button>
      </div>
    `;
  }

  function renderInto(mountEl) {
    mountEl.outerHTML = [
      nav(),
      hero(),
      work(),
      about(),
      mapSection(),
      notes(),
      footer(),
      lightbox(),
    ].join('\n');
  }

  return { renderInto };
})();

// If this page opted into templated rendering, do it now — before script.js runs.
(function () {
  const mount = document.getElementById('app');
  if (mount) templates.renderInto(mount);
})();
