// Leonida Legend — offline GTA VI trophy guide & tracker.
// Loads app/data/trophies.json (same-origin, no network), renders the checklist,
// roadmap and missable list, and saves progress in localStorage with export/import.
const STORAGE_KEY = 'leonida-legend-progress-v1';
const DATA_URL = 'data/trophies.json';

const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  side: 'Side quests & crime',
  platinum: 'Platinum',
};

// The roadmap to the Platinum, built from the official trophy descriptions:
// story chapters and missions first, then side content, collectibles, cleanup.
const ROADMAP_STAGES = [
  {
    title: 'Before you start',
    time: '10 minutes',
    text: 'Turn cheats off — cheats disable trophies and saving. The game has 15 manual save slots and no mission replay, so keep a save at the start of every chapter and one before the final mission. Then, in Chapter 1, do the one thing that might not wait: the balcony meditation for Positive Mental Attitude (see Missables).',
    trophies: [],
  },
  {
    title: 'Play the story — Chapters 1 to 5',
    time: '60–80 hours',
    text: 'Just finish the story and enjoy it. All 12 story trophies unlock automatically. Do side content as it appears: scan vehicles with the WAiNK app and study animals with binoculars as you go — the 100% checklist counts progress made during the story, even though you cannot see it until after the credits.',
    trophies: ['just-like-paradise', 'paradise-lost', 'tits-ass-drug-money', 'vice-city-baby', 'top-of-the-world-ma', 'trust', 'break-the-bank', 'family-matters', 'dwnfall', 'hi-jacked', 'snow-storm', 'you-gotta-know-when-to-get-off'],
  },
  {
    title: 'Side questlines and strangers',
    time: 'Alongside the story',
    text: 'Finish the questlines for Andy, Kenton, Billy, Randy, Tyrone and Bret, plus Cal’s fishing line and 8 stranger strands. Every one of these stays available after the story, so nothing here is time-critical — but the questlines introduce the game’s tools (Key Cloner, Snap Gun, fences), so doing them early pays off.',
    trophies: ['road-to-rehabilitation', 'this-was-no-boat-accident', 'the-lone-rider', 'supply-and-demand', 'spin-on-this', 'fair-game', 'strangers-and-freaks', 'baited-my-tackle'],
  },
  {
    title: 'Collectibles and exploration',
    time: 'Alongside everything else',
    text: 'Cards, WAiNK scans, vehicle discoveries, the full map and the meditation spots. These are pure grind, no story gate, and they overlap with the 100% checklist — a scanned vehicle counts for Whip It Good, the checklist and the WAiNK habit at once.',
    trophies: ['dont-touch-my-deck', 'you-wainker', 'whip-it-good', 'the-goodtime-state', 'positive-mental-attitude'],
  },
  {
    title: 'Activities, races and stunts',
    time: 'Alongside everything else',
    text: 'Shooting ranges (42 gold medals), drone races at all 14 locations, 20 race wins, 250 stunts and 50 challenges. The 100% checklist raises the bar on most of these (300 stunts, 70 challenges), so treat this stage as the first pass, not the finish.',
    trophies: ['cunning-stunts', 'master-of-none', 'the-shootist', 'top-fun', 'earn-cash-not-kudos', 'stick-fiddler', 'one-last-thing', 'personal-best', 'actions-speak-louder'],
  },
  {
    title: 'Robberies, gangs and money',
    time: 'Chapters 3–4 onward',
    text: 'Bank vaults, armored trucks, jewelry stores, gang operations and the money trophies that ride on them. Most of this unlocks in Chapters 3 and 4 — the Key Cloner, the Snap Gun and the Dye Pack Jammer — and the 100% checklist needs all 8 bank jobs and all 39 gang operations.',
    trophies: ['hot-together', 'retail-therapy', 'gunslinger', 'catch-me-if-you-can', 'challenging-tank', 'sneakthief', 'maximum-withdrawal', 'a-classic-blitz-play', 'pest-control', 'dime-on-the-dollar', 'treat-yo-self', 'little-boxes', 'on-the-spot'],
  },
  {
    title: 'Odd ones out',
    time: 'Any time',
    text: 'The one-off moments: a cocktail on Ocean Beach, a showroom window, a bowling alley heist, the UFO easter egg — and the two trophies no published guide has confirmed yet. Check their guides before grinding; the speculative ones are marked as such.',
    trophies: ['in-the-beginning', 'capital-offense', 'lets-go-bowling', 'bad-luck-i-guess', 'the-truth-is-out-there', 'ten-pin'],
  },
  {
    title: '100% completion and the Platinum',
    time: 'About 100 hours of cleanup',
    text: 'After the credits, the 100% checklist opens under Progress > Stats > 100% Completion. It is lenient — closer to 60% of true completion — but it is the long tail: 200 vehicles scanned, 100 animals studied, 300 stunts, 70 of 80 challenges, every robbery, shooting range, drone race and Bret quest. Finish it and A Long Road pops; with it, the Platinum.',
    trophies: ['a-long-road', 'vice-got-a-price'],
  },
];

const state = {
  trophies: [],
  earned: new Set(),
  spoiler: false,
  earnedOnly: false,
  kind: 'all',
  grade: 'all',
  search: '',
  selectedId: null,
};

const $ = (id) => document.getElementById(id);

function loadSavedProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (Array.isArray(raw.earned)) state.earned = new Set(raw.earned.filter((id) => typeof id === 'string'));
    state.spoiler = raw.spoiler === true;
    state.earnedOnly = raw.earnedOnly === true;
  } catch {
    state.earned = new Set();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: [...state.earned],
    spoiler: state.spoiler,
    earnedOnly: state.earnedOnly,
  }));
}

function trophyById(id) {
  return state.trophies.find((t) => t.id === id);
}

function isSpoilerHidden(trophy) {
  return state.spoiler && trophy.kind === 'story' && !state.earned.has(trophy.id);
}

function matchesFilters(trophy) {
  if (state.kind === 'missable') {
    if (!trophy.missable) return false;
  } else if (state.kind !== 'all' && trophy.kind !== state.kind) {
    return false;
  }
  if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
  if (state.earnedOnly && !state.earned.has(trophy.id)) return false;
  if (state.search) {
    const hay = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    if (!hay.includes(state.search)) return false;
  }
  return true;
}

function gradeBadge(trophy) {
  const span = document.createElement('span');
  span.className = `grade-badge grade-${trophy.grade}`;
  span.textContent = trophy.grade;
  return span;
}

function renderProgress() {
  const total = state.trophies.length;
  const earned = state.earned.size;
  const pct = total ? Math.round((earned / total) * 100) : 0;
  $('earnedCount').textContent = earned;
  $('progressFill').style.width = `${pct}%`;
  $('progressBarWrap').setAttribute('aria-valuenow', String(earned));
  $('progressNote').textContent = total
    ? `${pct}% to the Platinum — ${total - earned} to go`
    : 'Loading trophies…';
  const counts = $('gradeCounts');
  counts.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const got = state.trophies.filter((t) => t.grade === grade && state.earned.has(t.id)).length;
    const all = state.trophies.filter((t) => t.grade === grade).length;
    const li = document.createElement('li');
    li.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = `${got}/${all}`;
    li.append(b, ` ${grade}`);
    counts.append(li);
  }
}

function renderChecklist() {
  const list = $('trophyList');
  list.replaceChildren();
  const shown = state.trophies.filter(matchesFilters);
  $('listMeta').textContent = `Showing ${shown.length} of ${state.trophies.length} trophies` +
    (state.earned.size ? ` — ${state.earned.size} earned` : '');
  for (const trophy of shown) {
    const li = document.createElement('li');
    li.className = 'trophy-row' + (state.earned.has(trophy.id) ? ' earned' : '') +
      (state.selectedId === trophy.id ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = state.earned.has(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) state.earned.add(trophy.id);
      else state.earned.delete(trophy.id);
      saveProgress();
      renderAll();
    });
    const body = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    const desc = document.createElement('div');
    desc.className = 'trophy-desc';
    if (isSpoilerHidden(trophy)) {
      name.textContent = 'Hidden story trophy';
      desc.innerHTML = '';
      const hidden = document.createElement('span');
      hidden.className = 'hidden-note';
      hidden.textContent = 'Spoilers hidden — earn it to reveal the name and description.';
      desc.append(hidden);
    } else {
      name.textContent = trophy.name;
      desc.textContent = trophy.description;
    }
    const tags = document.createElement('div');
    tags.className = 'trophy-tags';
    const kindTag = document.createElement('span');
    kindTag.className = 'tag';
    kindTag.textContent = KIND_LABELS[trophy.kind] ?? trophy.kind;
    tags.append(kindTag);
    if (trophy.missable) {
      const miss = document.createElement('span');
      miss.className = 'tag missable';
      miss.textContent = 'Potentially missable';
      tags.append(miss);
    }
    if (trophy.guide.startsWith('SPECULATIVE')) {
      const spec = document.createElement('span');
      spec.className = 'tag speculative';
      spec.textContent = 'Unconfirmed';
      tags.append(spec);
    }
    body.append(name, desc, tags);
    li.append(box, body, gradeBadge(trophy));
    li.addEventListener('click', () => {
      state.selectedId = trophy.id;
      renderAll();
      $('detailPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    list.append(li);
  }
  if (!shown.length) {
    const li = document.createElement('li');
    li.textContent = 'No trophies match these filters.';
    list.append(li);
  }
}

function renderDetail() {
  const panel = $('detailPanel');
  panel.replaceChildren();
  const trophy = state.selectedId ? trophyById(state.selectedId) : null;
  if (!trophy) {
    const p = document.createElement('p');
    p.className = 'detail-empty';
    p.textContent = 'Select a trophy to read its guide and sources.';
    panel.append(p);
    return;
  }
  const title = document.createElement('h3');
  const official = document.createElement('p');
  official.className = 'official';
  if (isSpoilerHidden(trophy)) {
    title.textContent = 'Hidden story trophy';
    official.textContent = 'Spoilers are hidden until this trophy is earned. Tick it off in the checklist to reveal its guide.';
    panel.append(title, official);
    return;
  }
  title.textContent = trophy.name;
  official.append(gradeBadge(trophy), ` — ${trophy.description}`);
  panel.append(title, official);
  if (trophy.missable && trophy.missable_note) {
    const box = document.createElement('div');
    box.className = 'missable-box';
    const strong = document.createElement('strong');
    strong.textContent = 'Potentially missable. ';
    box.append(strong, document.createTextNode(trophy.missable_note));
    panel.append(box);
  }
  const guide = document.createElement('p');
  guide.className = 'guide-text';
  if (trophy.guide.startsWith('SPECULATIVE')) {
    const spec = document.createElement('div');
    spec.className = 'spec-box';
    spec.textContent = trophy.guide.replace(/^SPECULATIVE — /, 'Unconfirmed: ');
    panel.append(spec);
  } else {
    guide.textContent = trophy.guide;
    panel.append(guide);
  }
  if (trophy.sources && trophy.sources.length) {
    const sources = document.createElement('div');
    sources.className = 'sources';
    const heading = document.createElement('h4');
    heading.textContent = 'Sources';
    const ul = document.createElement('ul');
    for (const source of trophy.sources) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = source.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = source.name;
      li.append(a);
      ul.append(li);
    }
    sources.append(heading, ul);
    panel.append(sources);
  }
  const earnedLine = document.createElement('p');
  earnedLine.className = 'earned-line';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.textContent = state.earned.has(trophy.id) ? 'Mark as not earned' : 'Mark as earned';
  toggle.addEventListener('click', () => {
    if (state.earned.has(trophy.id)) state.earned.delete(trophy.id);
    else state.earned.add(trophy.id);
    saveProgress();
    renderAll();
  });
  earnedLine.append(toggle);
  panel.append(earnedLine);
}

function renderRoadmap() {
  const list = $('roadmapList');
  list.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const li = document.createElement('li');
    const heading = document.createElement('h3');
    heading.textContent = stage.title;
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = stage.time;
    const text = document.createElement('p');
    text.textContent = stage.text;
    li.append(heading, time, text);
    if (stage.trophies.length) {
      const ul = document.createElement('ul');
      ul.className = 'stage-trophies';
      for (const id of stage.trophies) {
        const trophy = trophyById(id);
        if (!trophy) continue;
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = trophy.name;
        if (state.earned.has(id)) button.classList.add('done');
        button.addEventListener('click', () => {
          state.selectedId = id;
          switchView('checklist');
          renderAll();
        });
        item.append(button);
        ul.append(item);
      }
      li.append(ul);
    }
    list.append(li);
  }
}

function renderMissables() {
  const wrap = $('missableList');
  wrap.replaceChildren();
  const missable = state.trophies.filter((t) => t.missable);
  if (!missable.length) {
    const p = document.createElement('p');
    p.textContent = 'No missable trophies are flagged in the data.';
    wrap.append(p);
    return;
  }
  for (const trophy of missable) {
    const card = document.createElement('div');
    card.className = 'missable-card';
    const heading = document.createElement('h3');
    heading.textContent = `${trophy.name} — ${trophy.grade}`;
    const desc = document.createElement('p');
    desc.textContent = trophy.description;
    const note = document.createElement('p');
    note.textContent = trophy.missable_note ?? '';
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'linklike';
    link.textContent = 'Read the full guide →';
    link.addEventListener('click', () => {
      state.selectedId = trophy.id;
      switchView('checklist');
      renderAll();
    });
    card.append(heading, desc, note, link);
    wrap.append(card);
  }
}

function switchView(view) {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.classList.toggle('active', section.id === `view-${view}`);
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...state.earned] }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  const parsed = JSON.parse(await file.text());
  const earned = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(earned)) throw new Error('not a progress file');
  const known = new Set(state.trophies.map((t) => t.id));
  state.earned = new Set(earned.filter((id) => known.has(id)));
  saveProgress();
  renderAll();
}

function renderAll() {
  renderProgress();
  renderChecklist();
  renderDetail();
  renderRoadmap();
  renderMissables();
}

async function init() {
  loadSavedProgress();
  $('spoilerToggle').checked = state.spoiler;
  $('earnedOnly').checked = state.earnedOnly;
  const doc = await (await fetch(DATA_URL)).json();
  state.trophies = doc.trophies;
  renderAll();

  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }
  $('jumpMissable').addEventListener('click', () => switchView('missables'));
  for (const chip of document.querySelectorAll('#kindChips .chip')) {
    chip.addEventListener('click', () => {
      state.kind = chip.dataset.kind;
      for (const other of document.querySelectorAll('#kindChips .chip')) {
        other.classList.toggle('active', other === chip);
      }
      renderChecklist();
    });
  }
  $('grade').addEventListener('change', (event) => {
    state.grade = event.target.value;
    renderChecklist();
  });
  $('search').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderChecklist();
  });
  $('spoilerToggle').addEventListener('change', (event) => {
    state.spoiler = event.target.checked;
    saveProgress();
    renderAll();
  });
  $('earnedOnly').addEventListener('change', (event) => {
    state.earnedOnly = event.target.checked;
    saveProgress();
    renderChecklist();
  });
  $('exportBtn').addEventListener('click', exportProgress);
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await importProgress(file);
    } catch {
      alert('That file is not a Leonida Legend progress export.');
    }
    event.target.value = '';
  });
  $('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies?')) {
      state.earned = new Set();
      state.selectedId = null;
      saveProgress();
      renderAll();
    }
  });
}

init();
