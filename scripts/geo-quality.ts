import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { distanceMeters } from "../src/core/distance";
import type { GeoLocation } from "../src/games/geoGuessr";

export type BBox = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type RegionAssignment = {
  region?: string;
  prefecture?: string;
};

type PrefectureBoundary = BBox &
  Required<RegionAssignment> & {
    note?: string;
  };

export type GeoValidationIssue = {
  id: string;
  severity: "error" | "warning";
  code: string;
  message: string;
};

export type GeoValidationSummary = {
  total: number;
  valid: number;
  rejected: number;
  warningCount: number;
  regionCounts: Record<string, number>;
  prefectureCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  qaStatusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  chunkCounts: Record<string, number>;
  issues: GeoValidationIssue[];
};

type Polygon = Array<[lng: number, lat: number]>;

const JAPAN_POLYGONS: Polygon[] = [
  [
    [139.2, 41.1],
    [141.2, 41.2],
    [145.9, 43.2],
    [145.8, 45.6],
    [142.0, 45.8],
    [139.0, 44.4],
    [139.0, 42.0]
  ],
  [
    [130.7, 30.8],
    [132.0, 32.7],
    [134.2, 33.2],
    [136.2, 34.2],
    [138.9, 34.2],
    [141.2, 35.4],
    [142.3, 39.0],
    [141.3, 41.7],
    [139.2, 41.4],
    [136.4, 38.0],
    [134.6, 35.8],
    [131.8, 34.9],
    [129.2, 33.4],
    [129.0, 32.0]
  ],
  [
    [132.0, 32.6],
    [134.8, 33.0],
    [134.9, 34.6],
    [132.0, 34.6],
    [130.8, 33.6]
  ],
  [
    [129.2, 31.0],
    [131.6, 31.2],
    [132.2, 33.6],
    [129.2, 34.2],
    [128.7, 32.0]
  ],
  [
    [127.2, 25.6],
    [128.4, 25.7],
    [128.6, 27.0],
    [127.4, 27.2],
    [126.8, 26.3]
  ],
  [
    [123.4, 24.0],
    [125.7, 24.0],
    [125.7, 25.2],
    [123.4, 25.2]
  ],
  [
    [138.7, 32.8],
    [140.1, 32.8],
    [140.1, 35.1],
    [138.7, 35.1]
  ],
  [
    [141.1, 24.0],
    [142.5, 24.0],
    [142.5, 27.8],
    [141.1, 27.8]
  ],
  [
    [128.6, 27.0],
    [130.4, 27.0],
    [130.4, 30.9],
    [128.6, 30.9]
  ]
];

const REGION_BOXES: Array<BBox & RegionAssignment> = [
  { region: "北海道", west: 139.0, south: 41.0, east: 146.1, north: 45.8 },
  { region: "東北", west: 139.0, south: 36.7, east: 142.2, north: 41.7 },
  { region: "関東", west: 138.4, south: 34.8, east: 141.2, north: 37.2 },
  { region: "中部", west: 136.0, south: 34.4, east: 139.4, north: 38.8 },
  { region: "関西", west: 134.2, south: 33.4, east: 136.5, north: 35.8 },
  { region: "中国", west: 130.8, south: 33.4, east: 134.8, north: 35.8 },
  { region: "四国", west: 132.0, south: 32.6, east: 134.9, north: 34.6 },
  { region: "九州", west: 128.7, south: 30.8, east: 132.3, north: 34.3 },
  { region: "沖縄", west: 122.9, south: 24.0, east: 128.8, north: 27.7 }
];

const PREFECTURE_BOXES: PrefectureBoundary[] = [
  { prefecture: "北海道", region: "北海道", west: 139.2, south: 41.2, east: 145.9, north: 45.6 },
  { prefecture: "青森県", region: "東北", west: 139.4, south: 40.2, east: 141.8, north: 41.6 },
  { prefecture: "岩手県", region: "東北", west: 140.6, south: 38.7, east: 142.1, north: 40.5 },
  { prefecture: "宮城県", region: "東北", west: 140.3, south: 37.7, east: 141.7, north: 39.1 },
  { prefecture: "秋田県", region: "東北", west: 139.6, south: 38.8, east: 140.9, north: 40.5 },
  { prefecture: "山形県", region: "東北", west: 139.5, south: 37.7, east: 140.7, north: 39.3 },
  { prefecture: "福島県", region: "東北", west: 139.1, south: 36.8, east: 141.1, north: 38.0 },
  { prefecture: "茨城県", region: "関東", west: 139.6, south: 35.7, east: 140.9, north: 36.95 },
  { prefecture: "栃木県", region: "関東", west: 139.3, south: 36.2, east: 140.4, north: 37.2 },
  { prefecture: "群馬県", region: "関東", west: 138.4, south: 35.95, east: 139.7, north: 37.1 },
  { prefecture: "埼玉県", region: "関東", west: 138.7, south: 35.7, east: 139.9, north: 36.3 },
  { prefecture: "千葉県", region: "関東", west: 139.7, south: 34.8, east: 140.9, north: 36.2 },
  { prefecture: "東京都", region: "関東", west: 139.0, south: 35.45, east: 140.0, north: 35.95 },
  { prefecture: "東京都", region: "関東", west: 138.7, south: 32.8, east: 140.1, north: 35.1, note: "islands" },
  { prefecture: "東京都", region: "関東", west: 141.1, south: 24.0, east: 142.5, north: 27.8, note: "ogasawara" },
  { prefecture: "神奈川県", region: "関東", west: 138.9, south: 35.1, east: 139.85, north: 35.7 },
  { prefecture: "新潟県", region: "中部", west: 137.6, south: 36.7, east: 139.9, north: 38.6 },
  { prefecture: "富山県", region: "中部", west: 136.7, south: 36.25, east: 137.8, north: 37.0 },
  { prefecture: "石川県", region: "中部", west: 136.2, south: 36.0, east: 137.4, north: 37.9 },
  { prefecture: "福井県", region: "中部", west: 135.4, south: 35.3, east: 136.9, north: 36.3 },
  { prefecture: "山梨県", region: "中部", west: 138.1, south: 35.15, east: 139.15, north: 35.95 },
  { prefecture: "長野県", region: "中部", west: 137.3, south: 35.2, east: 139.0, north: 37.1 },
  { prefecture: "岐阜県", region: "中部", west: 136.2, south: 35.1, east: 137.7, north: 36.5 },
  { prefecture: "静岡県", region: "中部", west: 137.4, south: 34.55, east: 139.2, north: 35.65 },
  { prefecture: "愛知県", region: "中部", west: 136.7, south: 34.55, east: 137.85, north: 35.45 },
  { prefecture: "三重県", region: "関西", west: 135.8, south: 33.7, east: 136.95, north: 35.3 },
  { prefecture: "滋賀県", region: "関西", west: 135.8, south: 34.75, east: 136.45, north: 35.75 },
  { prefecture: "京都府", region: "関西", west: 134.8, south: 34.65, east: 136.1, north: 35.8 },
  { prefecture: "大阪府", region: "関西", west: 135.0, south: 34.25, east: 135.75, north: 35.05 },
  { prefecture: "兵庫県", region: "関西", west: 134.2, south: 34.15, east: 135.55, north: 35.75 },
  { prefecture: "奈良県", region: "関西", west: 135.5, south: 33.85, east: 136.25, north: 34.8 },
  { prefecture: "和歌山県", region: "関西", west: 135.0, south: 33.4, east: 136.05, north: 34.45 },
  { prefecture: "鳥取県", region: "中国", west: 133.1, south: 35.05, east: 134.55, north: 35.65 },
  { prefecture: "島根県", region: "中国", west: 131.6, south: 34.25, east: 133.4, north: 35.7 },
  { prefecture: "岡山県", region: "中国", west: 133.2, south: 34.3, east: 134.4, north: 35.4 },
  { prefecture: "広島県", region: "中国", west: 132.0, south: 34.0, east: 133.5, north: 35.1 },
  { prefecture: "山口県", region: "中国", west: 130.75, south: 33.7, east: 132.55, north: 34.8 },
  { prefecture: "徳島県", region: "四国", west: 133.5, south: 33.5, east: 134.8, north: 34.3 },
  { prefecture: "香川県", region: "四国", west: 133.4, south: 34.0, east: 134.45, north: 34.65 },
  { prefecture: "愛媛県", region: "四国", west: 132.0, south: 32.85, east: 133.7, north: 34.35 },
  { prefecture: "高知県", region: "四国", west: 132.5, south: 32.7, east: 134.4, north: 33.9 },
  { prefecture: "福岡県", region: "九州", west: 130.0, south: 33.0, east: 131.2, north: 34.3 },
  { prefecture: "佐賀県", region: "九州", west: 129.7, south: 32.9, east: 130.38, north: 33.7 },
  { prefecture: "長崎県", region: "九州", west: 128.0, south: 31.9, east: 130.4, north: 34.8 },
  { prefecture: "熊本県", region: "九州", west: 129.9, south: 32.0, east: 131.4, north: 33.3 },
  { prefecture: "大分県", region: "九州", west: 130.8, south: 32.7, east: 132.1, north: 33.8 },
  { prefecture: "宮崎県", region: "九州", west: 130.7, south: 31.3, east: 131.9, north: 32.9 },
  { prefecture: "鹿児島県", region: "九州", west: 129.4, south: 27.0, east: 131.3, north: 32.3 },
  { prefecture: "沖縄県", region: "沖縄", west: 122.9, south: 24.0, east: 128.8, north: 27.9 }
];

export function isPointInJapan(lat: number, lng: number) {
  return JAPAN_POLYGONS.some((polygon) => pointInPolygon([lng, lat], polygon));
}

export function assignJapanRegion(lat: number, lng: number): RegionAssignment {
  const prefecture = PREFECTURE_BOXES.filter((box) => isInBBox(lat, lng, box)).sort((a, b) => bboxArea(a) - bboxArea(b))[0];
  if (prefecture) return { region: prefecture.region, prefecture: prefecture.prefecture };
  const region = REGION_BOXES.find((box) => isInBBox(lat, lng, box));
  return region ? { region: region.region } : {};
}

export function dedupeGeoLocations(locations: GeoLocation[], options?: { minDistanceMeters?: number; maxPerSequence?: number }) {
  const minDistanceMeters = options?.minDistanceMeters ?? 300;
  const maxPerSequence = options?.maxPerSequence ?? 1;
  const byId = new Set<string>();
  const sequenceCounts = new Map<string, number>();
  const selected: GeoLocation[] = [];
  let duplicateIdCount = 0;
  let duplicateSequenceCount = 0;
  let nearDuplicateCount = 0;

  for (const location of locations) {
    if (byId.has(location.id)) {
      duplicateIdCount += 1;
      continue;
    }

    const sequenceTag = location.tags.find((tag) => tag.startsWith("sequence:"));
    if (sequenceTag) {
      const count = sequenceCounts.get(sequenceTag) ?? 0;
      if (count >= maxPerSequence) {
        duplicateSequenceCount += 1;
        continue;
      }
    }

    const hasNearDuplicate = selected.some((item) => distanceMeters(item, location) < minDistanceMeters);
    if (hasNearDuplicate) {
      nearDuplicateCount += 1;
      continue;
    }

    byId.add(location.id);
    if (sequenceTag) sequenceCounts.set(sequenceTag, (sequenceCounts.get(sequenceTag) ?? 0) + 1);
    selected.push(location);
  }

  return {
    locations: selected,
    stats: {
      inputCount: locations.length,
      outputCount: selected.length,
      duplicateIdCount,
      duplicateSequenceCount,
      nearDuplicateCount
    }
  };
}

export function validateGeoLocations(locations: GeoLocation[]): GeoValidationSummary {
  const issues: GeoValidationIssue[] = [];

  locations.forEach((location) => {
    if (!location.id) issues.push(issue(location.id, "error", "missing_id", "地点IDがありません。"));
    if (!location.mapillaryImageId) issues.push(issue(location.id, "error", "missing_mapillary_image_id", "Mapillary画像IDがありません。"));
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      issues.push(issue(location.id, "error", "invalid_coordinate", "緯度経度が不正です。"));
      return;
    }
    if (!isPointInJapan(location.lat, location.lng)) {
      issues.push(issue(location.id, "error", "outside_japan", "簡易日本ポリゴン外の地点です。"));
    }
    if (!location.enabled) issues.push(issue(location.id, "warning", "disabled", "無効化された地点です。"));
    if (location.qaStatus === "rejected") issues.push(issue(location.id, "warning", "rejected", "QAでrejectされた地点です。"));
    if (!location.tags.length) issues.push(issue(location.id, "warning", "missing_tags", "タグがありません。"));
    if (!location.region) issues.push(issue(location.id, "warning", "missing_region", "地域タグがありません。"));
    if (!location.prefecture) issues.push(issue(location.id, "warning", "missing_prefecture", "都道府県タグがありません。"));
  });

  const rejectedIds = new Set(issues.filter((item) => item.severity === "error").map((item) => item.id));

  return {
    total: locations.length,
    valid: locations.filter((location) => !rejectedIds.has(location.id)).length,
    rejected: rejectedIds.size,
    warningCount: issues.filter((item) => item.severity === "warning").length,
    regionCounts: countBy(locations, (location) => location.region ?? "unknown"),
    prefectureCounts: countBy(locations, (location) => location.prefecture ?? "unknown"),
    difficultyCounts: countBy(locations, (location) => location.difficulty),
    qaStatusCounts: countBy(locations, (location) => location.qaStatus),
    sourceCounts: countBy(locations, (location) => location.source),
    chunkCounts: countBy(locations, (location) => location.chunkId),
    issues: issues.slice(0, 200)
  };
}

export async function loadGeoLocationsFromDir(dataDir: string) {
  const chunkDir = path.join(dataDir, "chunks");
  const files = (await readdir(chunkDir)).filter((file) => file.endsWith(".json"));
  const chunks = await Promise.all(files.map((file) => readJson<GeoLocation[]>(path.join(chunkDir, file))));
  return chunks.flat();
}

export async function writeValidationReport(dataDir: string, outputPath: string) {
  const locations = await loadGeoLocationsFromDir(dataDir);
  const report = validateGeoLocations(locations);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

function pointInPolygon(point: [number, number], polygon: Polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isInBBox(lat: number, lng: number, bbox: BBox) {
  return lat >= bbox.south && lat <= bbox.north && lng >= bbox.west && lng <= bbox.east;
}

function bboxArea(bbox: BBox) {
  return (bbox.east - bbox.west) * (bbox.north - bbox.south);
}

function issue(id: string, severity: GeoValidationIssue["severity"], code: string, message: string): GeoValidationIssue {
  return { id: id || "unknown", severity, code, message };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}
