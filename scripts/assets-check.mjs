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
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("response", (response) => {
  if (response.status() >= 400)
    errors.push(`${response.status()} ${response.url()}`);
});
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
try {
  await page.goto("http://localhost:5173");
  await page.getByRole("button", { name: "4 players", exact: true }).click();
  for (const [player, token] of [
    [1, "Rattle"],
    [2, "Sparks"],
    [3, "Warps"],
  ])
    await page
      .getByRole("button", { name: `Player ${player}: ${token}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Enter the neighborhood" }).click();
  await page.getByRole("region", { name: "Starting order" }).waitFor();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gambilopoly-local-v1")),
  );
  assert(
    new Set(saved.state.players.map((p) => p.token)).size === 4,
    "Extra character selection lost unique tokens",
  );
  // Validate every delivered mesh using the browser's real Three.js loader/decoder.
  const decoded = await page.evaluate(async () => {
    const [{ GLTFLoader }, { MeshoptDecoder }, { Box3, Vector3 }] =
      await Promise.all([
        import("/node_modules/three/examples/jsm/loaders/GLTFLoader.js"),
        import("/node_modules/three/examples/jsm/libs/meshopt_decoder.module.js"),
        import("/node_modules/three/build/three.module.js"),
      ]);
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),
      results = [];
    for (const file of [
      "boo",
      "hexie",
      "jack-olantern",
      "rattle",
      "sparks",
      "vex",
      "warps",
    ]) {
      const gltf = await loader.loadAsync(`/assets/players/${file}.glb`);
      let vertices = 0;
      gltf.scene.traverse((object) => {
        if (object.isMesh)
          vertices += object.geometry.attributes.position.count;
      });
      const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
      results.push({ file, vertices, size: size.toArray() });
      gltf.scene.traverse((object) => {
        if (object.isMesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          for (const material of materials) {
            for (const value of Object.values(material))
              if (value?.isTexture) value.dispose();
            material.dispose();
          }
        }
      });
    }
    return results;
  });
  assert(
    decoded.length === 7 &&
      decoded.every(
        (model) =>
          model.vertices > 0 &&
          model.size.every((n) => Number.isFinite(n) && n > 0),
      ),
    "A model did not decode into valid geometry",
  );
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("gambilopoly-local-v1"));
    save.state.opening = null;
    save.state.phase = "roll";
    save.state.dice = null;
    localStorage.setItem("gambilopoly-local-v1", JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole("button", { name: "Resume saved local game" }).click();
  await page
    .getByRole("button", { name: "Roll the dice", exact: true })
    .waitFor();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/assets-board-25d.png" });
  await page.getByRole("button", { name: "Top view", exact: true }).click();
  await page.screenshot({ path: "test-results/assets-board-top.png" });
  // Camera close-up with the new models, without mutating the real opening rules.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("gambilopoly-local-v1"));
    save.state.phase = "opening";
    save.state.opening = {
      stage: "introductions",
      spotlightIndex: 0,
      round: 1,
      candidateIds: save.state.players.map((p) => p.id),
      rolls: {},
      history: [],
      winnerId: null,
    };
    localStorage.setItem("gambilopoly-local-v1", JSON.stringify(save));
  });
  await page.reload();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Resume saved local game" }).click();
  await page.waitForTimeout(1100);
  await page.screenshot({ path: "test-results/assets-model-closeup.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Match options", exact: true })
    .click();
  await page.getByRole("button", { name: "Set up a new game" }).click();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Seven-character picker overflows on mobile",
  );
  await page.screenshot({
    path: "test-results/assets-mobile-picker.png",
    fullPage: true,
  });
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "PASS: all seven optimized GLBs decode, extended character selection stays unique, board/corner/center textures render, close-up and mobile picker.",
  );
  console.log(JSON.stringify(decoded));
} finally {
  await browser.close();
}
