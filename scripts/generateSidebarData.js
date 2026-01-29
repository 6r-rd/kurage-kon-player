/**
 * Script to generate sidebar data for client-side loading.
 */
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createNamespacedLogger } from "./debug.js";

const logger = createNamespacedLogger("script:generateSidebarData");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(process.cwd(), "public");
const VIDEOS_DIR = path.join(PUBLIC_DIR, "videos");
const API_DIR = path.join(PUBLIC_DIR, "api");
const OUTPUT_PATH = path.join(API_DIR, "sidebar-data.json");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf-8"));

function generateSidebarData() {
  if (!fs.existsSync(API_DIR)) {
    fs.mkdirSync(API_DIR, { recursive: true });
  }

  const artistsJson = readJson(path.join(PUBLIC_DIR, "artists.json"));
  const songsJson = readJson(path.join(PUBLIC_DIR, "songs.json"));

  const artistsMap = {};
  (artistsJson.artists || []).forEach((artist) => {
    artistsMap[artist.artist_id] = artist.name;
  });

  const songs = songsJson.songs || [];

  const videoFiles = fs
    .readdirSync(VIDEOS_DIR)
    .filter((file) => file.endsWith(".json"));

  const videos = videoFiles.map((file) => {
    const video = readJson(path.join(VIDEOS_DIR, file));
    return {
      video_id: video.video_id,
      title: video.title,
      start_datetime: video.start_datetime,
      thumbnail_url: video.thumbnail_url,
      timestamps: (video.timestamps || []).map((timestamp) => ({
        song_id: timestamp.song_id,
        time: timestamp.time,
        original_time: timestamp.original_time,
      })),
    };
  });

  const payload = {
    generated_at: new Date().toISOString(),
    songs,
    artists: artistsMap,
    videos,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload));

  logger.log(`Generated sidebar-data.json with ${videos.length} videos`);
}

if (import.meta.url.endsWith("generateSidebarData.js") && !process.env.VITEST) {
  generateSidebarData();
}

export { generateSidebarData };
