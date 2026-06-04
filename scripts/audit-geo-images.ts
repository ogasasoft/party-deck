import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadGeoLocationsFromDir } from "./geo-quality";

type Args = {
  dataDir: string;
  outputPath: string;
  limit: number;
  concurrency: number;
};

type AuditResult = {
  id: string;
  mapillaryImageId: string;
  status: "ready" | "fallback" | "http-error" | "missing-image-url" | "invalid-response" | "network-error";
  httpStatus?: number;
  message?: string;
};

const MAPILLARY_IMAGE_FIELDS = ["id", "thumb_2048_url", "thumb_1024_url", "thumb_256_url", "thumb_original_url", "computed_geometry", "geometry"].join(",");

const args = parseArgs(process.argv.slice(2));
const accessToken = await getMapillaryAccessToken();

if (!accessToken) {
  console.error("MAPILLARY_ACCESS_TOKEN or VITE_MAPILLARY_ACCESS_TOKEN is required. Set it in the environment or .env.local.");
  process.exit(1);
}

const locations = (await loadGeoLocationsFromDir(args.dataDir))
  .filter((location) => location.enabled && location.qaStatus !== "rejected")
  .filter((location) => !location.mapillaryImageId.startsWith("fallback-"))
  .slice(0, args.limit);

const results = await runWithConcurrency(locations, args.concurrency, async (location) => {
  try {
    const response = await fetch(createMapillaryImageEndpoint(location.mapillaryImageId, accessToken), { cache: "no-cache" });
    const data = (await response.json()) as {
      id?: string;
      thumb_2048_url?: string;
      thumb_1024_url?: string;
      thumb_256_url?: string;
      thumb_original_url?: string;
      computed_geometry?: { type?: string };
      geometry?: { type?: string };
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        id: location.id,
        mapillaryImageId: location.mapillaryImageId,
        status: "http-error" as const,
        httpStatus: response.status,
        message: data.error?.message
      };
    }

    const imageUrl = data.thumb_2048_url ?? data.thumb_1024_url ?? data.thumb_original_url ?? data.thumb_256_url;
    const point = data.computed_geometry ?? data.geometry;
    if (!data.id || !point || point.type !== "Point") {
      return {
        id: location.id,
        mapillaryImageId: location.mapillaryImageId,
        status: "invalid-response" as const
      };
    }
    if (!imageUrl) {
      return {
        id: location.id,
        mapillaryImageId: location.mapillaryImageId,
        status: "missing-image-url" as const
      };
    }

    return {
      id: location.id,
      mapillaryImageId: location.mapillaryImageId,
      status: "ready" as const
    };
  } catch (error) {
    return {
      id: location.id,
      mapillaryImageId: location.mapillaryImageId,
      status: "network-error" as const,
      message: error instanceof Error ? error.message : String(error)
    };
  }
});

const failed = results.filter((result) => result.status !== "ready");
const report = {
  generatedAt: new Date().toISOString(),
  dataDir: path.relative(process.cwd(), args.dataDir),
  checked: results.length,
  ready: results.length - failed.length,
  failed: failed.length,
  failureRate: results.length ? failed.length / results.length : 0,
  statusCounts: countBy(results, (result) => result.status),
  failedResults: failed,
  results
};

await mkdir(path.dirname(args.outputPath), { recursive: true });
await writeFile(args.outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      dataDir: report.dataDir,
      outputPath: path.relative(process.cwd(), args.outputPath),
      checked: report.checked,
      ready: report.ready,
      failed: report.failed,
      failureRate: Number(report.failureRate.toFixed(4)),
      statusCounts: report.statusCounts,
      failedIds: failed.map((result) => result.id)
    },
    null,
    2
  )
);

function parseArgs(argv: string[]): Args {
  return {
    dataDir: path.resolve(readOption(argv, "--data-dir") ?? "public/data/geo"),
    outputPath: path.resolve(readOption(argv, "--output") ?? "data-generated/mapillary/image-audit-report.json"),
    limit: Number(readOption(argv, "--limit") ?? 500),
    concurrency: Math.max(1, Number(readOption(argv, "--concurrency") ?? 4))
  };
}

function readOption(argv: string[], name: string) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

async function getMapillaryAccessToken() {
  const fromEnv = process.env.MAPILLARY_ACCESS_TOKEN?.trim() || process.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  return (await readEnvValue(".env.local", "MAPILLARY_ACCESS_TOKEN")) ?? (await readEnvValue(".env.local", "VITE_MAPILLARY_ACCESS_TOKEN")) ?? "";
}

async function readEnvValue(filePath: string, key: string) {
  try {
    const content = await readFile(path.resolve(filePath), "utf-8");
    const line = content
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${key}=`));
    if (!line) return "";
    return line.slice(key.length + 1).replace(/^["']|["']$/g, "").trim();
  } catch {
    return "";
  }
}

function createMapillaryImageEndpoint(imageId: string, accessToken: string) {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: MAPILLARY_IMAGE_FIELDS
  });
  return `https://graph.mapillary.com/${encodeURIComponent(imageId)}?${params.toString()}`;
}

async function runWithConcurrency<T, R>(items: T[], concurrency: number, worker: (item: T) => Promise<R>) {
  const results: R[] = [];
  let index = 0;
  async function runNext() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runNext));
  return results;
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
