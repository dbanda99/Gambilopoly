import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { NodeIO, Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  weld,
  simplify,
  dedup,
  prune,
  textureCompress,
  meshopt,
} from "@gltf-transform/functions";
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from "meshoptimizer";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import sharp from "sharp";
const out = "assets/tabletop";
mkdirSync(out, { recursive: true });
const manifestPath = `${out}/manifest.json`,
  manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : {};
await Promise.all([
  MeshoptEncoder.ready,
  MeshoptDecoder.ready,
  MeshoptSimplifier.ready,
]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
for (const [name, source] of [
  ["house", "3d-models/house/house.glb"],
  ["inn", "3d-models/hotel/inn.glb"],
]) {
  const dest = `${out}/${name}.glb`;
  if (!existsSync(source)) {
    if (!existsSync(dest)) throw new Error(`Missing ${source}`);
    continue;
  }
  const input = readFileSync(source),
    hash = createHash("sha256")
      .update(input)
      .update("tabletop-v1")
      .digest("hex");
  if (manifest[name]?.hash === hash && existsSync(dest)) continue;
  const doc = await io.readBinary(input);
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.06, error: 0.003 }),
    dedup(),
    prune(),
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [1024, 1024],
      quality: 85,
    }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );
  const bytes = await io.writeBinary(doc);
  writeFileSync(dest, bytes);
  manifest[name] = { hash, sourceBytes: input.length, webBytes: bytes.length };
  console.log(
    `${name}: ${(input.length / 1e6).toFixed(1)} MB -> ${(bytes.length / 1e6).toFixed(2)} MB`,
  );
}
const diceSource = "3d-models/dices/Dice.obj",
  diceDest = `${out}/dice.glb`;
if (existsSync(diceSource)) {
  const input = readFileSync(diceSource),
    hash = createHash("sha256").update(input).update("dice-v1").digest("hex");
  if (manifest.dice?.hash !== hash || !existsSync(diceDest)) {
    const object = new OBJLoader().parse(input.toString("utf8")),
      mesh = object.getObjectByName("Cube");
    if (!mesh?.isMesh)
      throw new Error("Dice.obj does not contain the expected ivory Cube.");
    const doc = new Document(),
      buffer = doc.createBuffer(),
      scene = doc.createScene(),
      node = doc.createNode("Ivory die"),
      target = doc.createMesh("Dice");
    for (const group of mesh.geometry.groups) {
      const sourceMaterial = mesh.material[group.materialIndex];
      const material = doc
        .createMaterial(sourceMaterial.name)
        .setBaseColorFactor(
          sourceMaterial.name === "Black"
            ? [0.025, 0.02, 0.03, 1]
            : [0.95, 0.9, 0.78, 1],
        )
        .setRoughnessFactor(0.35)
        .setMetallicFactor(0.05);
      const primitive = doc.createPrimitive().setMaterial(material);
      for (const [key, semantic] of [
        ["position", "POSITION"],
        ["normal", "NORMAL"],
      ]) {
        const a = mesh.geometry.getAttribute(key);
        if (a)
          primitive.setAttribute(
            semantic,
            doc
              .createAccessor()
              .setType("VEC3")
              .setArray(
                new Float32Array(
                  a.array.slice(
                    group.start * 3,
                    (group.start + group.count) * 3,
                  ),
                ),
              )
              .setBuffer(buffer),
          );
      }
      target.addPrimitive(primitive);
    }
    scene.addChild(node.setMesh(target));
    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio: 0.45, error: 0.0005 }),
      dedup(),
      prune(),
      meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    );
    const bytes = await io.writeBinary(doc);
    writeFileSync(diceDest, bytes);
    manifest.dice = { hash, sourceBytes: input.length, webBytes: bytes.length };
    console.log(`Ivory dice prepared: ${(bytes.length / 1000).toFixed(0)} KB`);
  }
} else if (!existsSync(diceDest)) throw new Error("Missing dice model.");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
