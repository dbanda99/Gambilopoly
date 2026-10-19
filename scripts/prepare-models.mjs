import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
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
import sharp from "sharp";

const catalog = JSON.parse(readFileSync("src/data/playerAssets.json", "utf8"));
const output = "assets/players";
mkdirSync(output, { recursive: true });
const manifestPath = path.join(output, "manifest.json");
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {};
const settings = "v1-simplify-008-error003-webp1024-meshopt";
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
for (const { file } of Object.values(catalog)) {
  const source = path.join("3d-models", "figurines", file),
    destination = path.join(output, file);
  if (!existsSync(source)) {
    if (!existsSync(destination))
      throw new Error(`Missing player model: ${source}`);
    continue;
  }
  const input = readFileSync(source),
    hash = createHash("sha256").update(input).update(settings).digest("hex");
  if (manifest[file]?.hash === hash && existsSync(destination)) continue;
  const document = await io.readBinary(input);
  await document.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.08, error: 0.003 }),
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
  const bytes = await io.writeBinary(document);
  writeFileSync(destination, bytes);
  const vertices = document
    .getRoot()
    .listMeshes()
    .reduce(
      (sum, m) =>
        sum +
        m
          .listPrimitives()
          .reduce(
            (s, p) => s + (p.getAttribute("POSITION")?.getCount() ?? 0),
            0,
          ),
      0,
    );
  manifest[file] = {
    hash,
    sourceBytes: input.length,
    webBytes: bytes.length,
    vertices,
  };
  console.log(
    `${file}: ${(input.length / 1e6).toFixed(1)} MB -> ${(bytes.length / 1e6).toFixed(2)} MB (${vertices.toLocaleString()} vertices)`,
  );
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
