import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import * as file from "@/mainProcess/storages/file";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/commons/defines";
import { PetaColor } from "@/commons/datas/petaColor";
(async () => {
  const files = await file.readdir("./src/test/sample_images");
  console.time("time");
  const palettes: { palette: PetaColor[]; allPalette: PetaColor[]; path: string }[] = [];
  await promiseSerial(async (f) => {
    try {
      const label = f.substring(0, 10);
      console.time(label);
      const data = await file.readFile("./src/test/sample_images/" + f);
      const metadata = await generateMetadata({
        data,
        outputFilePath: "./dist/test/metadata_tile_" + f,
        size: BROWSER_THUMBNAIL_SIZE,
        quality: BROWSER_THUMBNAIL_QUALITY,
      });
      palettes.push({
        palette: metadata.palette,
        allPalette: [...metadata.palette].sort((a, b) => b.positionSD - a.positionSD),
        path: "./metadata_tile_" + f + ".webp",
      });
      console.timeEnd(label);
    } catch (error) {
      //
    }
  }, files).promise;
  console.timeEnd("time");
  console.log("output:", "./dist/test/metadata_color.html");
  await file.writeFile(
    "./dist/test/metadata_color.html",
    Buffer.from(
      `<html>
      <head>
      <style>
      body {
        font-family: consolas;
        text-align: center;
        background-color: #333333;
        color: #ffffff;
        font-weight: bold;
        word-break: break-word;
      }
      span {
        letter-spacing: -0.03em;
        font-size: var(--size-0);
      }
      </style>
      </head>
      <body>
      ${palettes
        .map(
          (p) =>
            `<img src="${p.path}" width="256"><br><br>Compressed(${p.palette.length})<div>[` +
            p.palette
              .map((c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">███</span><span>${c.population}</span>`)
              .join("") +
            `]</div><br>All(${p.allPalette.length})<div>[` +
            p.allPalette
              .map((c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">███</span><span>${c.positionSD}</span>`)
              .join("") +
            `]</div><br><br>`,
        )
        .join("")}
      </body>
      </html>`,
      "utf-8",
    ),
  );
})();
