import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import * as file from "@/mainProcess/storages/file";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/commons/defines";
import { PetaColor } from "@/commons/datas/petaColor";
(async () => {
  const files = await file.readdir("./src/test/sample_images");
  console.time("time");
  const palettes: { palette: PetaColor[], allPalette: PetaColor[], path: string }[] = [];
  await promiseSerial(async (f) => {
    const label = f.substring(0, 10);
    console.time(label);
    const data = await file.readFile("./src/test/sample_images/" + f);
    const metadata = await generateMetadata({
      data,
      outputFilePath: "./test_output/metadata_tile_" + f,
      size: BROWSER_THUMBNAIL_SIZE,
      quality: BROWSER_THUMBNAIL_QUALITY
    });
    palettes.push({
      palette: metadata.palette,
      allPalette: metadata.allPalette,
      path: "../src/test/sample_images/" + f
    });
    console.timeEnd(label);
  }, files).promise;
  console.timeEnd("time");
  console.log("output:", "./test_output/metadata_color.html");
  await file.writeFile(
    "./test_output/metadata_color.html",
    Buffer.from(
      `<html>
      <head>
      <style>
      body {
        font-family: consolas;
        text-align: center;
      }
      span {
        letter-spacing: -0.1em;
        display: inline-block;
        height: 12px;
      }
      </style>
      </head>
      <body>
      ${
        palettes.map(
          (p) => `<img src="${p.path}" width="256"><br>Compressed<br>[`
            + p.palette.map(
              (c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">███</span>`
            ).join("") + "]<br>All<br>["
            + p.allPalette.map(
              (c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">█</span>`
            ).join("") + "]<br><br>"
        ).join("")
      }
      </body>
      </html>`,
      "utf-8"
    )
  );
})();