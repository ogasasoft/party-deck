import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GeoLocation, GeoLocationIndexItem } from "../src/games/geoGuessr";

type QaStatus = GeoLocation["qaStatus"];

type Args = {
  dataDir: string;
  ids: string[];
  status: QaStatus;
  enabled?: boolean;
  dryRun: boolean;
};

const args = parseArgs(process.argv.slice(2));
const chunkDir = path.join(args.dataDir, "chunks");
const chunkFiles = (await readdir(chunkDir)).filter((file) => file.endsWith(".json")).sort();
const idSet = new Set(args.ids);
const updates: Array<{ id: string; file: string; before: Pick<GeoLocation, "qaStatus" | "enabled">; after: Pick<GeoLocation, "qaStatus" | "enabled"> }> = [];
const chunks: Array<{ file: string; locations: GeoLocation[] }> = [];

for (const file of chunkFiles) {
  const filePath = path.join(chunkDir, file);
  const locations = await readJson<GeoLocation[]>(filePath);
  let changed = false;

  const nextLocations = locations.map((location) => {
    if (!idSet.has(location.id)) return location;
    changed = true;
    const nextLocation: GeoLocation = {
      ...location,
      qaStatus: args.status,
      enabled: args.enabled ?? location.enabled
    };
    updates.push({
      id: location.id,
      file,
      before: { qaStatus: location.qaStatus, enabled: location.enabled },
      after: { qaStatus: nextLocation.qaStatus, enabled: nextLocation.enabled }
    });
    return nextLocation;
  });

  chunks.push({ file, locations: nextLocations });
  if (changed && !args.dryRun) await writeJson(filePath, nextLocations);
}

const foundIds = new Set(updates.map((update) => update.id));
const missingIds = args.ids.filter((id) => !foundIds.has(id));
if (missingIds.length) {
  console.error(`missing location id: ${missingIds.join(", ")}`);
  process.exitCode = 1;
}

const playableIndex = rebuildPlayableIndex(chunks.flatMap((chunk) => chunk.locations));
if (!args.dryRun) await writeJson(path.join(args.dataDir, "playable-index.json"), playableIndex);

console.log(
  JSON.stringify(
    {
      dataDir: path.relative(process.cwd(), args.dataDir),
      dryRun: args.dryRun,
      updated: updates.length,
      missingIds,
      playableCount: playableIndex.length,
      updates
    },
    null,
    2
  )
);

function parseArgs(argv: string[]): Args {
  const dataDir = path.resolve(readOption(argv, "--data-dir") ?? "public/data/geo");
  const ids = readRepeatedOption(argv, "--id").flatMap((value) => value.split(",").map((item) => item.trim()).filter(Boolean));
  const status = readOption(argv, "--status") as QaStatus | undefined;
  const enabledValue = readOption(argv, "--enabled");
  const dryRun = argv.includes("--dry-run");

  if (!ids.length || !status || !["unreviewed", "approved", "rejected"].includes(status)) {
    console.error("Usage: npm run geo:qa -- --id <location-id>[,<location-id>] --status <unreviewed|approved|rejected> [--enabled true|false] [--data-dir public/data/geo] [--dry-run]");
    process.exit(1);
  }

  return {
    dataDir,
    ids,
    status,
    enabled: enabledValue === undefined ? undefined : enabledValue === "true",
    dryRun
  };
}

function readOption(argv: string[], name: string) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

function readRepeatedOption(argv: string[], name: string) {
  const values: string[] = [];
  argv.forEach((item, index) => {
    if (item === name && argv[index + 1]) values.push(argv[index + 1]);
  });
  return values;
}

function rebuildPlayableIndex(locations: GeoLocation[]): GeoLocationIndexItem[] {
  return locations
    .filter((location) => location.enabled && location.qaStatus !== "rejected")
    .map((location) => ({
      id: location.id,
      lat: location.lat,
      lng: location.lng,
      prefecture: location.prefecture,
      region: location.region,
      difficulty: location.difficulty,
      tags: location.tags,
      chunkId: location.chunkId
    }));
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
