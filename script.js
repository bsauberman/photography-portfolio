import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, increment,
  collection, addDoc, query, orderBy, limit, onSnapshot
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

let db = null;
let firebaseReady = false;

try {
  if (typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY') {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getFirestore(app);
    firebaseReady = true;
  }
} catch (e) {
  // Firebase not configured — likes/notes will be local-only
}

function getLiked() {
  try { return JSON.parse(localStorage.getItem('liked') || '{}'); } catch { return {}; }
}

function setLiked(photoId) {
  const liked = getLiked();
  liked[photoId] = true;
  localStorage.setItem('liked', JSON.stringify(liked));
}

const likeCounts = {};

async function fetchLikeCount(photoId) {
  if (!firebaseReady) return likeCounts[photoId] || 0;
  try {
    const snap = await getDoc(doc(db, 'likes', photoId));
    const count = snap.exists() ? snap.data().count : 0;
    likeCounts[photoId] = count;
    return count;
  } catch {
    return likeCounts[photoId] || 0;
  }
}

async function toggleLike(photoId) {
  const liked = getLiked();
  if (liked[photoId]) return likeCounts[photoId] || 0;

  setLiked(photoId);
  likeCounts[photoId] = (likeCounts[photoId] || 0) + 1;

  if (firebaseReady) {
    const ref = doc(db, 'likes', photoId);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { count: increment(1) });
      } else {
        await setDoc(ref, { count: 1 });
      }
    } catch { /* fail silently */ }
  }

  return likeCounts[photoId];
}

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  const gallery = document.getElementById('gallery');
  const filtersContainer = document.querySelector('.filters');
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = document.querySelector('.lightbox__img');
  const lightboxTitle = document.querySelector('.lightbox__title');
  const lightboxDetails = document.querySelector('.lightbox__details');
  const lightboxLikeBtn = document.getElementById('lightbox-like');
  const lightboxLikeCount = document.getElementById('lightbox-like-count');
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const notesForm = document.getElementById('notes-form');
  const notesList = document.getElementById('notes-list');

  let photos = [];
  let galleryPhotos = [];
  let currentLightboxIndex = -1;

  const seriesMembers = {
    'series-water': [
      'op-1440', 'il-ice-lake', 'il-meadow', 'cb-glacial-lake', 'cb-left-twin',
      'op-1543', 'op-1476', 'op-1528', 'op-1494', 'il-island-lake',
      'il-island-overlook', 'bv-cottonwood'
    ],
    'series-wildlife': [
      'bv-goat-outcrop', 'bv-goats-pair', 'bv-goat-sky', 'bv-goat-trees',
      'bv-bighorns', 'oc-seagulls', 'oc-seagull', 'oc-sandpiper',
      'op-1537', 'sq-1688', 'cb-camp-1', 'cb-camp-2'
    ],
    'series-ascent': [
      'bv-summit-silhouette', 'bv-descending', 'oc-canyon', 'oc-switchbacks',
      'il-approach', 'mt-meadow-trail', 'mt-trail-rocks', 'sb-trailhead',
      'op-1246', 'sq-1666', 'fl-flatiron', 'fl-boulder-overlook'
    ],
  };

  const seriesInfo = {
    'series-water': {
      label: 'Where Water Sits Still',
      note: 'Alpine tarns, glacial lakes, and the pockets of stillness found above treeline.',
    },
    'series-wildlife': {
      label: 'The Ones Watching',
      note: 'Encounters where the camera wasn\'t the only thing paying attention.',
    },
    'series-ascent': {
      label: 'On the Way Up',
      note: 'The approach — trails, switchbacks, and the quiet miles before the view.',
    },
  };

  fetch('photos.json')
    .then(r => r.json())
    .then(data => {
      photos = data;
      rotateHero();
      initMap();

      const initialFilter = getCollectionFromPath();
      const btn = filtersContainer.querySelector(`[data-filter="${initialFilter}"]`);
      if (btn) { btn.click(); return; }

      galleryPhotos = clusterTallPairs(sortByCollectionReverse(photos.filter(p => !p.hero)));
      renderGallery(galleryPhotos);
      observeGallery();
    });

  function rotateHero() {
    const heroImg = document.querySelector('.hero__image');
    if (!heroImg) return;
    const pool = photos.filter(p => p.favorite && (p.size === 'full' || p.size === 'wide'));
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    heroImg.src = pick.fileFull || pick.file;
    heroImg.alt = pick.title || 'Hero photo';
  }

  function updateSeriesNote(filter) {
    const info = seriesInfo[filter];
    let note = document.getElementById('series-note');
    const workSection = document.getElementById('work');
    if (info) {
      if (!note) {
        note = document.createElement('div');
        note.id = 'series-note';
        note.className = 'series-note';
        const gallery = document.getElementById('gallery');
        gallery.parentNode.insertBefore(note, gallery);
      }
      note.innerHTML = `
        <p class="series-note__label">Series</p>
        <p class="series-note__title">${info.label}</p>
        <p class="series-note__body">${info.note}</p>
      `;
      note.style.display = 'block';
    } else if (note) {
      note.style.display = 'none';
    }
  }

  function groupDropdownByMonth(menu) {
    if (!menu) return;
    const monthName = (num) => ['January','February','March','April','May','June','July','August','September','October','November','December'][num - 1];
    // Match "Mmm DD" or "Mmm DD-DD" or "Mmm DD - Mmm DD" at start of label
    const monthMap = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    const buttons = Array.from(menu.querySelectorAll('.filters__btn'));
    const dated = [];
    const meta = [];
    buttons.forEach(b => {
      const m = b.textContent.trim().match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
      if (m) dated.push({ btn: b, month: monthMap[m[1]] });
      else meta.push(b);
    });
    let lastMonth = null;
    dated.forEach(({ btn, month }) => {
      if (month !== lastMonth) {
        const header = document.createElement('div');
        header.className = 'filters__month-header';
        header.textContent = monthName(month) + " '26";
        menu.insertBefore(header, btn);
        lastMonth = month;
      }
    });
  }
  // apply once nav dropdown clones exist too
  const initialMenu = document.getElementById('filters-menu');
  if (initialMenu) {
    // Inject series buttons above the dated collections (below Favorites/All)
    const firstDated = Array.from(initialMenu.querySelectorAll('.filters__btn'))
      .find(b => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/.test(b.textContent.trim()));
    const seriesHeader = document.createElement('div');
    seriesHeader.className = 'filters__month-header';
    seriesHeader.textContent = 'Series';
    if (firstDated) initialMenu.insertBefore(seriesHeader, firstDated);
    else initialMenu.appendChild(seriesHeader);
    Object.entries(seriesInfo).forEach(([id, info]) => {
      const btn = document.createElement('button');
      btn.className = 'filters__btn';
      btn.dataset.filter = id;
      btn.textContent = info.label;
      if (firstDated) initialMenu.insertBefore(btn, firstDated);
      else initialMenu.appendChild(btn);
    });
    groupDropdownByMonth(initialMenu);
  }

  // Dark mode toggle — injected into nav next to Notes, remembers preference
  (function initTheme() {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') document.body.classList.add('dark');

    const notesLink = document.querySelector('.nav a[href="#notes"]');
    if (!notesLink) return;
    const li = document.createElement('li');
    li.className = 'nav__theme-item';
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.setAttribute('aria-label', 'Toggle dark mode');
    toggle.innerHTML = `
      <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
      <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
      </svg>
    `;
    toggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
    li.appendChild(toggle);
    notesLink.parentElement.parentElement.appendChild(li);
  })();

  function renderGallery(items) {
    gallery.innerHTML = '';
    let i = 0;
    while (i < items.length) {
      const photo = items[i];
      const sizeClass = photo.size || 'medium';
      const nextPhoto = items[i + 1];
      const nextSize = nextPhoto ? (nextPhoto.size || 'medium') : '';

      // Pair consecutive portrait photos side by side
      if (sizeClass === 'tall' && nextSize === 'tall') {
        const pair = document.createElement('div');
        pair.className = 'gallery__pair';

        pair.appendChild(createGalleryItem(photo, i));
        pair.appendChild(createGalleryItem(nextPhoto, i + 1));
        gallery.appendChild(pair);
        i += 2;
      } else {
        gallery.appendChild(createGalleryItem(photo, i));
        i++;
      }
    }

    function createGalleryItem(photo, index) {
      const sizeClass = photo.size || 'medium';
      const item = document.createElement('div');
      item.className = `gallery__item gallery__item--${sizeClass}`;
      item.dataset.index = index;

      const liked = getLiked();
      const isLiked = liked[photo.id] ? ' gallery__like--liked' : '';

      item.innerHTML = `
        <img
          class="gallery__img"
          src="${photo.file}"
          alt="${photo.title}"
          loading="lazy"
          onerror="this.outerHTML='<div class=\\'gallery__placeholder\\'>${photo.title}</div>'"
        />
        <div class="gallery__meta">
          <div class="gallery__meta-top">
            <div>
              <div class="gallery__meta-location">${photo.location || ''}</div>
              <div class="gallery__meta-date">${photo.date || ''}</div>
            </div>
            <button class="gallery__like${isLiked}" data-photo-id="${photo.id}" aria-label="Like">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span class="gallery__like-count" data-count-id="${photo.id}"></span>
            </button>
          </div>
        </div>
      `;

      const likeBtn = item.querySelector('.gallery__like');
      likeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const count = await toggleLike(photo.id);
        likeBtn.classList.add('gallery__like--liked');
        item.querySelector(`[data-count-id="${photo.id}"]`).textContent = count || '';
      });

      fetchLikeCount(photo.id).then(count => {
        const el = item.querySelector(`[data-count-id="${photo.id}"]`);
        if (el) el.textContent = count || '';
      });

      item.addEventListener('click', () => openLightbox(index));
      return item;
    }
  }

  function observeGallery() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('gallery__item--visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.gallery__item').forEach(item => observer.observe(item));
  }

  // Filters
  const basePath = window.location.pathname.includes('/photography-portfolio')
    ? '/photography-portfolio' : '';

  function getCollectionFromPath() {
    const path = window.location.pathname
      .replace(basePath, '')
      .replace(/^\//, '')
      .replace(/\/$/, '');
    if (!path) return 'favorites';
    return filterMap[path] ? path : 'favorites';
  }

  let activeCollection = 'all';

  const filterMap = {
    'all': () => true,
    'shuffled': () => true,
    'favorites': p => p.favorite === true,
    'highway-1': p => p.collection === 'highway-1',
    'apple-park': p => p.collection === 'apple-park',
    'orange-county': p => p.collection === 'orange-county',
    'south-boulder': p => p.collection === 'south-boulder',
    'nyc': p => p.collection === 'nyc',
    'buena-vista': p => p.collection === 'buena-vista',
    'green-mtn': p => p.collection === 'green-mtn',
    'eldorado': p => p.collection === 'eldorado',
    'mesa-trail': p => p.collection === 'mesa-trail',
    'flatirons': p => p.collection === 'flatirons',
    'chicago-basin': p => p.collection === 'chicago-basin',
    'ice-lake': p => p.collection === 'ice-lake',
    'olympic-np': p => p.collection === 'olympic-np',
    'squamish': p => p.collection === 'squamish',
    'vancouver': p => p.collection === 'vancouver',
    'series-water': p => seriesMembers['series-water'].includes(p.id),
    'series-wildlife': p => seriesMembers['series-wildlife'].includes(p.id),
    'series-ascent': p => seriesMembers['series-ascent'].includes(p.id),
  };

  function sortByCollectionReverse(items) {
    const order = [];
    const seen = new Set();
    for (const p of items) {
      if (!seen.has(p.collection)) {
        seen.add(p.collection);
        order.push(p.collection);
      }
    }
    order.reverse();
    return order.flatMap(c => items.filter(p => p.collection === c));
  }

  let shuffleSeed = 0;

  function seededShuffle(items) {
    const arr = [...items];
    let s = shuffleSeed || 1;
    const rand = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Pull tall photos into pairs. If a tall is followed by a non-tall,
  // hunt ahead for the next tall and bring it adjacent (non-talls between
  // shift to just after the pair). Preserves order otherwise.
  function clusterTallPairs(items) {
    const result = [];
    const remaining = [...items];
    while (remaining.length > 0) {
      const photo = remaining.shift();
      result.push(photo);
      if ((photo.size || 'medium') === 'tall') {
        const nextTallIdx = remaining.findIndex(p => (p.size || 'medium') === 'tall');
        if (nextTallIdx !== -1) {
          result.push(remaining.splice(nextTallIdx, 1)[0]);
        }
      }
    }
    return result;
  }

  function interleaveByCollection(items) {
    const groups = {};
    for (const p of items) {
      if (!groups[p.collection]) groups[p.collection] = [];
      groups[p.collection].push(p);
    }
    const total = items.length;
    const positioned = [];
    Object.keys(groups).forEach((col, colIdx) => {
      groups[col].forEach((p, idx) => {
        const pos = (idx + 0.5) * (total / groups[col].length) + (colIdx * 0.01);
        positioned.push({ photo: p, pos });
      });
    });
    positioned.sort((a, b) => a.pos - b.pos);
    let result = positioned.map(x => x.photo);

    // Honor explicit pairWith: move the target right after the requesting photo
    for (const item of [...result]) {
      if (!item.pairWith) continue;
      const itemIdx = result.findIndex(p => p.id === item.id);
      const targetIdx = result.findIndex(p => p.id === item.pairWith);
      if (targetIdx === -1 || itemIdx === -1) continue;
      if (Math.abs(targetIdx - itemIdx) === 1) continue;
      const target = result.splice(targetIdx, 1)[0];
      const newItemIdx = result.findIndex(p => p.id === item.id);
      result.splice(newItemIdx + 1, 0, target);
    }

    return result;
  }

  filtersContainer.addEventListener('click', (e) => {
    if (!e.target.matches('.filters__btn')) return;
    const filter = e.target.dataset.filter;
    activeCollection = filter;

    const path = filter === 'all' ? basePath + '/all'
               : filter === 'favorites' ? basePath + '/'
               : basePath + '/' + filter;
    history.pushState(null, '', path);

    filtersContainer.querySelectorAll('.filters__btn').forEach(btn => {
      btn.classList.toggle('filters__btn--active', btn.dataset.filter === filter);
    });

    const toggleLabel = filtersContainer.querySelector('.filters__current');
    const activeBtn = filtersContainer.querySelector(`.filters__btn[data-filter="${filter}"]`);
    if (toggleLabel && activeBtn) {
      toggleLabel.textContent = activeBtn.textContent;
    }

    const menu = document.getElementById('filters-menu');
    const toggle = document.getElementById('filters-toggle');
    if (menu) menu.classList.remove('filters__menu--open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    const baseFiltered = photos.filter(p => !p.hero).filter(filterMap[filter] || filterMap.all);
    let filtered;
    if (filter === 'favorites') {
      filtered = interleaveByCollection(baseFiltered);
    } else if (filter === 'shuffled') {
      if (!shuffleSeed) shuffleSeed = Math.floor(Date.now() % 1000000);
      filtered = seededShuffle(baseFiltered);
    } else {
      filtered = sortByCollectionReverse(baseFiltered);
    }
    filtered = clusterTallPairs(filtered);
    galleryPhotos = filtered;
    renderGallery(filtered);
    observeGallery();
    updateSeriesNote(filter);
  });

  window.addEventListener('popstate', () => {
    const filter = getCollectionFromPath();
    const btn = filtersContainer.querySelector(`[data-filter="${filter}"]`);
    if (btn) btn.click();
  });

  // Intercept in-page anchor nav so <base href="../"> doesn't break them
  document.querySelectorAll('.nav a[href^="#"], .mobile-nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').slice(1);
      const target = targetId ? document.getElementById(targetId) : null;
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Photography (desktop nav) → dropdown of collections right below the link
  const photoLink = document.querySelector('.nav a[href="#work"]');
  if (photoLink) {
    const navItem = photoLink.parentElement;
    navItem.classList.add('nav__item--dropdown');

    const navDropdown = document.createElement('div');
    navDropdown.className = 'nav__dropdown';
    filtersContainer.querySelectorAll('.filters__btn').forEach(btn => {
      const clone = btn.cloneNode(true);
      clone.classList.remove('filters__btn--active');
      clone.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.click();
        navDropdown.classList.remove('nav__dropdown--open');
        photoLink.setAttribute('aria-expanded', 'false');
        document.getElementById('work').scrollIntoView({ behavior: 'smooth' });
      });
      navDropdown.appendChild(clone);
    });
    navItem.appendChild(navDropdown);
    groupDropdownByMonth(navDropdown);

    photoLink.setAttribute('aria-expanded', 'false');
    // Replace the anchor's own click behavior with the dropdown toggle
    photoLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = navDropdown.classList.toggle('nav__dropdown--open');
      photoLink.setAttribute('aria-expanded', String(isOpen));
    }, true);

    document.addEventListener('click', (e) => {
      if (!navItem.contains(e.target)) {
        navDropdown.classList.remove('nav__dropdown--open');
        photoLink.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Filters dropdown toggle
  const filtersToggle = document.getElementById('filters-toggle');
  const filtersMenu = document.getElementById('filters-menu');
  if (filtersToggle && filtersMenu) {
    filtersToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = filtersMenu.classList.toggle('filters__menu--open');
      filtersToggle.setAttribute('aria-expanded', isOpen);
    });
    document.addEventListener('click', (e) => {
      if (!filtersContainer.contains(e.target)) {
        filtersMenu.classList.remove('filters__menu--open');
        filtersToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Nav scroll
  function updateNav() {
    const heroBottom = hero.getBoundingClientRect().bottom;
    const pastHero = heroBottom <= 0;
    nav.classList.toggle('nav--hero', !pastHero);
    nav.classList.toggle('nav--scrolled', pastHero);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // Lightbox
  function openLightbox(index) {
    currentLightboxIndex = index;
    const photo = galleryPhotos[index];
    if (!photo) return;

    lightboxImg.src = photo.fileFull || photo.file;
    lightboxImg.alt = photo.title;
    lightboxTitle.textContent = photo.title;

    const details = [photo.location, photo.date, photo.camera]
      .filter(Boolean).join('  ·  ');
    lightboxDetails.textContent = details;

    const liked = getLiked();
    lightboxLikeBtn.classList.toggle('lightbox__like--liked', !!liked[photo.id]);
    lightboxLikeBtn.dataset.photoId = photo.id;

    fetchLikeCount(photo.id).then(count => {
      lightboxLikeCount.textContent = count || '';
    });

    lightbox.classList.add('lightbox--open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('lightbox--open');
    document.body.style.overflow = '';
    currentLightboxIndex = -1;
  }

  function navigateLightbox(dir) {
    const newIndex = currentLightboxIndex + dir;
    if (newIndex < 0 || newIndex >= galleryPhotos.length) return;
    openLightbox(newIndex);
  }

  lightboxLikeBtn.addEventListener('click', async () => {
    const photoId = lightboxLikeBtn.dataset.photoId;
    const count = await toggleLike(photoId);
    lightboxLikeBtn.classList.add('lightbox__like--liked');
    lightboxLikeCount.textContent = count || '';

    const galleryCountEl = document.querySelector(`[data-count-id="${photoId}"]`);
    if (galleryCountEl) galleryCountEl.textContent = count || '';
    const galleryLikeBtn = document.querySelector(`.gallery__like[data-photo-id="${photoId}"]`);
    if (galleryLikeBtn) galleryLikeBtn.classList.add('gallery__like--liked');
  });

  document.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
  document.querySelector('.lightbox__nav--prev').addEventListener('click', () => navigateLightbox(-1));
  document.querySelector('.lightbox__nav--next').addEventListener('click', () => navigateLightbox(1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('lightbox--open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // Mobile nav
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('mobile-nav--open');
  });
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileNav.classList.remove('mobile-nav--open'));
  });

  // ─── Notes / Guestbook ───

  const collectionDisplayNames = {
    'all': 'All (Ordered)',
    'shuffled': 'All (Shuffled)',
    'favorites': 'Favorites',
    'highway-1': 'Highway 1, CA',
    'apple-park': 'Apple Park - Cupertino, CA',
    'orange-county': 'Orange County, CA',
    'south-boulder': 'South Boulder - Boulder, CO',
    'nyc': 'New York, NY',
    'buena-vista': 'Buena Vista, CO',
    'green-mtn': 'Green Mountain - Boulder, CO',
    'eldorado': 'Eldorado Canyon - Eldorado Springs, CO',
    'mesa-trail': 'Mesa Trail - Boulder, CO',
    'flatirons': 'Flatirons - Boulder, CO',
    'chicago-basin': 'Chicago Basin - Silverton, CO',
    'ice-lake': 'Ice & Island Lakes - Silverton, CO',
    'olympic-np': 'Seven Lakes Basin - Olympic NP, WA',
    'squamish': 'Squamish, BC',
    'vancouver': 'Vancouver, BC',
    'series-water': 'Where Water Sits Still',
    'series-wildlife': 'The Ones Watching',
    'series-ascent': 'On the Way Up',
  };

  function renderNote(data) {
    const note = document.createElement('div');
    note.className = 'notes__item';

    const date = data.timestamp
      ? new Date(data.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    const noteCol = data.collection || 'highway-1';
    const colLabel = collectionDisplayNames[noteCol] || noteCol;

    const nameHtml = data.name
      ? `<span class="notes__author">${escapeHtml(data.name)}</span>`
      : `<span class="notes__author notes__author--anon">Anonymous</span>`;

    note.innerHTML = `
      <div class="notes__item-header">
        <span class="notes__byline">
          ${nameHtml}
          <span class="notes__sep">|</span>
          <button class="notes__collection-link" data-filter="${noteCol}">${colLabel}</button>
        </span>
        <span class="notes__date">${date}</span>
      </div>
      <p class="notes__message">${escapeHtml(data.message)}</p>
    `;
    return note;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Click on a collection link in a note → switch filter and scroll to gallery
  notesList.addEventListener('click', (e) => {
    if (!e.target.matches('.notes__collection-link')) return;
    const filter = e.target.dataset.filter;
    const btn = filtersContainer.querySelector(`[data-filter="${filter}"]`);
    if (btn) {
      btn.click();
      document.getElementById('work').scrollIntoView({ behavior: 'smooth' });
    }
  });

  let notesUnsubscribe = null;

  function loadNotes() {
    if (notesUnsubscribe) notesUnsubscribe();

    if (firebaseReady) {
      const q = query(collection(db, 'notes'), orderBy('timestamp', 'desc'), limit(50));
      notesUnsubscribe = onSnapshot(q, (snapshot) => {
        notesList.innerHTML = '';
        if (snapshot.empty) {
          notesList.innerHTML = '<p class="notes__empty">No notes yet. Be the first.</p>';
          return;
        }
        snapshot.forEach(doc => notesList.appendChild(renderNote(doc.data())));
      });
    } else {
      const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
      notesList.innerHTML = '';
      if (localNotes.length === 0) {
        notesList.innerHTML = '<p class="notes__empty">No notes yet. Be the first.</p>';
      } else {
        localNotes.forEach(n => notesList.appendChild(renderNote(n)));
      }
    }
  }

  loadNotes();

  notesForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = notesForm.querySelector('.notes__input--name');
    const messageInput = notesForm.querySelector('.notes__input--message');
    const message = messageInput.value.trim();
    if (!message) return;

    const noteData = {
      name: nameInput.value.trim() || '',
      message,
      timestamp: Date.now(),
      collection: activeCollection
    };

    const submitBtn = notesForm.querySelector('.notes__submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '...';

    if (firebaseReady) {
      try {
        await addDoc(collection(db, 'notes'), noteData);
      } catch { /* fail silently */ }
    } else {
      const localNotes = JSON.parse(localStorage.getItem('notes') || '[]');
      localNotes.unshift(noteData);
      localStorage.setItem('notes', JSON.stringify(localNotes));
      notesList.innerHTML = '';
      localNotes.forEach(n => notesList.appendChild(renderNote(n)));
    }

    nameInput.value = '';
    messageInput.value = '';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Post';
  });

  // ─── Map ───

  // lat, lng, label, category (for pin color), collections it groups
  const mapLocations = [
    { lat: 40.0150, lng: -105.2705, label: 'Boulder, CO', cat: 'boulder',
      collections: ['flatirons', 'mesa-trail', 'green-mtn', 'eldorado', 'south-boulder'] },
    { lat: 38.8425, lng: -106.1311, label: 'Buena Vista, CO', cat: 'mountain',
      collections: ['buena-vista'] },
    { lat: 37.8094, lng: -107.7723, label: 'Silverton, CO', cat: 'mountain',
      collections: ['ice-lake', 'chicago-basin'] },
    { lat: 47.9683, lng: -123.4983, label: 'Olympic NP, WA', cat: 'pnw',
      collections: ['olympic-np'] },
    { lat: 49.7016, lng: -123.1558, label: 'Squamish, BC', cat: 'pnw',
      collections: ['squamish'] },
    { lat: 49.2827, lng: -123.1207, label: 'Vancouver, BC', cat: 'urban',
      collections: ['vancouver'] },
    { lat: 37.1820, lng: -122.3933, label: 'Highway 1, CA', cat: 'coast',
      collections: ['highway-1'] },
    { lat: 37.3349, lng: -122.0090, label: 'Cupertino, CA', cat: 'urban',
      collections: ['apple-park'] },
    { lat: 33.4734, lng: -117.7136, label: 'Orange County, CA', cat: 'coast',
      collections: ['orange-county'] },
    { lat: 40.7549, lng: -73.9840, label: 'New York, NY', cat: 'urban',
      collections: ['nyc'] },
  ];

  const collectionLabels = {
    'highway-1': "May 13 '26 — Highway 1, CA",
    'apple-park': "May 14 '26 — Apple Park",
    'orange-county': "May 16 '26 — Orange County, CA",
    'south-boulder': "May 18 '26 — South Boulder",
    'nyc': "May 22 '26 — New York, NY",
    'buena-vista': "May 29-30 '26 — Buena Vista",
    'green-mtn': "Jun 4 '26 — Green Mountain",
    'eldorado': "Jun 7 '26 — Eldorado Canyon",
    'mesa-trail': "Jun 10 '26 — Mesa Trail",
    'flatirons': "Jun 14 '26 — Flatirons",
    'chicago-basin': "Jun 19-20 '26 — Chicago Basin",
    'ice-lake': "Jun 22 '26 — Ice & Island Lakes",
    'olympic-np': "Jun 28-30 '26 — Seven Lakes Basin",
    'squamish': "Jul 1-4 '26 — Squamish, BC",
    'vancouver': "Jul 5 '26 — Vancouver, BC",
  };

  function navigateToCollection(filter) {
    const btn = filtersContainer.querySelector(`[data-filter="${filter}"]`);
    if (btn) {
      btn.click();
      document.getElementById('work').scrollIntoView({ behavior: 'smooth' });
    }
  }

  function getCollectionPreview(collection) {
    const p = photos.find(ph => ph.collection === collection && !ph.hero);
    return p ? p.file : null;
  }

  function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map(mapEl, {
      center: [40, -105],
      zoom: 3,
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds(mapLocations.map(l => [l.lat, l.lng]));

    mapLocations.forEach(loc => {
      const icon = L.divIcon({
        className: '',
        html: `<div class="map__pin map__pin--${loc.cat}"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([loc.lat, loc.lng], { icon }).addTo(map);

      const collections = loc.collections;

      if (collections.length === 1) {
        const collection = collections[0];
        const preview = getCollectionPreview(collection);
        const popupHtml = `
          <div class="map-popup">
            <div class="map-popup__title">${loc.label}</div>
            ${preview ? `<img class="map-popup__img" src="${preview}" alt="" />` : ''}
            <button class="map-popup__item" data-collection="${collection}">${collectionLabels[collection] || collection}</button>
          </div>
        `;
        marker.bindPopup(popupHtml, { closeButton: true, minWidth: 200 });
      } else {
        const items = collections
          .map(c => `<button class="map-popup__item" data-collection="${c}">${collectionLabels[c] || c}</button>`)
          .join('');
        marker.bindPopup(`
          <div class="map-popup">
            <div class="map-popup__title">${loc.label}</div>
            <div class="map-popup__list">${items}</div>
          </div>
        `, { closeButton: true, minWidth: 220 });
      }
    });

    map.on('popupopen', (e) => {
      const popupEl = e.popup.getElement();
      popupEl.querySelectorAll('.map-popup__item').forEach(btn => {
        btn.addEventListener('click', () => {
          const collection = btn.dataset.collection;
          map.closePopup();
          navigateToCollection(collection);
        });
      });
    });

    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 5 });
  }
});
