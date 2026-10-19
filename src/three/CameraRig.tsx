import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";

// Fit the board into the space between the HUD overlays, including on rotation.
export default function CameraRig({ topDown }: { topDown: boolean }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const c = camera as PerspectiveCamera;
    const portrait = size.height > size.width;
    const availableWidth = portrait
      ? size.width - 20
      : size.width - (size.height < 540 ? 200 : 280);
    const availableHeight = portrait
      ? size.height - 380
      : size.height - (size.height < 540 ? 105 : 190);
    const widthFraction = Math.max(0.35, availableWidth / size.width);
    const heightFraction = Math.max(0.25, availableHeight / size.height);
    const tangent = Math.tan((c.fov * Math.PI) / 360);
    const distance = Math.max(
      6.1 / (tangent * c.aspect * widthFraction),
      6.1 / (tangent * heightFraction),
    );
    const direction = topDown
      ? new Vector3(0, 1, 0.001)
      : new Vector3(0.13, 1, 0.58).normalize();
    c.position.copy(direction.multiplyScalar(distance));
    c.lookAt(0, 0, 0);
    // Shift the board away from the right-hand player badges or the portrait HUD.
    const offsetX = portrait ? 0 : size.height < 540 ? -40 : -65;
    const offsetY = portrait ? -6 : -35;
    c.setViewOffset(
      size.width,
      size.height,
      -offsetX,
      -offsetY,
      size.width,
      size.height,
    );
    c.updateProjectionMatrix();
  }, [camera, size.width, size.height, topDown]);
  return null;
}
