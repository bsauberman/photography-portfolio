// Single source of truth for collections, series, nav, footer, and about metadata.
// Change something here and it propagates across every route on the site.
// The HTML files own their per-route <head> (title + OG tags) — everything else is built at runtime.

const SITE_CONFIG = {
  // ─── Collections (chronological order — dropdown auto-groups by month) ───
  // dateLabel is what shows in the dropdown; displayName is what shows next to a note author.
  // coords are the map pin location; cat controls the pin color (coast/boulder/mountain/urban/pnw).
  collections: [
    { id: 'highway-1',    dateLabel: "May 13 '26",    placeLabel: "Highway 1, CA",                  displayName: "Highway 1, CA",                     coords: [37.1820, -122.3933], cat: 'coast' },
    { id: 'apple-park',   dateLabel: "May 14 '26",    placeLabel: "Apple Park - Cupertino, CA",     displayName: "Apple Park - Cupertino, CA",        coords: [37.3349, -122.0090], cat: 'urban' },
    { id: 'orange-county',dateLabel: "May 16 '26",    placeLabel: "Orange County, CA",              displayName: "Orange County, CA",                 coords: [33.4734, -117.7136], cat: 'coast' },
    { id: 'south-boulder',dateLabel: "May 18 '26",    placeLabel: "South Boulder - Boulder, CO",    displayName: "South Boulder - Boulder, CO",       coords: [40.0150, -105.2705], cat: 'boulder' },
    { id: 'nyc',          dateLabel: "May 22 '26",    placeLabel: "New York, NY",                   displayName: "New York, NY",                      coords: [40.7549, -73.9840],  cat: 'urban' },
    { id: 'buena-vista',  dateLabel: "May 29-30 '26", placeLabel: "Buena Vista, CO",                displayName: "Buena Vista, CO",                   coords: [38.8425, -106.1311], cat: 'mountain' },
    { id: 'green-mtn',    dateLabel: "Jun 4 '26",     placeLabel: "Green Mountain - Boulder, CO",   displayName: "Green Mountain - Boulder, CO",      coords: [40.0150, -105.2705], cat: 'boulder' },
    { id: 'eldorado',     dateLabel: "Jun 7 '26",     placeLabel: "Eldorado Canyon - Eldorado Springs, CO", displayName: "Eldorado Canyon - Eldorado Springs, CO", coords: [39.9316, -105.2963], cat: 'boulder' },
    { id: 'mesa-trail',   dateLabel: "Jun 10 '26",    placeLabel: "Mesa Trail - Boulder, CO",       displayName: "Mesa Trail - Boulder, CO",          coords: [40.0150, -105.2705], cat: 'boulder' },
    { id: 'flatirons',    dateLabel: "Jun 14 '26",    placeLabel: "Flatirons - Boulder, CO",        displayName: "Flatirons - Boulder, CO",           coords: [40.0150, -105.2705], cat: 'boulder' },
    { id: 'chicago-basin',dateLabel: "Jun 19-20 '26", placeLabel: "Chicago Basin - Silverton, CO",  displayName: "Chicago Basin - Silverton, CO",     coords: [37.5940, -107.6187], cat: 'mountain' },
    { id: 'ice-lake',     dateLabel: "Jun 22 '26",    placeLabel: "Ice & Island Lakes - Silverton, CO", displayName: "Ice & Island Lakes - Silverton, CO", coords: [37.8094, -107.7723], cat: 'mountain' },
    { id: 'olympic-np',   dateLabel: "Jun 28-30 '26", placeLabel: "Seven Lakes Basin - Olympic NP, WA", displayName: "Seven Lakes Basin - Olympic NP, WA", coords: [47.9683, -123.4983], cat: 'pnw' },
    { id: 'squamish',     dateLabel: "Jul 1-4 '26",   placeLabel: "Squamish, BC",                   displayName: "Squamish, BC",                      coords: [49.7016, -123.1558], cat: 'pnw' },
    { id: 'vancouver',    dateLabel: "Jul 5 '26",     placeLabel: "Vancouver, BC",                  displayName: "Vancouver, BC",                     coords: [49.2827, -123.1207], cat: 'urban' },
    { id: 'mallory-cave', dateLabel: "Jul 10 '26",    placeLabel: "Mallory Cave - Boulder, CO",     displayName: "Mallory Cave - Boulder, CO",        coords: [40.0150, -105.2705], cat: 'boulder' },
    { id: 'missouri-lakes', dateLabel: "Jul 11-12 '26", placeLabel: "Missouri Lakes - Holy Cross Wilderness, CO", displayName: "Missouri Lakes - Holy Cross Wilderness, CO", coords: [39.4430, -106.4830], cat: 'mountain' },
  ],

  // ─── Series (curated cross-cutting themes) — currently hidden ───
  // To bring back, rename `_seriesDisabled` to `series` (and comment out the empty array).
  series: [],
  _seriesDisabled: [
    {
      id: 'series-water',
      label: 'Where Water Sits Still',
      note: 'Alpine tarns, glacial lakes, and the pockets of stillness found above treeline.',
      photoIds: [
        'op-1440', 'il-ice-lake', 'il-meadow', 'cb-glacial-lake', 'cb-left-twin',
        'op-1543', 'op-1476', 'op-1528', 'op-1494', 'il-island-lake',
        'il-island-overlook', 'bv-cottonwood'
      ],
    },
    {
      id: 'series-wildlife',
      label: 'The Ones Watching',
      note: "Encounters where the camera wasn't the only thing paying attention.",
      photoIds: [
        'bv-goat-outcrop', 'bv-goats-pair', 'bv-goat-sky', 'bv-goat-trees',
        'bv-bighorns', 'oc-seagulls', 'oc-seagull', 'oc-sandpiper',
        'op-1537', 'sq-1688', 'cb-camp-1', 'cb-camp-2'
      ],
    },
    {
      id: 'series-ascent',
      label: 'On the Way Up',
      note: 'The approach — trails, switchbacks, and the quiet miles before the view.',
      photoIds: [
        'bv-summit-silhouette', 'bv-descending', 'oc-canyon', 'oc-switchbacks',
        'il-approach', 'mt-meadow-trail', 'mt-trail-rocks', 'sb-trailhead',
        'op-1246', 'sq-1666', 'fl-flatiron', 'fl-boulder-overlook'
      ],
    },
  ],

  // ─── Static filter entries (always at top of dropdown) ───
  staticFilters: [
    { id: 'favorites', label: 'Favorites' },
    { id: 'all', label: 'All (Ordered)' },
    { id: 'shuffled', label: 'All (Shuffled)' },
  ],

  // ─── Contact ───
  email: 'bsauberman@gmail.com',
  instagram: 'bensauberman',
};

// Expose on window so both classic and module scripts can access it.
window.SITE_CONFIG = SITE_CONFIG;
