import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { boardPosition, TILE_DEPTH } from "../engine/boardData";
import { assetUrl } from "../utils/assetUrl";
function Building({ inn = false }: { inn?: boolean }) {
  const { scene } = useGLTF(
    assetUrl(`/assets/tabletop/${inn ? "inn" : "house"}.glb`),
  );
  const model = useMemo(() => {
    const object = clone(scene),
      box = new Box3().setFromObject(object),
      size = box.getSize(new Vector3()),
      center = box.getCenter(new Vector3()),
      scale = Math.min(
        (inn ? 0.7 : 0.31) / Math.max(size.x, size.z, 0.001),
        (inn ? 0.7 : 0.4) / Math.max(size.y, 0.001),
      );
    return {
      object,
      scale,
      position: [-center.x, -box.min.y, -center.z] as [number, number, number],
    };
  }, [scene, inn]);
  return (
    <group scale={model.scale} dispose={null}>
      <group position={model.position}>
        <primitive object={model.object} />
      </group>
    </group>
  );
}
export default function PropertyBuildings({
  id,
  count,
}: {
  id: number;
  count: number;
}) {
  const [x, z] = boardPosition(id),
    rotation =
      id <= 10 ? 0 : id <= 20 ? -Math.PI / 2 : id <= 30 ? Math.PI : Math.PI / 2;
  return (
    <group position={[x, 0.11, z]} rotation={[0, rotation, 0]}>
      <Suspense fallback={null}>
        {count === 5 ? (
          <group position={[0, 0, -TILE_DEPTH * 0.18]}>
            <Building inn />
          </group>
        ) : (
          Array.from({ length: count }, (_, i) => (
            <group
              key={i}
              position={[
                (i % 2 ? 1 : -1) * 0.18,
                0,
                -TILE_DEPTH * 0.24 + Math.floor(i / 2) * 0.36,
              ]}
            >
              <Building />
            </group>
          ))
        )}
      </Suspense>
    </group>
  );
}
