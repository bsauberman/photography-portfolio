# Photography Portfolio — CLAUDE.md

Personal photography portfolio for Ben Sauberman, live at **bensauberman.com**.
Static site, no build step, deployed by GitHub Pages from `main`.

- Remote: `git@github.com:bsauberman/photography-portfolio.git`
- Local: `/Users/bensauberman/src/photography-portfolio`
- Custom domain via Namecheap; `CNAME` is committed at the repo root.
- All photos shot on a **Fujifilm X-E4 + Fujinon XF 27mm f/2.8** pancake.

---

## Working agreements (read first)

These are standing instructions from Ben. They override default behaviour.

1. **Never add a photo to favorites unless he explicitly asks.** Verbatim: *"never add
   somehing to favorites unless i explicitly ask for it."* Favoriting also decides what
   can appear as a hero, so it is never a safe "while I'm here" addition.
2. **Don't suggest pushing.** He batches commits and says "push" himself. Commit freely;
   wait to be told before `git push`.
3. **Test instructions are exactly two lines: the command, then the URL.** No checklists,
   no "verify that…", no validation scripts for him to run. Run those yourself and report
   the result in one line. Verbatim: *"for how to test i just wanted the command to start
   the script then the url to paste to see. not all this other crap."*
   Use the **absolute path** — he pastes it into whatever terminal is open:
   ```
   /Users/bensauberman/src/photography-portfolio/serve.sh
   ```
   http://localhost:8000
4. **Lead with TLDR bullets, then a tightened body.** Roughly 30% more concise than default.
5. **Prose he'll paste elsewhere gets plain text**, no markdown formatting.

---

## Design direction

### Aesthetic: editorial minimalism
Should feel like a high-end photography magazine — clean, elegant, confident. The photos
are the star; everything else recedes. Gallery exhibitions and print editorials, not
template websites.

### Principles
- **Photos are freeform, not grid-locked.** Varied sizes, mixed aspect ratios, asymmetric
  placement. Curated by hand, not auto-generated.
- **Generous negative space.** Whitespace is a design element.
- **Typography minimal but refined.** Display serif for headings, clean sans for body. Two
  fonts, thin weights, wide tracking on small labels.
- **Monochrome UI, colour only in photos.** Site chrome is black, white, grey.
- **Full-bleed hero**, name overlaid, scroll to enter.
- **Subtle motion.** Gentle fades. No parallax, no aggressive animation.

### Avoid
- Rigid grids with uniform card sizes
- Drop shadows, gradients, rounded cards
- Generic template aesthetics (Bootstrap/Squarespace)
- Fonts: Inter, Roboto, Arial, system-ui
- Purple/blue-purple schemes

### Two deliberate, approved exceptions
Both were discussed with Ben and chosen knowingly. Don't "fix" them back:
- **The collections panel is a uniform grid of cover tiles.** The no-rigid-grids rule
  protects the *gallery*, where the photos are the work. An index is chrome, and
  uniformity there is what makes 34 collections scannable.
- **That panel has a drop shadow.** Ben asked for separation directly. An overlay is the
  one place a shadow does real work rather than decoration.

---

## Architecture

Config-driven, no framework, no bundler, no npm dependencies.

```
site-config.js   → window.SITE_CONFIG   (collections, filters, contact)
templates.js     → builds all shared markup, replaces <div id="app">
script.js        → ES module; all behaviour. Fetches photos.json.
photos.json      → every photo + metadata
style.css        → single stylesheet, CSS custom properties for theming
firebase-config.js → Firestore keys for likes + guestbook notes
```

**Load order matters** and is identical in all 36 route files:
```html
<script src="site-config.js"></script>   <!-- classic: defines window.SITE_CONFIG -->
<script src="templates.js"></script>     <!-- classic: runs immediately, replaces #app -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="firebase-config.js"></script>
<script type="module" src="script.js"></script>  <!-- deferred by nature -->
```
`templates.js` ends with an IIFE that finds `#app` and calls `renderInto`, so the DOM
exists before the module runs.

### Routes
36 directories, each a 26-line shell whose only job is its own `<head>`:
34 collections + `/all` + `/favorites`. Plus `index.html` at the root.

Every route file is identical except `<title>`, the `<meta>`/OG block, and — for
subdirectories — `<base href="../" />`, which makes all relative paths resolve from the
repo root. `shuffled` is a filter but has **no route directory**.

**A collection's route directory name must equal its `id` in site-config.js.**
`getCollectionFromPath()` reads the path to pick the initial filter.

Because `work()` is part of `renderInto`, **the hero, nav, gallery, map, about, notes and
footer are on every route** — a collection page is the same page with a filter pre-applied.

---

## Data model

### `photos.json` — 285 entries, 46 favorites, 45 with `fileXl`

Canonical key order (keep it; edits are done by string manipulation):
```
id, file, fileFull, fileXl, collection, title, location, date,
camera, filmSimulation, size, favorite
```

```json
{
  "id": "wl-spires",
  "file": "images/willow-lakes/DSCF3608-thumb.webp",
  "fileFull": "images/willow-lakes/DSCF3608-full.webp",
  "collection": "willow-lakes",
  "title": "Spires Above the Upper Lake",
  "location": "Willow Lakes - Eagles Nest Wilderness, CO",
  "date": "Sep 19 2026",
  "camera": "f/6.4, 1/1250s, ISO 640",
  "filmSimulation": "Classic Negative",
  "size": "tall",
  "favorite": true
}
```

| field | notes |
|---|---|
| `id` | Unique. Convention is a short collection prefix + subject (`wl-spires`, `ch-lake`). Prefixes in use: `ap bl bo bp bv cb ch cl cr cw cz el em fl gm h1 il is jp lj mc ml mt ny obj oc op pi sa sb sk sl sp sq t401 tmc vn wl` |
| `file` / `fileFull` / `fileXl` | Explicit paths. **Not derived** from the collection id — see the image-directory mismatch table below. `fileXl` only on landscape frames. |
| `size` | `tall` (239), `wide` (31), `full` (12), `medium` (2). `wide`/`medium`/`full` are **functionally identical** in CSS — all are `max-width: 100%` with `aspect-ratio: 4416/2944`. Only `tall` differs (`2944/4416`, capped at 560px, pairs up). |
| `favorite` | Drives `/favorites` **and** hero eligibility. |
| `filmSimulation` | 147 set, 138 missing. See the Fujifilm MakerNote section. |
| `pairWith` | Rare (2 uses). Forces a specific photo to follow this one in the Favorites ordering. |
| `hero` | **One vestigial entry**, `id: "hero"`, pointing at `images/hero.webp`. It is excluded everywhere via `photos.filter(p => !p.hero)` and is *not* in the hero rotation. Don't build on it; don't delete `images/hero.webp` though — see below. |

The `hero` entry has no `size` key, so **always use `p.size` defensively** or filter
`!p.hero` first.

### `site-config.js` — 34 collections

Listed **oldest first**. Order is load-bearing: `interleaveByCollection` derives recency
from array index, and `collectionGrid()` reverses it so the newest month is at the top of
the panel.

```js
{ id: 'willow-lakes', dateLabel: "Sep 19 '26",
  placeLabel:  "Willow Lakes - Eagles Nest Wilderness, CO",  // dropdown / toggle sub-line
  displayName: "Willow Lakes - Eagles Nest Wilderness, CO",  // byline on guestbook notes
  coords: [39.6539, -106.1506],                              // map pin
  shortLabel: "Willow Lakes",                                // tile caption + toggle headline
  cover: 'images/willow-lakes/DSCF3608-cover.webp',           // 400x600 panel tile
  cat: 'mountain' },                                          // pin colour
```

`cat` values: `coast`, `urban`, `boulder`, `mountain`, `pnw`.

**`shortLabel` exists because `placeLabel` averages 30 characters and maxes at 48**
("South Arapaho Peak - Indian Peaks Wilderness, CO"). That reads fine in a wide text list
and terribly in a 152px grid cell or a headline. Any new collection needs both.

Also in the file: `staticFilters` (favorites / all / shuffled), `series: []` with three
archived definitions under `_seriesDisabled`, `email`, `instagram`.

### Collection id ≠ image directory
Nine collections have historical directory names. **Always read paths from the data, never
construct them:**

| id | images/ directory |
|---|---|
| `apple-park` | `apple_park_photos` |
| `south-boulder` | `south-boulder-trails` |
| `eldorado` | `eldorado-state-park` |
| `ice-lake` | `ice-lake-basin` |
| `ljubljana-skofja-loka` | `ljubljana_and_skofja_loka` |
| `lake-bohinj` | `lake_bohinj` |
| `seven-lakes-valley` | `seven_lakes_valley_triglav_np` |
| `skocjan-postojna` | `skojcan_postojna` (note the typo — it's the real name) |
| `lake-bled` | `bled` |

---

## Image pipeline

**`exiftool` is NOT installed. `sips`, `cwebp` (brew `webp`) and Python `Pillow` are.**
`sips` can read `.webp` as input, which is how covers are derived from existing files.

### Four derivative tiers
| tier | long edge | quality | applies to |
|---|---|---|---|
| `-thumb.webp` | 1600 | `cwebp -q 85` | every photo |
| `-full.webp` | 2400 | `cwebp -q 85` | every photo |
| `-xl.webp` | 3200 | `cwebp -q 85` | landscape only (`wide`/`full`) — hero + lightbox |
| `-cover.webp` | 400×600 | `cwebp -q 80` | one per collection, for panel tiles |

### EXIF orientation — the trap
Camera originals carry orientation tag `0x0112`. `sips -Z` does **not** apply it.
- `8` → `sips -r 270`
- `6` → `sips -r 90`
- `1` → no rotation

`sips -r` rotates pixels but leaves the EXIF tag set. `cwebp` strips EXIF, so the shipped
webp is correct — but **an intermediate JPEG preview renders sideways**. Emit intermediates
as PNG.

### Generating derivatives (thumb / full / xl)
```bash
T=$(mktemp -d)
src="images/willow-lakes/DSCF3591.JPG"; stem="DSCF3591"; orient=1; landscape=1
sips -s format png "$src" --out "$T/$stem.png"
[ "$orient" = "8" ] && sips -r 270 "$T/$stem.png"
[ "$orient" = "6" ] && sips -r 90  "$T/$stem.png"
for tier in thumb:1600 full:2400 xl:3200; do
  name="${tier%%:*}"; px="${tier##*:}"
  [ "$name" = "xl" ] && [ "$landscape" != "1" ] && continue
  cp "$T/$stem.png" "$T/$stem-$name.png"
  sips -Z "$px" "$T/$stem-$name.png"
  cwebp -q 85 "$T/$stem-$name.png" -o "images/willow-lakes/$stem-$name.webp"
done
```

### Generating a cover (2:3 centre crop from an existing `-full.webp`)
```bash
png="$T/cover.png"
sips -s format png "images/willow-lakes/DSCF3608-full.webp" --out "$png"
w=$(sips -g pixelWidth  "$png" | awk '/pixelWidth/{print $2}')
h=$(sips -g pixelHeight "$png" | awk '/pixelHeight/{print $2}')
cw=$w; ch=$(( w * 3 / 2 ))
if [ "$ch" -gt "$h" ]; then ch=$h; cw=$(( h * 2 / 3 )); fi
sips -c "$ch" "$cw" "$png"      # centred crop, HEIGHT then WIDTH
sips -z 600 400 "$png"
cwebp -q 80 "$png" -o "images/willow-lakes/DSCF3608-cover.webp"
```
**Pick a `tall` photo as a cover.** Cropping a landscape to 2:3 throws away most of its
width. All 34 current covers come from tall frames.

### Reading EXIF + the Fujifilm MakerNote
`filmSimulation` used to be guessed. It is now readable. The MakerNote layout: `b"FUJIFILM"`
(8 bytes), then a uint32 LE offset to a standard TIFF IFD — but **every value offset inside
is relative to the MakerNote start, not the TIFF header**, which is why generic EXIF
walkers miss it. Tag `0x1401` = FilmMode, `0x1003` = Saturation (encodes B&W/Acros, and
overrides FilmMode when monochrome, since FilmMode stays 0).

`0x800` = Classic Negative, which is what Ben shoots almost exclusively.

A working parser was written to `/tmp/fujifilm.py` (scratch — recreate if gone). It prints
dimensions, orientation, timestamp, aperture, shutter, ISO, focal length and film sim.

**Photos that have been cropped or re-exported lose the MakerNote.** Those read `None`; the
convention is to inherit the film sim from the rest of that day's batch and say so.

### Outstanding: 138 of 285 entries have no `filmSimulation`
Deferred, not cancelled — Ben said *"push first then we can do this."* The plan: validate
the parser against entries that already record a value, then backfill and correct.
Originals still exist locally for most collections.

---

## Key behaviours in `script.js` (945 lines, all inside one IIFE)

### Hero rotation — `startHero()`, line ~120
Pool is `photos.filter(p => p.favorite && (p.size === 'full' || p.size === 'wide'))` —
currently **9 photos**, all of which have `fileXl`. Landscape favorites are exactly the set
that carries an xl derivative, which is what a full-viewport image wants.

- Two stacked `.hero__image` layers, **neither with a `src`** in the markup. Shipping a
  placeholder meant every visitor downloaded a 1MB image that was discarded the moment
  `photos.json` resolved. `.hero`'s `#2a2a2a` background covers the gap.
- 60s hold (`HERO_HOLD_MS`), 3s crossfade (`--hero-fade`). **Keep those two in sync.**
- `.hero--intro` overrides the fade to 0.8s so the *first* photo doesn't take three
  seconds; `startHero()` removes the class after the first paint.
- Walks a **shuffled queue**, so every photo shows once per cycle and none repeats
  back-to-back across a reshuffle boundary.
- Self-scheduling `setTimeout`, not `setInterval`, so slow loads can't stack.
- Waits on `img.decode()` (with a `load`/`error` fallback) before fading, or the crossfade
  reveals a blank layer.
- `prefers-reduced-motion: reduce` → shows one photo, schedules nothing. Checked in **both**
  JS and CSS.
- Empty pool → returns before removing `hero--intro`. Harmless (nothing fades, title sits
  on the grey background) but it's the one asymmetric edge case.

### Collections panel — the main navigation
Markup comes from `templates.js`; behaviour is shared with the nav dropdown.

- `.filters__toggle` is the trigger: body font at `clamp(1.55rem, 3.2vw, 2.05rem)`, showing
  `data-short` as a headline plus `data-sub` (date · full place) underneath.
- `.filters__menu.filters__panel` is the tray: 700px wide, **4 columns**, month-grouped,
  newest first. Tiles are 2:3 covers at ~152×228.
- `.filters__modes` holds Favorites / All (Ordered) / All (Shuffled) at the top.
- **The nav "Photography" dropdown clones the panel's children** so the two can't drift.
  Children, not the element — that carries `id="filters-menu"`. Clicks delegate back to the
  original buttons, so filtering has one implementation.

Four things that will break if you're not careful:
1. **Use `e.target.closest('.filters__btn')`, never `.matches()`.** A tile click lands on
   its `<img>` or a caption `<span>`.
2. **The toggle reads `data-short`/`data-sub`, not `textContent`** — a tile's textContent
   concatenates to "Willow Lakes Sep 19 '26".
3. **Panel colours must be scoped to `.filters__panel`.** `.filters__btn` is shared, and
   unscoped light-on-dark text would wreck anything on a light background.
4. **Active state syncs via `document.querySelectorAll('.filters__btn')`**, because the nav
   copy lives outside `filtersContainer`.

### Gallery ordering
Three functions, applied in combination depending on the filter:
- `sortByCollectionReverse` — newest collection first. Used for `all` and single collections.
- `interleaveByCollection` — used for `/favorites`. Spreads adjacent photos across different
  collections while biasing recent work upward. `RECENCY_BIAS = 0.4` (0 = pure even spread,
  1 = strict newest-first). `FAVORITES_LEAD = ['il-meadow', 'h1-iceplant']` pins the first two.
- `seededShuffle` — used for `shuffled`; seeded so the order is stable within a session.
- `clusterTallPairs` — runs **last**, always. Finds each `tall` photo and pulls the next
  `tall` up beside it so portraits render two-across instead of leaving gaps.

### Theme
`body.dark` + `localStorage.theme`. Two toggle buttons, built from one factory in
`initTheme()`: one in `.nav__links` (hidden under 600px) and one in `.mobile-nav`. Which
icon shows is driven by `body.dark` in CSS, so copies can't desync. The mobile one is a
`<button>` and the overlay's dismiss handler binds only to `a`, so tapping it leaves the
menu open.

### Firebase (likes + guestbook)
Firestore, imported from gstatic CDN as an ES module. Collections: `likes/{photoId}` and
`notes`. Degrades silently — `firebaseReady` guards every call, and likes fall back to an
in-memory count. `firebase-config.js` holds public web API keys (fine to commit; access is
controlled by Firestore rules).

### Map
Leaflet from unpkg CDN. One pin per collection from `coords`, coloured by `cat`. Dark mode
inverts the tiles with a CSS `filter`.

---

## CSS

Single 1566-line stylesheet. Theming is entirely CSS custom properties on `:root` and
`body.dark`.

**Two independent colour systems** — this is the most important thing to understand:

```
--color-bg / --color-text / --color-text-light / --color-border / --color-hover-bg
    The page. Flips light↔dark with the theme.

--color-panel-bg / -border / -text / -text-dim / -hover / -band / -shadow
    The collections tray. INVERTED relative to the page: dark tray on the light
    theme (#1c1c1c), light tray on the dark theme (#f2f2f2). All seven flip.
```

The panel needs its own variables precisely because `--color-text` moves *with* the page
while the tray moves *against* it. Every panel value is a variable — nothing hardcoded —
because a literal `rgba(255,255,255,…)` inverts backwards. Contrast is verified: body text
~15:1 both ways, dimmed text 6.1:1 light / 4.6:1 dark, both clear WCAG AA.

Breakpoints: `900px`, `700px` (×2), `690px`, `600px`, `470px`, plus
`prefers-reduced-motion`. The panel steps 4 → 3 → 2 columns at 690px and 470px, chosen so
tile width stays roughly constant rather than ballooning — **the panel caps at 700px, so it
stops shrinking above ~780px viewport, and a breakpoint above that makes tiles bigger, not
smaller.**

Fonts: Cormorant Garamond (`--font-display`) and DM Sans (`--font-body`), one Google Fonts
`@import`. The collections toggle deliberately uses the **body** font — Ben rejected the
serif there.

---

## Common tasks

### Add photos to a new collection
1. Drop originals in `images/<dir>/`. They're gitignored; only derivatives ship.
2. Read EXIF for every frame (`python3 /tmp/fujifilm.py images/<dir>/*`) — you need
   orientation, date, aperture, shutter, ISO, film sim.
3. Generate `-thumb`/`-full` for all, `-xl` for landscapes.
4. **Look at every thumbnail before writing a title.** Convert to PNG and use Read. Ben's
   titles are specific and place-aware; generic captions are obvious.
5. Append to `photos.json` preserving key order and 2-space-per-level indentation:
   ```python
   body = ",\n".join(f'    "{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in e.items())
   blocks.append("  {\n" + body + "\n  }")
   head = src.rstrip()[:-1].rstrip()   # drop trailing ']'
   open(path,'w').write(head + ",\n" + ",\n".join(blocks) + "\n]\n")
   ```
6. Add the collection to `site-config.js` **at the end** (chronological), with `shortLabel`
   and `cover`.
7. Generate the 400×600 cover from a tall frame.
8. Create `<id>/index.html` — copy any existing route and edit the head. Keep the
   `photos.json` preload and `<base href="../" />`.
9. **Generate `images/og-<id>.jpg` and set the three `og:image:*` tags.** Nothing does this
   for you, and a WebP `og:image` shares with no picture at all. See the OG images section.
10. Run the validation script below.

### Favorite a photo
```python
s = open('photos.json').read()
i = s.index('"id": "wl-spires"')
key = '"size": "tall"'
j = s.index(key, i)
s = s[:j] + '"size": "tall",\n    "favorite": true' + s[j + len(key):]
open('photos.json','w').write(s)
```
Remember: a `wide`/`full` favorite also joins the hero rotation and needs `fileXl`.

### Naming
The representative photo for a collection is a **`cover`** (`cover:` field, `-cover.webp`).
Not "thumb" (the 1600px gallery tier) and not "hero" (the rotating full-viewport image).

---

## Validation

Run after every data change. All arrays should be empty; `orphan webp: 10` is expected and
pre-existing.

```bash
cd ~/src/photography-portfolio && node -e "
const fs=require('fs'); global.window={};
eval(fs.readFileSync('site-config.js','utf8'));
const cfg=window.SITE_CONFIG;
const photos=JSON.parse(fs.readFileSync('photos.json','utf8'));
const cids=new Set(cfg.collections.map(c=>c.id));
const pcols=new Set(photos.map(p=>p.collection));
console.log('photo cols not in config:',[...pcols].filter(c=>c&&!cids.has(c)));
console.log('config cols with no photos:',[...cids].filter(c=>!pcols.has(c)));
const ids=photos.map(p=>p.id);
console.log('dup ids:',ids.filter((v,i)=>ids.indexOf(v)!==i));
let missing=[];for(const p of photos)for(const f of [p.file,p.fileFull,p.fileXl]) if(f&&!fs.existsSync(f)) missing.push(f);
console.log('missing photo files:',missing);
console.log('missing covers:',cfg.collections.filter(c=>!fs.existsSync(c.cover)).map(c=>c.id));
console.log('missing shortLabel:',cfg.collections.filter(c=>!c.shortLabel).map(c=>c.id));
console.log('missing routes:',[...cids].filter(c=>!fs.existsSync(c+'/index.html')));
const used=new Set(photos.flatMap(p=>[p.file,p.fileFull,p.fileXl]).filter(Boolean));
cfg.collections.forEach(c=>used.add(c.cover));
let orph=[];
for(const d of fs.readdirSync('images',{withFileTypes:true})){ if(!d.isDirectory())continue;
  for(const f of fs.readdirSync('images/'+d.name)){const p='images/'+d.name+'/'+f;
    if(f.endsWith('.webp')&&!used.has(p)) orph.push(p);}}
console.log('orphan webp:',orph.length);
const ph=photos.filter(p=>p.size);
const src=fs.readFileSync('script.js','utf8');
function grab(n){const i=src.indexOf('function '+n);let d=0,j=src.indexOf('{',i);
  for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(d===0)return src.slice(i,k+1);}}}
eval(src.match(/const RECENCY_BIAS = [^;]+;/)[0]+src.match(/const FAVORITES_LEAD = [^;]+;/)[0]+grab('interleaveByCollection')+grab('clusterTallPairs'));
console.log('ordering ok:',clusterTallPairs(interleaveByCollection(ph)).length);
console.log('total:',photos.length,'favorites:',photos.filter(p=>p.favorite).length,'with xl:',photos.filter(p=>p.fileXl).length);
const pool=photos.filter(p=>p.favorite&&(p.size==='full'||p.size==='wide'));
console.log('hero pool ('+pool.length+'):',pool.map(p=>p.id).join(', '));
console.log('every hero has xl:',pool.every(p=>p.fileXl));
" && node --check script.js && node --check templates.js && node --check site-config.js \
  && python3 -c "s=open('style.css').read(); print('css braces balanced:', s.count('{')==s.count('}'))"
```

Expected now: `total: 285 favorites: 46 with xl: 45`, `ordering ok: 284`, hero pool 9,
`orphan webp: 10`.

### Link-preview check
Separate, because a broken `og:image` is invisible until someone shares the link. Catches a
WebP preview, a missing file, and dimension tags that disagree with the actual image.

```bash
cd ~/src/photography-portfolio && python3 -c "
import re, glob
from PIL import Image
bad = []
pages = sorted(glob.glob('*/index.html')) + ['index.html']
for path in pages:
    s = open(path).read()
    img = re.search(r'og:image\" content=\"https://bensauberman\.com/([^\"]+)\"', s)
    w = re.search(r'og:image:width\" content=\"(\d+)\"', s)
    h = re.search(r'og:image:height\" content=\"(\d+)\"', s)
    a = re.search(r'og:image:alt\" content=\"([^\"]*)\"', s)
    if not img: bad.append((path,'no og:image')); continue
    if img.group(1).endswith('.webp'): bad.append((path,'WebP preview — will not render')); continue
    if not (w and h and a): bad.append((path,'missing width/height/alt')); continue
    try: actual = Image.open(img.group(1)).size
    except Exception: bad.append((path,'file missing: '+img.group(1))); continue
    if actual != (int(w.group(1)), int(h.group(1))):
        bad.append((path, f'declared {(int(w.group(1)),int(h.group(1)))} != actual {actual}'))
print('pages:', len(pages), '| problems:', bad or 'none')
"
```

The 10 orphans are pre-existing: `buena-vista/DSCF9974`, `highway-1/DSCF9292` (the About
photo, referenced from `templates.js` not `photos.json`), `highway-1/DSCF9299`,
`missouri-lakes/DSCF1995`, `nyc/DSCF9782` — thumb + full each.

### You cannot render this site locally
The sandbox **cannot bind ports**, so no local server — `python3 -m http.server` fails with
`PermissionError: [Errno 1] Operation not permitted`. Headless Chrome also fails: it needs a
unix socket for its ProcessSingleton lock. `curl --noproxy` is blocked by a security hook.

So **visual changes cannot be self-verified. Say so plainly rather than implying you saw
it.** What you *can* do:
- Render `templates.js` output in Node by extracting the functions with `new Function(...)`
  and assert on the HTML string.
- Exercise real handlers against a stubbed DOM. A working harness lives at
  `/tmp/gridtest.js` (filters/panel/nav clone) and `/tmp/themetest.js` (theme toggles).
  Both are scratch — recreate if gone. The stub needs `classList`, `dataset`, `closest`,
  `parentElement`, `querySelector(All)` with compound selectors, and bubbling dispatch.
- Compute geometry in Python from the CSS values to catch wrapping and sizing problems.
- Convert webp to PNG with `sips` and use Read to actually look at photos.

When a harness result looks wrong, **check the harness first** — several "bugs" this project
hit were stub limitations (a naive selector parser that couldn't handle
`.filters__btn[data-filter="x"]`; a parser that only extracted `<button>` and so reported 0
month headers). Say clearly when that's what happened.

---

## Constraints and gotchas

### GitHub Pages
**1GB published-site limit, hard.** Currently **518MB tracked (~51%)**. Every new collection
adds roughly 10–25MB. The xl tier was only approved after correcting an earlier overestimate
of repo size — don't add a tier without checking the budget.

Working tree is 3.1GB (2.2GB of gitignored camera originals) and `.git` is 512MB.

### `.gitignore` is case-insensitive on APFS
`*.jpg` matches `.JPG`. Any committed JPEG needs an explicit negation — hence
`!images/og-*.jpg`, which covers all 36 link-preview images.

**`git check-ignore -v` gives a misleading exit code on negation rules** — it printed the
`!images/og-*.jpg` rule *and* returned 0, which reads as "ignored". Verify tracking
authoritatively with `git add` then `git diff --cached --name-status`.

### zsh
- Unmatched globs error out (`no matches found`) instead of passing through. Use `find`.
- `--include=*.html` gets glob-expanded and silently breaks `grep`. Quote it.
- `while IFS= read` drops a final line with no trailing newline. Write the trailing `\n`.

### Link previews (OG tags)
Convention, applied across all 36 routes:
- root and `/all` → `Ben's Photography`
- `/favorites` → `Ben's Favorites`
- collections → `<place> — Ben's Photography`

`<title>` is deliberately name-first (`Ben Sauberman — Crested Butte`) as the tab/search
label. **Escape bare `&` in `meta content`** — a strict parser truncates the value there,
which once would have cut "Ice & Island Lakes" in half.

### OG images must be JPEG, one per route
**iMessage and other preview fetchers will not render a WebP `og:image`** — the link
appears with no picture at all. Every route therefore points at a committed JPEG:
`images/og-<collection-id>.jpg`, plus `images/og-cover-401.jpg` (root and `/all`) and
`images/og-favorites-oyster.jpg`. 36 files, ~15MB.

Every route also declares `og:image:width`, `og:image:height` and `og:image:alt`, and the
declared dimensions must match the file — 24 are landscape **1200×800**, 12 are portrait
**800×1200**.

Those 12 are the collections with no landscape photo in them. Cropping a portrait frame to
3:2 produced previews with the subject cut out entirely (Chasm Lake became an unrecognisable
band of rock wall), so they ship the full frame at 2:3 instead. Prefer a landscape source
where one exists; use the whole frame when one doesn't.

Generation, from the largest existing derivative:
```bash
sips -s format png <src>.webp --out /tmp/og.png
# centred crop to the target ratio, then exact resize, then JPEG
sips -c <cropH> <cropW> /tmp/og.png      # note: HEIGHT then WIDTH
sips -z 800 1200 /tmp/og.png             # landscape; use -z 1200 800 for portrait
sips -s format jpeg -s formatOptions 88 /tmp/og.png --out images/og-<id>.jpg
```
Changing the filename is how you bust the iMessage/Slack preview cache. Apple caches by
page URL, so an already-shared link may keep showing the old (or missing) preview for a
while regardless.

**This is not automatic.** A new route needs its OG JPEG generated and its dimension tags
written, or the link will share with no image.

### `images/hero.webp` is vestigial
It is no longer the `og:image` for anything, and it is not in the hero rotation. The only
thing still pointing at it is the dead `id: "hero"` entry in `photos.json`, which every
query filters out. It's ~1MB of tracked weight that could go — ask first.

### Git
When files are **staged**, `git checkout -- <file>` restores from the index and is a no-op
for reverting. Use `git checkout HEAD -- <file>`.

---

## Known open items

None of these are authorised — ask before starting.

- **Backfill `filmSimulation`** for the 138 entries missing it. Explicitly deferred, not
  cancelled.
- The gallery renders all 285 `<img>` at once. Batched rendering / pagination would help.
- 8 tracked `.jpeg` originals (~65MB) in `images/flatirons/` and `images/isabelle-lake/`
  slipped past `.gitignore` before the negation rules settled. `git rm --cached` would
  reclaim real budget.
- No `404.html`, `sitemap.xml`, or `robots.txt`.
- `_seriesDisabled` holds three curated cross-cutting series ("Where Water Sits Still",
  "The Ones Watching", "On the Way Up"). Revive by renaming to `series`, or delete.
  `script.js` still has the injection path; it appends into `.filters__modes`.
- 10 orphan webp files could be deleted.
- `images/screensavers/` holds full-resolution copies of the 9 hero photos, named by id, for
  desktop wallpaper. Gitignored, local only. Regenerate if the hero pool changes.

---

## File map

```
/
├── index.html                  root route
├── all/ favorites/             static-filter routes
├── <34 collection dirs>/       one index.html each, name == collection id
├── site-config.js              window.SITE_CONFIG
├── templates.js                markup generation, replaces #app
├── script.js                   ES module, all behaviour
├── photos.json                 285 photos
├── style.css                   single stylesheet
├── firebase-config.js          Firestore keys (public)
├── serve.sh                    python3 -m http.server, default port 8000
├── CNAME                       bensauberman.com
├── CLAUDE.md
└── images/
    ├── hero.webp               vestigial — nothing references it but dead JSON
    ├── og-cover-401.jpg        root + /all link preview
    ├── og-favorites-oyster.jpg /favorites link preview
    ├── og-<collection-id>.jpg  34 link previews, one per collection
    ├── screensavers/           gitignored full-res hero copies
    └── <34 collection dirs>/   *.JPG originals (gitignored)
                                *-thumb/-full/-xl/-cover.webp (committed)
```
