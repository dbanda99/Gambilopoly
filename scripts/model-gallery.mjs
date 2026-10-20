import { openSetup } from "./open-setup.mjs";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
try {
  await page.goto("http://localhost:5173");
  await openSetup(page);
  const result = await page.evaluate(async () => {
    const [T, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("/node_modules/three/build/three.module.js"),
      import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js"),
      import("/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    document.body.replaceChildren();
    document.body.style.cssText = "margin:0;background:#25212d";
    const renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(1400, 900);
    renderer.setPixelRatio(1);
    document.body.appendChild(renderer.domElement);
    const scene = new T.Scene();
    scene.background = new T.Color("#25212d");
    scene.add(new T.AmbientLight(0xffffff, 1.8));
    const light = new T.DirectionalLight(0xffffff, 2.3);
    light.position.set(5, 8, 10);
    scene.add(light);
    const camera = new T.PerspectiveCamera(35, 1400 / 900, 0.1, 100);
    camera.position.set(0, 1.8, 13.8);
    camera.lookAt(0, 0, 0);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
      files = [
        "jack-olantern",
        "boo",
        "vex",
        "hexie",
        "rattle",
        "sparks",
        "warps",
      ],
      results = [];
    for (let i = 0; i < files.length; i++) {
      const gltf = await loader.loadAsync(`/assets/players/${files[i]}.glb`),
        box = new T.Box3().setFromObject(gltf.scene),
        size = box.getSize(new T.Vector3()),
        center = box.getCenter(new T.Vector3());
      const s = 2 / Math.max(size.x, size.y, size.z),
        group = new T.Group();
      group.add(gltf.scene);
      gltf.scene.position.sub(center);
      group.scale.setScalar(s);
      group.position.set(
        (i < 4 ? i - 1.5 : i - 5) * 3.0,
        i < 4 ? 1.5 : -1.6,
        0,
      );
      scene.add(group);
      results.push({ name: files[i], size: size.toArray() });
      const label = document.createElement("span");
      label.textContent = files[i];
      label.style.cssText = `position:absolute;color:#f0e9d6;font:16px sans-serif;left:${i < 4 ? 12.5 + i * 25 : 28.5 + (i - 4) * 22}%;top:${i < 4 ? 43 : 85}%;transform:translateX(-50%)`;
      document.body.appendChild(label);
    }
    renderer.render(scene, camera);
    return results;
  });
  await page.screenshot({ path: "test-results/model-gallery.png" });
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
