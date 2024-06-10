import { writeFileSync } from "fs";
import { resolve } from "path";
import { manifest } from "$/manifest";

console.log("export manifest.json");
writeFileSync(resolve("./_release/manifest.json"), JSON.stringify(manifest, undefined, 2));
