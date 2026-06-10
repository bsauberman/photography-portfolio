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

  fetch('photos.json')
    .then(r => r.json())
    .then(data => {
      photos = data;

      const initialFilter = getCollectionFromPath();
      const btn = filtersContainer.querySelector(`[data-filter="${initialFilter}"]`);
      if (btn) { btn.click(); return; }

      galleryPhotos = sortByCollectionReverse(photos.filter(p => !p.hero));
      renderGallery(galleryPhotos);
      observeGallery();
    });

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
    return positioned.map(x => x.photo);
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
      toggleLabel.textContent = filter === 'all' ? 'All Collections' : activeBtn.textContent;
    }

    const menu = document.getElementById('filters-menu');
    const toggle = document.getElementById('filters-toggle');
    if (menu) menu.classList.remove('filters__menu--open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    const baseFiltered = photos.filter(p => !p.hero).filter(filterMap[filter] || filterMap.all);
    const filtered = filter === 'favorites' ? interleaveByCollection(baseFiltered) : sortByCollectionReverse(baseFiltered);
    galleryPhotos = filtered;
    renderGallery(filtered);
    observeGallery();
  });

  window.addEventListener('popstate', () => {
    const filter = getCollectionFromPath();
    const btn = filtersContainer.querySelector(`[data-filter="${filter}"]`);
    if (btn) btn.click();
  });

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
    'all': 'All',
    'favorites': 'Favorites',
    'highway-1': 'Highway 1, CA',
    'apple-park': 'Apple Park, CA',
    'orange-county': 'Orange County, CA',
    'south-boulder': 'South Boulder, CO',
    'nyc': 'New York, NY',
    'buena-vista': 'Buena Vista, CO',
    'green-mtn': 'Green Mountain, CO',
    'eldorado': 'Eldorado Canyon, CO',
    'mesa-trail': 'Mesa Trail, CO',
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
});
