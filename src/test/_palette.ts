import Vibrant = require('node-vibrant');
import * as File from "@/mainProcess/storages/file";
import sharp from "sharp";
(async () => {
    const raw = await File.readFile('./src/@assets/sample.png');
    console.time("resize");
    const thumbRaw = await sharp(raw).resize(128).webp().toBuffer();
    console.timeEnd("resize");
    console.time("webp");
    const thumbWebp = await sharp(thumbRaw).png().toBuffer();
    console.timeEnd("webp");
    console.time("palette");
    const palette = await Vibrant.from(thumbWebp).getPalette();
    console.timeLog("palette", palette);
})();