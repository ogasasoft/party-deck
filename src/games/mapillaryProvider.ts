import type { GeoLocation } from "./geoGuessr";

const MAPILLARY_IMAGE_FIELDS = [
  "id",
  "thumb_2048_url",
  "thumb_1024_url",
  "thumb_256_url",
  "thumb_original_url",
  "computed_geometry",
  "geometry",
  "computed_compass_angle",
  "compass_angle",
  "captured_at",
  "camera_type",
  "height",
  "width"
].join(",");

type MapillaryPoint = {
  type: "Point";
  coordinates: [number, number];
};

type MapillaryImageResponse = {
  id?: string;
  thumb_2048_url?: string;
  thumb_1024_url?: string;
  thumb_256_url?: string;
  thumb_original_url?: string;
  computed_geometry?: MapillaryPoint;
  geometry?: MapillaryPoint;
  computed_compass_angle?: number;
  compass_angle?: number;
  captured_at?: string;
  camera_type?: string;
  height?: number;
  width?: number;
  error?: {
    message?: string;
  };
};

export type StreetImage = {
  provider: "mapillary";
  imageId: string;
  lat: number;
  lng: number;
  heading?: number;
  imageUrl: string;
  sourceUrl: string;
  attribution: string;
  capturedAt?: string;
  cameraType?: string;
  width?: number;
  height?: number;
};

export type StreetImageLoadResult =
  | { status: "ready"; image: StreetImage }
  | { status: "missing-token"; message: string; retryable: false }
  | { status: "fallback-location"; message: string; retryable: false }
  | { status: "not-found"; message: string; retryable: false }
  | { status: "network-error"; message: string; retryable: true }
  | { status: "invalid-response"; message: string; retryable: true };

export function getMapillaryAccessToken() {
  return import.meta.env.VITE_MAPILLARY_ACCESS_TOKEN?.trim() ?? "";
}

export async function loadMapillaryStreetImage(location: GeoLocation, accessToken = getMapillaryAccessToken()): Promise<StreetImageLoadResult> {
  if (location.mapillaryImageId.startsWith("fallback-")) {
    return {
      status: "fallback-location",
      message: "この地点の画像はまだ準備中です。別の地点で続行してください。",
      retryable: false
    };
  }

  if (!accessToken) {
    return {
      status: "missing-token",
      message: "Mapillary画像を表示するには VITE_MAPILLARY_ACCESS_TOKEN が必要です。",
      retryable: false
    };
  }

  try {
    const response = await fetch(createMapillaryImageEndpoint(location.mapillaryImageId, accessToken), { cache: "no-cache" });
    const data = (await response.json()) as MapillaryImageResponse;

    if (!response.ok) {
      return {
        status: "not-found",
        message: data.error?.message ?? `Mapillary画像を取得できませんでした (${response.status})。`,
        retryable: false
      };
    }

    const imageUrl = data.thumb_2048_url ?? data.thumb_1024_url ?? data.thumb_original_url ?? data.thumb_256_url;
    const point = data.computed_geometry ?? data.geometry;
    if (!data.id || !imageUrl || !point || point.type !== "Point") {
      return {
        status: "invalid-response",
        message: "Mapillary画像データの形式が不足しています。",
        retryable: true
      };
    }

    const [lng, lat] = point.coordinates;
    const heading = data.computed_compass_angle ?? data.compass_angle ?? location.heading;
    const image: StreetImage = {
      provider: "mapillary",
      imageId: data.id,
      lat,
      lng,
      imageUrl,
      sourceUrl: `https://www.mapillary.com/app/?pKey=${encodeURIComponent(data.id)}`,
      attribution: "Mapillary",
      capturedAt: data.captured_at,
      cameraType: data.camera_type,
      width: data.width,
      height: data.height
    };
    if (heading !== undefined) image.heading = heading;
    return { status: "ready", image };
  } catch {
    return {
      status: "network-error",
      message: "通信エラーでMapillary画像を取得できませんでした。",
      retryable: true
    };
  }
}

export function createMapillaryImageEndpoint(imageId: string, accessToken: string) {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: MAPILLARY_IMAGE_FIELDS
  });
  return `https://graph.mapillary.com/${encodeURIComponent(imageId)}?${params.toString()}`;
}
