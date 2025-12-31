import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const VIDEOS_DIR = path.join(PUBLIC_DIR, 'videos');
const SONGS_PATH = path.join(PUBLIC_DIR, 'songs.json');

const usage = 'Usage: node scripts/countEdgeTimestampSongs.js <year> [year ...]';

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const incrementCount = (counts, songId) => {
  if (!songId) {
    return;
  }
  counts.set(songId, (counts.get(songId) ?? 0) + 1);
};

const getTopEntry = (counts) => {
  const entries = [...counts.entries()];
  if (entries.length === 0) {
    return null;
  }
  entries.sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0]);
  });
  const [songId, count] = entries[0];
  return { songId, count };
};

const loadSongTitles = () => {
  if (!fs.existsSync(SONGS_PATH)) {
    throw new Error(`Missing songs.json at ${SONGS_PATH}`);
  }
  const data = readJson(SONGS_PATH);
  const songs = Array.isArray(data.songs) ? data.songs : [];
  const titles = new Map();
  for (const song of songs) {
    if (song?.song_id) {
      titles.set(song.song_id, song.title ?? '');
    }
  }
  return titles;
};

const parseYears = (args) => {
  if (args.length === 0) {
    throw new Error(usage);
  }
  const years = args.map((value) => Number(value));
  const invalid = years.find((year) => !Number.isInteger(year));
  if (invalid !== undefined) {
    throw new Error(`Invalid year "${args[years.indexOf(invalid)]}". ${usage}`);
  }
  return years;
};

const getYearFromStartDatetime = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.getUTCFullYear();
};

const run = ({ years }) => {
  if (!fs.existsSync(VIDEOS_DIR)) {
    throw new Error(`Missing videos directory at ${VIDEOS_DIR}`);
  }

  const files = fs.readdirSync(VIDEOS_DIR).filter((file) => file.endsWith('.json'));
  const firstCounts = new Map();
  const lastCounts = new Map();

  for (const file of files) {
    const filePath = path.join(VIDEOS_DIR, file);
    let data;
    try {
      data = readJson(filePath);
    } catch (error) {
      console.warn(`Skipping invalid JSON: ${file}`);
      continue;
    }
    const year = getYearFromStartDatetime(data.start_datetime);
    if (!year || !years.includes(year)) {
      continue;
    }
    const timestamps = Array.isArray(data.timestamps) ? data.timestamps : [];
    if (timestamps.length === 0) {
      continue;
    }
    const firstSongId = timestamps[0]?.song_id;
    const lastSongId = timestamps[timestamps.length - 1]?.song_id;
    incrementCount(firstCounts, firstSongId);
    incrementCount(lastCounts, lastSongId);
  }

  const firstTop = getTopEntry(firstCounts);
  const lastTop = getTopEntry(lastCounts);
  if (!firstTop || !lastTop) {
    throw new Error(`No timestamp data found for years: ${years.join(', ')}.`);
  }

  const songTitles = loadSongTitles();
  const firstTitle = songTitles.get(firstTop.songId) || '(unknown)';
  const lastTitle = songTitles.get(lastTop.songId) || '(unknown)';

  console.log(`Target years: ${years.join(', ')}`);
  console.log('Most frequent first timestamp song');
  console.log(`song_id: ${firstTop.songId}`);
  console.log(`title: ${firstTitle}`);
  console.log(`count: ${firstTop.count}`);
  console.log('');
  console.log('Most frequent last timestamp song');
  console.log(`song_id: ${lastTop.songId}`);
  console.log(`title: ${lastTitle}`);
  console.log(`count: ${lastTop.count}`);
};

if (import.meta.url.endsWith('countEdgeTimestampSongs.js') && !process.env.VITEST) {
  try {
    const years = parseYears(process.argv.slice(2));
    run({ years });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export { run };
