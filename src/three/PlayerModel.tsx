import { Component, Suspense, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Mesh, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Token } from "../engine/types";
import assets from "../generated/assets.json";

class ModelBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function LoadedModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  const prepared = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(scene),
      size = bounds.getSize(new Vector3()),
      center = bounds.getCenter(new Vector3());
    const scale = Math.min(
      0.66 / Math.max(size.y, 0.001),
      0.5 / Math.max(size.x, size.z, 0.001),
    );
    scene.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return {
      scene,
      scale,
      offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number],
    };
  }, [gltf.scene]);
  return (
    <group position={[0, -0.085, 0]} scale={prepared.scale} dispose={null}>
      <group position={prepared.offset}>
        <primitive object={prepared.scene} />
      </group>
    </group>
  );
}
export default function PlayerModel({
  token,
  fallback,
}: {
  token: Token;
  fallback: ReactNode;
}) {
  const url = assets.models[token];
  if (!url) return <>{fallback}</>;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedModel url={url} />
      </Suspense>
    </ModelBoundary>
  );
}
