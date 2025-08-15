let stations = [];
let fares = {};
const $ = id => document.getElementById(id);

async function loadData() {
  const [stationsData, faresData] = await Promise.all([
    fetch('./data/stations.json').then(r => r.json()),
    fetch('./data/adult.json').then(r => r.json())
  ]);

  stations = stationsData.map(s => ({
    ...s,
    search: (s.en + s.zh).toLowerCase(),
    label: `${s.zh} (${s.en})`,
    badgeHTML: s.lines.map(c => `<span class="line-badge line-${c}">${c.toUpperCase()}</span>`).join('')
  }));

  fares = faresData;
}

function setupSearch(inputId, suggestionsId, badgeId) {
  const input = $(inputId);
  const suggestions = $(suggestionsId);
  const badge = $(badgeId);

  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    if (!term) {
      suggestions.textContent = '';
      suggestions.style.display = 'none';
      return;
    }

    const html = stations
      .filter(s => s.search.includes(term))
      .slice(0, 5)
      .map(s => `<li data-id="${s.id}">${s.label} ${s.badgeHTML}</li>`)
      .join('');

    suggestions.innerHTML = html;
    suggestions.style.display = 'block';
  });

  suggestions.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    const s = stations.find(st => st.id == li.dataset.id);
    input.value = s.label;
    input.dataset.id = s.id;
    badge.innerHTML = s.badgeHTML;
    suggestions.textContent = '';
    suggestions.style.display = 'none';
    showFare();
  });
}

function showFare() {
  const fromId = +$('fromInput').dataset.id;
  const toId   = +$('toInput').dataset.id;
  if (!Number.isInteger(fromId) || !Number.isInteger(toId)) return;

  const [a, b] = fromId < toId ? [fromId, toId] : [toId, fromId];
  const fare = fares[a]?.[b];
  $('fareResult').textContent =
    fare !== undefined && fare !== null
      ? `$ ${fare.toFixed(2)}`
      : 'Error!';
}

function resetInput() {
  $('fareResult').addEventListener('click', () => {
    ['fromInput', 'toInput'].forEach(id => {
      const el = $(id);
      el.value = '';
      el.removeAttribute('data-id');
    });
    ['fromBadges', 'toBadges', 'fromSuggestions', 'toSuggestions'].forEach(id => {
      $(id).textContent = '';
    });
    $('fareResult').textContent = 'Adult Fare';
  });
}

(async () => {
  await loadData();
  setupSearch('fromInput', 'fromSuggestions', 'fromBadges');
  setupSearch('toInput', 'toSuggestions', 'toBadges');
  resetInput();
})();