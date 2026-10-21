import type { BoardSpace } from "../engine/types";
import { assetUrl } from "../utils/assetUrl";
const groups: Record<string, string> = {
  copper: "brown",
  ice: "light-blue",
  pink: "magneta",
  orange: "orange",
  red: "red",
  yellow: "yellow",
  green: "green",
  purple: "blue",
};
const corners: Record<number, string> = {
  0: "go",
  10: "prison",
  20: "free-parking",
  30: "go-to-prison",
};
export const CENTER_ART = assetUrl(
  "/assets/board/map-center/cemetery-background.webp",
);
export function artworkFor(space: BoardSpace): string {
  if (space.type === "corner")
    return assetUrl(`/assets/board/corners/${corners[space.id]}-corner.png`);
  const template =
    space.type === "property"
      ? `${groups[space.group!]}`
      : space.type === "railroad"
        ? "station"
        : space.type === "utility"
          ? space.id === 12
            ? "light-utility"
            : "water-utility"
          : space.type === "community"
            ? "community-chest"
            : space.type === "chance"
              ? "chance"
              : space.id === 4
                ? "income-tax"
                : "luxury-tax";
  return assetUrl(`/assets/board/properties/${template}-property.png`);
}
// All tiles using the same template share a single browser image request.
const images = new Map<string, Promise<HTMLImageElement>>();
export function loadArtwork(url: string): Promise<HTMLImageElement> {
  let result = images.get(url);
  if (!result) {
    result = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error(`Could not load board artwork: ${url}`));
      image.src = url;
    });
    images.set(url, result);
  }
  return result;
}
