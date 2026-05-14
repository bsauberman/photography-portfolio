# Photography Portfolio — CLAUDE.md

## Project overview
A personal photography portfolio website for Ben Sauberman, built as a static site deployable to GitHub Pages. The site showcases photos taken on a Fujifilm X-E4 with a TTArtisan 27mm f/2.8 pancake lens, primarily landscape, travel, trail running, and outdoor adventure photography.

## Design direction

### Aesthetic: Editorial minimalism
The site should feel like a high-end photography magazine — clean, elegant, and confident. The photos are the star; everything else recedes. Inspired by gallery exhibitions and print editorials, not template websites.

### Key design principles
- **Photos are freeform, not grid-locked.** Varied sizes, mixed aspect ratios, asymmetric placement. Some photos bleed wide, some float small with generous whitespace. The layout should feel curated by hand, not auto-generated. Think editorial magazine spreads, not Instagram grids.
- **Generous negative space.** Let photos breathe. White (or off-white) space is a design element, not wasted space. The emptiness creates tension and draws the eye to the images.
- **Typography is minimal but refined.** Use a distinctive serif or display font for headings/name (something with character — not Inter, not Roboto). A clean sans-serif for body/nav. Two fonts max. Thin weights, wide letter-spacing on small labels.
- **Monochrome UI, color only in photos.** The site chrome (nav, text, borders, backgrounds) should be black, white, and gray. The only color on the page comes from the photographs themselves. This makes the photos pop.
- **Full-bleed hero.** The landing page opens with a single striking photo that fills the viewport, with the name and minimal nav overlaid. Scroll to enter the portfolio.
- **Subtle motion.** Gentle fade-in on scroll for photos. No aggressive animations, no parallax gimmicks. Photos should feel like they're being revealed, not launched at you.
- **Dark mode optional.** Primary design is light/white background. A dark mode toggle is a nice-to-have but not required for v1.

### What to avoid
- Rigid grids with uniform card sizes
- Drop shadows, gradients, rounded cards
- Generic template aesthetics (Bootstrap, Squarespace vibes)
- Busy navigation or excessive UI elements
- Any fonts: Inter, Roboto, Arial, system-ui defaults
- Purple gradients, blue-purple color schemes
- Stock photo placeholder aesthetics

## Site structure

### Pages / Sections
1. **Hero / Landing** — Full-viewport photo with name overlay, minimal nav. Scroll indicator.
2. **Portfolio / Work** — Freeform photo gallery with mixed sizes. Category filters (All, Landscape, Trail, Travel, Street). Photos can optionally show location and date on hover.
3. **About** — Brief bio, photo of Ben (optional), gear info (Fujifilm X-E4, TTArtisan 27mm). Keep it short and personal.
4. **Contact** — Email link, Instagram link. Nothing more.

### Navigation
- Top nav: Name/logo on left, page links on right (Work, About, Contact)
- Fixed/sticky on scroll, minimal, semi-transparent background
- Hamburger menu on mobile

## Technical requirements

### Stack
- **Static HTML/CSS/JS** — no frameworks needed for v1. Single-page or multi-page, whichever feels cleaner.
- **Deployable to GitHub Pages** — no server-side rendering, no build step required (unless using a simple static site generator).
- **Responsive** — must look great on mobile, tablet, and desktop.
- **Image optimization** — lazy loading for all photos (`loading="lazy"`), responsive `srcset` for different screen sizes. Photos should be served in WebP format where possible.
- **Fast** — minimal JS, no heavy libraries. CSS animations only.

### Image handling
- Photos are stored in an `/images` directory, organized by trip/collection (e.g., `/images/highway-1/`, `/images/squamish/`, `/images/slovenia/`).
- Each photo should have a thumbnail version and a full-resolution version.
- Gallery layout uses CSS (flexbox or grid with manual span overrides) — not a JS masonry library. If JS masonry is needed for dynamic layouts, use vanilla JS, not a dependency.
- Clicking a photo opens a lightbox overlay with the full-resolution version, EXIF caption (location, date, camera settings), and left/right navigation.

### Photo metadata
Photos can include optional metadata displayed on hover or in lightbox:
- Location (e.g., "Shark Fin Cove, CA")
- Date (e.g., "May 2026")
- Camera settings (e.g., "f/5.6, 1/500s, ISO 200")
- Film simulation (e.g., "Classic Negative")

This metadata can be stored in a simple JSON file (`photos.json`) that maps filenames to metadata, making it easy to add new photos without editing HTML.

## Content

### Bio (About page)
Ben Sauberman is a software engineer and outdoor enthusiast based in Boulder, Colorado. He shoots on a Fujifilm X-E4 with a 27mm pancake lens — a compact setup built for trail running, climbing, backpacking, and travel. His photography focuses on landscapes, coastlines, alpine environments, and the quiet moments found on the trail.

### Collections / Trips (will grow over time)
- Highway 1 — May 2026
- Pacific Northwest / BC — June 2026
- Chicago Basin — June 2026
- Slovenia — August 2026
- South Korea — October/November 2026
- Boulder, CO — Ongoing

### Social links
- Instagram: @bensauberman (placeholder)
- Email: (placeholder)

## File structure
```
/
├── index.html
├── style.css
├── script.js
├── photos.json
├── CLAUDE.md
├── images/
│   ├── hero.webp
│   ├── highway-1/
│   │   ├── shark-fin-cove-thumb.webp
│   │   ├── shark-fin-cove-full.webp
│   │   └── ...
│   ├── squamish/
│   ├── slovenia/
│   └── ...
└── README.md
```

## Adding new photos
1. Add the image files to the appropriate `/images/{collection}/` directory (both thumb and full versions).
2. Add an entry to `photos.json` with the filename, collection, and optional metadata.
3. The gallery renders from `photos.json` — no HTML editing needed.

## Design references
- Full-bleed hero with overlaid text, scrolling into a freeform gallery
- Mixed photo sizes: some spanning full width, some at 50%, some small with lots of whitespace
- Hover reveals location/date in small, elegant type
- Lightbox for full-resolution viewing with EXIF data
- Overall feel: gallery exhibition, not social media feed
