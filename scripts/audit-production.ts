type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

export {};

const args = new Map<string, string>();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const [key, inlineValue] = arg.slice(2).split("=");
  const value = inlineValue ?? process.argv[index + 1];
  if (inlineValue === undefined) index += 1;
  args.set(key, value);
}

const baseUrl = new URL(args.get("base") ?? "https://party-deck.vercel.app");
const requireAds = args.has("require-ads");
const checks: CheckResult[] = [];

function urlFor(path: string) {
  return new URL(path, baseUrl).toString();
}

async function fetchText(path: string) {
  try {
    const response = await fetch(urlFor(path), { redirect: "follow" });
    const text = await response.text();
    checks.push({
      name: `${path} status`,
      ok: response.ok,
      detail: `${response.status} ${response.statusText}`
    });
    return { response, text };
  } catch (error) {
    checks.push({
      name: `${path} status`,
      ok: false,
      detail: error instanceof Error ? error.message : String(error)
    });
    return { response: null, text: "" };
  }
}

function check(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
}

const root = await fetchText("/");
check("root html shell", root.text.includes('<div id="root"></div>'));

const assetPaths = [...root.text.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g)].map((match) => match[1]);
check("root references built assets", assetPaths.length > 0, `${assetPaths.length} assets`);

const bundleTexts: string[] = [];
for (const assetPath of assetPaths.filter((path) => path.endsWith(".js"))) {
  const asset = await fetchText(assetPath);
  bundleTexts.push(asset.text);
}
const bundle = bundleTexts.join("\n");
check("bundle excludes archived geo game", !bundle.includes("日本マップ当て") && !bundle.includes("Mapillary"));
check("bundle links privacy page", bundle.includes("privacy.html"));
check("bundle links terms page", bundle.includes("terms.html"));
if (requireAds) {
  check("adsense client configured in production bundle", /ca-pub-\d{8,}/.test(bundle));
  check("adsense slot configured in production bundle", /data-ad-slot/.test(bundle) && /[\"']\d{6,}[\"']/.test(bundle));
}

const privacy = await fetchText("/privacy.html");
check("privacy content", privacy.text.includes("プライバシーポリシー") && privacy.text.includes("localStorage"));

const terms = await fetchText("/terms.html");
check("terms content", terms.text.includes("利用規約") && terms.text.includes("飲酒の強要"));

try {
  const archivedGeoData = await fetch(urlFor("/data/geo/playable-index.json"), { redirect: "follow" });
  const contentType = archivedGeoData.headers.get("content-type") ?? "";
  const geoDataIsUnavailable = archivedGeoData.status === 404 || !contentType.includes("application/json");
  check("archived geo data is not public", geoDataIsUnavailable, `${archivedGeoData.status} ${archivedGeoData.statusText} ${contentType}`);
} catch (error) {
  check("archived geo data is not public", false, error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((item) => !item.ok);
const report = {
  baseUrl: baseUrl.toString(),
  checkedAt: new Date().toISOString(),
  ok: failed.length === 0,
  checks
};

console.log(JSON.stringify(report, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}
