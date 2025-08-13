import fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const urls = {
  stations: 'https://opendata.mtr.com.hk/data/mtr_lines_and_stations.csv',
  fares: 'https://opendata.mtr.com.hk/data/mtr_lines_fares.csv'
};

export async function processStations() {
  console.log('Fetching stations CSV…');
  const res = await fetch(urls.stations);
  if (!res.ok) throw new Error(`Stations fetch failed: ${res.status} ${res.statusText}`);

  const rows = await csv().fromString(await res.text());
  const byId = new Map();

  for (const row of rows) {
    const id = Number(row['Station ID'] ?? row['StationID']);
    if (!Number.isFinite(id)) continue;

    const en = row['English Name'] ?? row['EnglishName'] ?? '';
    const zh = row['Chinese Name'] ?? row['ChineseName'] ?? '';
    const line = (row['Line Code'] ?? row['LineCode'] ?? '').toLowerCase();

    if (!byId.has(id)) {
      byId.set(id, { id, en, zh, lines: new Set() });
    }
    if (line) byId.get(id).lines.add(line);
  }

  const stations = Array.from(byId.values())
    .map(s => ({
      id: s.id,
      en: s.en,
      zh: s.zh,
      lines: Array.from(s.lines).sort()
    }))
    .sort((a, b) => a.id - b.id);

  const stationsPath = path.join(dataDir, 'stations.json');
  fs.writeFileSync(stationsPath, JSON.stringify(stations, null, 2), 'utf-8');
  console.log(`✅ Saved ${stations.length} unique stations → ${stationsPath}`);
}

export async function processFares() {
  console.log('Fetching fares CSV…');
  const res = await fetch(urls.fares);
  if (!res.ok) throw new Error(`Fares fetch failed: ${res.status} ${res.statusText}`);

  const rows = await csv().fromString(await res.text());

  const fares = {};

  for (const row of rows) {
    const srcId = String(row.SRC_STATION_ID ?? '').trim();
    const destId = String(row.DEST_STATION_ID ?? '').trim();

    // use adult Octopus fare; parse to number
    const value = parseFloat(row.OCT_ADT_FARE);

    if (!fares[srcId]) {
      fares[srcId] = {};
    }
    fares[srcId][destId] = Number.isFinite(value) ? value : null;
  }

  const faresPath = path.join(dataDir, 'fares.json');
  fs.writeFileSync(faresPath, JSON.stringify(fares, null, 2), 'utf-8');
  console.log(`✅ Saved fare lookup table for ${Object.keys(fares).length} stations → ${faresPath}`);
}


(async () => {
  try {
    await processStations();
    await processFares();
    console.log('🎯 All data converted successfully');
  } catch (err) {
    console.error('❌ Conversion failed:', err);
    process.exit(1);
  }
})();