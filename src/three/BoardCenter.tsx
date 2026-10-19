import { useEffect, useMemo } from "react";
import { Texture, SRGBColorSpace } from "three";
import { CENTER_SIZE } from "../engine/boardData";
import { CENTER_ART, loadArtwork } from "./boardArtwork";
export default function BoardCenter() {
  const texture = useMemo(() => {
    const t = new Texture();
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => {
    let active = true;
    loadArtwork(CENTER_ART)
      .then((image) => {
        if (!active) return;
        texture.image = image;
        texture.needsUpdate = true;
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[CENTER_SIZE - 0.01, CENTER_SIZE - 0.01]} />
      <meshBasicMaterial map={texture} color="#ffffff" />
    </mesh>
  );
}
