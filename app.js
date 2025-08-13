let stations = [];
let fares = {};

async function loadData() {
  const [stationsData, faresData] = await Promise.all([
    fetch('./data/stations.json').then(r => r.json()),
    fetch('./data/fares.json').then(r => r.json())
  ]);

  stations = stationsData.map(s => ({
    id: s.id,
    zh: s.zh,
    en: s.en,
    en_lc: s.en.toLowerCase(),
    lines: s.lines
  }));

  fares = faresData;
}

function renderLineBadges(lines) {
  return lines.map(code => {
    return `<span class="line-badge line-${code}">${code.toUpperCase()}</span>`;
  }).join('');
}

function setupSearch(inputId, suggestionsId, onSelect) {
  const input = document.getElementById(inputId);
  const suggestions = document.getElementById(suggestionsId);

  input.addEventListener('input', () => {
    const term = input.value.trim().toLowerCase();
    suggestions.innerHTML = '';
    suggestions.style.display = 'block';
    if (!term) return;

    const matches = stations
      .filter(s => s.en_lc.includes(term) || s.zh.includes(term))
      .slice(0, 5);
      
      matches.forEach(station => {
        const li = document.createElement('li');
        li.innerHTML = `${station.zh} (${station.en}) ${renderLineBadges(station.lines)}`;
        li.addEventListener('click', () => {
          input.value = `${station.zh} (${station.en})`;
          const badgeSpan = document.getElementById(
            input.id === 'fromInput' ? 'fromBadges' : 'toBadges'
          );
          badgeSpan.innerHTML = renderLineBadges(station.lines);
          input.dataset.id = station.id;
          suggestions.innerHTML = '';
          suggestions.style.display = 'none';
          onSelect(station.id);
        });
        suggestions.appendChild(li);
      });
  });
}

function showFare() {
  const fromId = parseInt(document.getElementById('fromInput').dataset.id, 10);
  const toId = parseInt(document.getElementById('toInput').dataset.id, 10);
  const resultDiv = document.getElementById('fareResult');

  if (Number.isInteger(fromId) && Number.isInteger(toId)) {
    const fare = fares[fromId]?.[toId];
    resultDiv.textContent = fare !== undefined
      ? `$ ${fare.toFixed(1)}`
      : 'Fare not found.';
  }
}

(async function init() {
  await loadData();
  setupSearch('fromInput', 'fromSuggestions', showFare);
  setupSearch('toInput', 'toSuggestions', showFare);
})();