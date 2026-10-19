import { useMemo } from "react";
import { CanvasTexture } from "three";
import { boardPosition } from "../engine/boardData";
import type { BoardSpace } from "../engine/types";
export default function BoardTile({
  space,
  ownerColor,
  onSelect,
}: {
  space: BoardSpace;
  ownerColor?: string;
  onSelect: () => void;
}) {
  const [x, z] = boardPosition(space.id);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const c = canvas.getContext("2d")!;
    c.fillStyle = space.type === "corner" ? "#c6bd9c" : "#ded5b8";
    c.fillRect(0, 0, 256, 256);
    if (space.color) {
      c.fillStyle = space.color;
      c.fillRect(0, 0, 256, 48);
    }
    c.fillStyle = "#36342b";
    c.textAlign = "center";
    c.font = "bold 25px Georgia";
    const words = space.name.split(" ");
    words.forEach((w, i) => c.fillText(w, 128, 94 + i * 30));
    c.font = "22px sans-serif";
    c.fillText(
      space.price
        ? `$${space.price}`
        : space.id === 0
          ? "+ $200"
          : space.type === "chance"
            ? "?"
            : space.type === "community"
              ? "✦"
              : space.type === "tax"
                ? `− $${space.amount}`
                : "",
      128,
      218,
    );
    return new CanvasTexture(canvas);
  }, [space]);
  const rotation =
    space.id <= 10
      ? 0
      : space.id <= 20
        ? Math.PI / 2
        : space.id <= 30
          ? Math.PI
          : -Math.PI / 2;
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <boxGeometry args={[0.96, 0.16, 0.96]} />
        <meshStandardMaterial color={ownerColor ?? "#585d45"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.085, 0]}>
        <planeGeometry args={[0.92, 0.92]} />
        <meshBasicMaterial map={texture} />
      </mesh>
      {ownerColor && (
        <mesh position={[0, 0.11, 0.39]}>
          <boxGeometry args={[0.8, 0.035, 0.07]} />
          <meshBasicMaterial color={ownerColor} />
        </mesh>
      )}
    </group>
  );
}
