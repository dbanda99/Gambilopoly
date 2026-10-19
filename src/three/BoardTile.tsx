import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { boardPosition, TILE_DEPTH, TILE_WIDTH } from "../engine/boardData";
import type { BoardSpace } from "../engine/types";
import { artworkFor, loadArtwork } from "./boardArtwork";

function labels(canvas: HTMLCanvasElement, space: BoardSpace) {
  const c = canvas.getContext("2d")!,
    width = canvas.width;
  c.textAlign = "center";
  c.fillStyle = "#f6efde";
  if (space.type === "corner") {
    c.fillStyle = "#17141bd9";
    c.fillRect(8, 451, width - 16, 53);
    c.fillStyle = "#f6efde";
    c.font = "bold 23px Georgia";
    c.fillText(
      space.id === 0 ? "Witching Hour · Collect $200" : space.name,
      width / 2,
      485,
      width - 30,
    );
    return;
  }
  const property = space.type === "property";
  c.font = `bold ${property ? 27 : 25}px Georgia`;
  const words = space.name.split(" "),
    lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width - 36 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  lines.push(line);
  const top = property ? 133 : 49;
  lines.forEach((text, i) =>
    c.fillText(text, width / 2, top + i * 33, width - 28),
  );
  c.font = "bold 27px sans-serif";
  c.fillText(
    space.price
      ? `$${space.price}`
      : space.type === "tax"
        ? `Pay $${space.amount}`
        : "Draw a card",
    width / 2,
    474,
    width - 24,
  );
}
export default function BoardTile({
  space,
  ownerColor,
  onSelect,
}: {
  space: BoardSpace;
  ownerColor?: string;
  onSelect: () => void;
}) {
  const [x, z] = boardPosition(space.id),
    corner = space.type === "corner";
  const { canvas, texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = corner ? 512 : 307;
    canvas.height = 512;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#3d3d3d";
    c.fillRect(0, 0, canvas.width, 512);
    labels(canvas, space);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, [space, corner]);
  useEffect(() => {
    let active = true;
    loadArtwork(artworkFor(space))
      .then((image) => {
        if (!active) return;
        canvas
          .getContext("2d")!
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        labels(canvas, space);
        texture.needsUpdate = true;
      })
      .catch(() => {
        /* Keep the labeled tile playable if an image cannot load. */
      });
    return () => {
      active = false;
    };
  }, [space, canvas, texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  const rotation =
    space.id <= 10
      ? 0
      : space.id <= 20
        ? -Math.PI / 2
        : space.id <= 30
          ? Math.PI
          : Math.PI / 2;
  const width = (corner ? TILE_DEPTH : TILE_WIDTH) - 0.015,
    depth = TILE_DEPTH - 0.015;
  const select = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect();
  };
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh onClick={select} receiveShadow>
        <boxGeometry args={[width, 0.16, depth]} />
        <meshStandardMaterial color={ownerColor ?? "#25232b"} />
      </mesh>
      <mesh
        onClick={select}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.085, 0]}
      >
        <planeGeometry args={[width - 0.01, depth - 0.01]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {ownerColor && (
        <mesh position={[0, 0.105, depth / 2 - 0.045]}>
          <boxGeometry args={[width - 0.05, 0.035, 0.06]} />
          <meshBasicMaterial color={ownerColor} />
        </mesh>
      )}
    </group>
  );
}
