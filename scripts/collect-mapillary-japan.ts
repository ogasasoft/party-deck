import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { GeoLocation, GeoLocationIndexItem } from "../src/games/geoGuessr";
import { assignJapanRegion, dedupeGeoLocations, isPointInJapan, validateGeoLocations } from "./geo-quality";

type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type RawMapillaryImage = {
  id: string;
  geometry?: { type: "Point"; coordinates: [number, number] };
  computed_geometry?: { type: "Point"; coordinates: [number, number] };
  computed_compass_angle?: number;
  compass_angle?: number;
  captured_at?: string;
  camera_type?: string;
  height?: number;
  width?: number;
  thumb_1024_url?: string;
  thumb_2048_url?: string;
  quality_score?: number;
  sequence?: string;
  sequence_id?: string;
};

const JAPAN_BBOX: BBox = {
  west: 122.9,
  south: 24.0,
  east: 146.1,
  north: 45.7
};

const TOKYO_SAMPLE_BBOX: BBox = {
  west: 139.55,
  south: 35.55,
  east: 139.95,
  north: 35.82
};

const FIELDS = [
  "id",
  "geometry",
  "computed_geometry",
  "computed_compass_angle",
  "compass_angle",
  "captured_at",
  "camera_type",
  "height",
  "width",
  "thumb_1024_url",
  "thumb_2048_url",
  "quality_score",
  "sequence"
].join(",");

loadLocalEnv();

const args = process.argv.slice(2);
const preset = getArgValue("--preset") ?? (args.includes("--sample") ? "tokyo-sample" : "japan");
const collectionConfig = createCollectionConfig(preset);
const OUT_DIR = path.resolve(
  process.env.MAPILLARY_OUT_DIR ?? (preset === "japan" ? "data-generated/mapillary" : `data-generated/mapillary/${preset}`)
);
const PUBLIC_DATA_DIR = path.join(OUT_DIR, "public", "data", "geo");
const SHOULD_INSTALL_PUBLIC = args.includes("--install-public") || process.env.MAPILLARY_INSTALL_PUBLIC === "1";
const SHOULD_RESET = args.includes("--reset") || process.env.MAPILLARY_RESET === "1";
const token = process.env.MAPILLARY_ACCESS_TOKEN ?? process.env.VITE_MAPILLARY_ACCESS_TOKEN;

if (!token) {
  console.error("MAPILLARY_ACCESS_TOKEN or VITE_MAPILLARY_ACCESS_TOKEN is required.");
  process.exit(1);
}

async function main() {
  if (SHOULD_RESET) {
    await rm(OUT_DIR, { recursive: true, force: true });
  }
  await mkdir(path.join(OUT_DIR, "raw"), { recursive: true });
  await mkdir(path.join(OUT_DIR, "indexes"), { recursive: true });
  await rm(PUBLIC_DATA_DIR, { recursive: true, force: true });
  await mkdir(path.join(PUBLIC_DATA_DIR, "chunks"), { recursive: true });

  const meshes = createMeshes(collectionConfig.bbox, collectionConfig.step).slice(0, collectionConfig.maxMeshes);
  const checkpointPath = path.join(OUT_DIR, "indexes", "checkpoint.json");
  const checkpoint = SHOULD_RESET ? { completedMeshIds: [] } : await loadCheckpoint(checkpointPath);
  const allLocations: GeoLocation[] = [];
  const targetCandidateCount = collectionConfig.targetPlayableCount ? collectionConfig.targetPlayableCount * 3 : 0;

  for (const mesh of meshes) {
    if (targetCandidateCount && allLocations.length >= targetCandidateCount) break;

    const meshId = meshToId(mesh);
    const rawPath = path.join(OUT_DIR, "raw", `${meshId}.json`);
    const raw = checkpoint.completedMeshIds.includes(meshId) && existsSync(rawPath) ? await readJson<RawMapillaryImage[]>(rawPath) : await fetchImages(mesh);
    const locations = raw.map(toLocation(meshId)).filter((item): item is GeoLocation => Boolean(item));

    if (!checkpoint.completedMeshIds.includes(meshId)) {
      await writeJson(rawPath, raw);
      checkpoint.completedMeshIds.push(meshId);
      checkpoint.updatedAt = new Date().toISOString();
      await writeJson(checkpointPath, checkpoint);
      console.log(`completed ${meshId}: raw=${raw.length} playable=${locations.length}`);
      await sleep(collectionConfig.sleepMs);
    } else {
      console.log(`loaded ${meshId}: raw=${raw.length} playable=${locations.length}`);
    }

    allLocations.push(...locations);
  }

  const deduped = dedupeGeoLocations(allLocations, {
    minDistanceMeters: collectionConfig.minDistanceMeters,
    maxPerSequence: collectionConfig.maxPerSequence
  });
  const outputLocations = collectionConfig.targetPlayableCount ? deduped.locations.slice(0, collectionConfig.targetPlayableCount) : deduped.locations;
  const chunkFiles = await writeGeoChunks(outputLocations);
  const playableIndex = outputLocations.map(toIndexItem);
  const validation = validateGeoLocations(outputLocations);
  await writeJson(path.join(PUBLIC_DATA_DIR, "playable-index.json"), playableIndex);
  await writeJson(path.join(OUT_DIR, "indexes", "validation-report.json"), validation);
  await writeJson(path.join(OUT_DIR, "indexes", "stats.json"), {
    generatedAt: new Date().toISOString(),
    preset,
    queryMode: collectionConfig.queryMode,
    meshCount: meshes.length,
    completedMeshCount: checkpoint.completedMeshIds.length,
    candidateCount: allLocations.length,
    dedupe: deduped.stats,
    rawOutput: path.relative(process.cwd(), path.join(OUT_DIR, "raw")),
    playableCount: playableIndex.length,
    validation: {
      total: validation.total,
      valid: validation.valid,
      rejected: validation.rejected,
      warningCount: validation.warningCount,
      regionCounts: validation.regionCounts,
      prefectureCounts: validation.prefectureCounts,
      difficultyCounts: validation.difficultyCounts,
      qaStatusCounts: validation.qaStatusCounts,
      sourceCounts: validation.sourceCounts,
      chunkCounts: validation.chunkCounts,
      chunkFiles
    },
    output: path.relative(process.cwd(), PUBLIC_DATA_DIR),
    installedPublic: SHOULD_INSTALL_PUBLIC
  });

  if (SHOULD_INSTALL_PUBLIC) {
    const publicTarget = path.resolve("public/data/geo");
    await rm(publicTarget, { recursive: true, force: true });
    await cp(PUBLIC_DATA_DIR, publicTarget, { recursive: true });
    console.log(`installed public data: ${path.relative(process.cwd(), PUBLIC_DATA_DIR)} -> public/data/geo`);
  }

  console.log(`done preset=${preset} playable=${playableIndex.length} output=${path.relative(process.cwd(), PUBLIC_DATA_DIR)}`);
}

function createCollectionConfig(selectedPreset: string) {
  const bbox = selectedPreset === "tokyo-sample" ? TOKYO_SAMPLE_BBOX : JAPAN_BBOX;
  return {
    bbox,
    queryMode: selectedPreset === "tokyo-sample" ? "nearby-grid" : "bbox",
    step: getNumberEnv("MAPILLARY_MESH_STEP", selectedPreset === "tokyo-sample" ? 0.01 : 0.25),
    maxMeshes: getNumberEnv("MAPILLARY_MAX_MESHES", Number.POSITIVE_INFINITY),
    targetPlayableCount: getNumberEnv("MAPILLARY_TARGET_PLAYABLE", selectedPreset === "tokyo-sample" ? 100 : 0),
    apiLimit: getNumberEnv("MAPILLARY_API_LIMIT", selectedPreset === "tokyo-sample" ? 10 : 200),
    radiusMeters: getNumberEnv("MAPILLARY_RADIUS_METERS", 50),
    minDistanceMeters: getNumberEnv("MAPILLARY_MIN_DISTANCE_METERS", selectedPreset === "tokyo-sample" ? 10 : 300),
    maxPerSequence: getNumberEnv("MAPILLARY_MAX_PER_SEQUENCE", selectedPreset === "tokyo-sample" ? 3 : 1),
    retryCount: getNumberEnv("MAPILLARY_RETRY_COUNT", 3),
    sleepMs: getNumberEnv("MAPILLARY_SLEEP_MS", selectedPreset === "tokyo-sample" ? 100 : 250)
  };
}

function createMeshes(bbox: BBox, step: number) {
  const meshes: BBox[] = [];
  for (let south = bbox.south; south < bbox.north; south += step) {
    for (let west = bbox.west; west < bbox.east; west += step) {
      meshes.push({
        west,
        south,
        east: Math.min(west + step, bbox.east),
        north: Math.min(south + step, bbox.north)
      });
    }
  }
  return meshes;
}

function meshToId(mesh: BBox) {
  return `mesh-${mesh.west.toFixed(2)}-${mesh.south.toFixed(2)}-${mesh.east.toFixed(2)}-${mesh.north.toFixed(2)}`.replaceAll(".", "_");
}

async function fetchImages(mesh: BBox): Promise<RawMapillaryImage[]> {
  const baseParams = {
    access_token: token!,
    fields: FIELDS,
    limit: String(collectionConfig.apiLimit)
  };
  const center = bboxCenter(mesh);
  const params =
    collectionConfig.queryMode === "nearby-grid"
      ? new URLSearchParams({
          ...baseParams,
          lat: String(center.lat),
          lng: String(center.lng),
          radius: String(collectionConfig.radiusMeters)
        })
      : new URLSearchParams({
          ...baseParams,
          bbox: `${mesh.west},${mesh.south},${mesh.east},${mesh.north}`
        });
  const url = `https://graph.mapillary.com/images?${params}`;
  for (let attempt = 1; attempt <= collectionConfig.retryCount; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) {
      const body = (await response.json()) as { data?: RawMapillaryImage[] };
      return body.data ?? [];
    }

    const errorText = await response.text();
    if (!isRetryableStatus(response.status)) {
      throw new Error(`Mapillary request failed: ${response.status} ${errorText}`);
    }

    console.warn(`retryable Mapillary error: status=${response.status} attempt=${attempt}/${collectionConfig.retryCount}`);
    await sleep(collectionConfig.sleepMs * attempt);
  }

  console.warn(`skipped mesh after retry: ${meshToId(mesh)}`);
  return [];
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function bboxCenter(mesh: BBox) {
  return {
    lat: (mesh.south + mesh.north) / 2,
    lng: (mesh.west + mesh.east) / 2
  };
}

function toLocation(chunkId: string): (image: RawMapillaryImage) => GeoLocation | null {
  return (image: RawMapillaryImage) => {
    const point = image.computed_geometry ?? image.geometry;
    if (!point || point.type !== "Point") return null;
    const [lng, lat] = point.coordinates;
    if (!isPointInJapan(lat, lng)) return null;
    const heading = image.computed_compass_angle ?? image.compass_angle;
    const region = assignJapanRegion(lat, lng);
    const sequenceId = image.sequence ?? image.sequence_id;
    const location: GeoLocation = {
      id: image.id,
      provider: "mapillary",
      mapillaryImageId: image.id,
      lat,
      lng,
      chunkId,
      difficulty: "normal" as const,
      tags: ["mapillary", image.camera_type, sequenceId ? `sequence:${sequenceId}` : undefined].filter((tag): tag is string => Boolean(tag)),
      enabled: true,
      qaStatus: "unreviewed" as const,
      source: "generated" as const
    };
    if (heading !== undefined) location.heading = heading;
    if (region.region) location.region = region.region;
    if (region.prefecture) location.prefecture = region.prefecture;
    return location;
  };
}

function toIndexItem(location: GeoLocation): GeoLocationIndexItem {
  return {
    id: location.id,
    lat: location.lat,
    lng: location.lng,
    prefecture: location.prefecture,
    region: location.region,
    difficulty: location.difficulty,
    tags: location.tags,
    chunkId: location.chunkId
  };
}

function loadLocalEnv() {
  [".env.local", ".env"].forEach((fileName) => {
    const filePath = path.resolve(fileName);
    if (!existsSync(filePath)) return;
    const content = readFileSync(filePath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) return;
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    });
  });
}

function getArgValue(name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function getNumberEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function loadCheckpoint(filePath: string): Promise<{ completedMeshIds: string[]; updatedAt?: string }> {
  if (!existsSync(filePath)) return { completedMeshIds: [] };
  return JSON.parse(await readFile(filePath, "utf-8")) as { completedMeshIds: string[]; updatedAt?: string };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function writeGeoChunks(locations: GeoLocation[]) {
  const byChunk = new Map<string, GeoLocation[]>();
  locations.forEach((location) => {
    const chunk = byChunk.get(location.chunkId) ?? [];
    chunk.push(location);
    byChunk.set(location.chunkId, chunk);
  });

  const files: Array<{ chunkId: string; count: number; bytes: number }> = [];
  for (const [chunkId, chunkLocations] of byChunk) {
    const filePath = path.join(PUBLIC_DATA_DIR, "chunks", `${chunkId}.json`);
    await writeJson(filePath, chunkLocations);
    files.push({ chunkId, count: chunkLocations.length, bytes: (await stat(filePath)).size });
  }
  return {
    count: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    averageBytes: files.length ? Math.round(files.reduce((sum, file) => sum + file.bytes, 0) / files.length) : 0,
    files
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
