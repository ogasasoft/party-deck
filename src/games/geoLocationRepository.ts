import { fallbackGeoLocations } from "../data/geoLocations";
import { GeoLocation, GeoLocationIndexItem } from "./geoGuessr";

const INDEX_URL = "/data/geo/playable-index.json";

export async function loadPlayableGeoLocations(limit = 500): Promise<GeoLocation[]> {
  try {
    const indexResponse = await fetch(INDEX_URL, { cache: "no-cache" });
    if (!indexResponse.ok) return fallbackGeoLocations;

    const index = (await indexResponse.json()) as GeoLocationIndexItem[];
    if (!Array.isArray(index) || index.length === 0) return fallbackGeoLocations;

    const selected = index.slice(0, limit);
    const chunkIds = [...new Set(selected.map((item) => item.chunkId))];
    const chunkResults = await Promise.all(chunkIds.map(loadChunk));
    const byId = new Map(chunkResults.flat().map((location) => [location.id, location]));
    const locations = selected.map((item) => byId.get(item.id)).filter((item): item is GeoLocation => Boolean(item));
    return locations.length ? locations : fallbackGeoLocations;
  } catch {
    return fallbackGeoLocations;
  }
}

async function loadChunk(chunkId: string): Promise<GeoLocation[]> {
  const response = await fetch(`/data/geo/chunks/${chunkId}.json`, { cache: "no-cache" });
  if (!response.ok) return [];
  const data = (await response.json()) as GeoLocation[];
  return Array.isArray(data) ? data : [];
}
