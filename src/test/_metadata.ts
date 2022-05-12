import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import * as file from "@/mainProcess/storages/file";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/commons/defines";
import { PetaColor } from "@/commons/datas/petaColor";
(async () => {
  const files = await file.readdir("./src/test/sample_images");
  console.time("time");
  const palettes: { palette: PetaColor[], mainPalette: PetaColor[], subPalette: PetaColor[], path: string }[] = [];
  await promiseSerial(async (f) => {
    const label = f.substring(0, 4);
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
      mainPalette: metadata.mainPalette,
      subPalette: metadata.subPalette,
      path: "../src/test/sample_images/" + f
    });
    console.timeEnd(label);
  }, files).promise;
  console.timeEnd("time");
  console.log("output:", "./test_output/metadata_color.html");
  await file.writeFile(
    "./test_output/metadata_color.html",
    Buffer.from(
      `
      <html>
      <body>
      ${
        palettes.map(
          (p) => `<img src="${p.path}" width="128"><br>`
            + p.palette.map(
              (c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">■</span>`
            ).join("") + "<br>"
            + p.mainPalette.map(
              (c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">■</span>`
            ).join("") + "<br>"
            + p.subPalette.map(
              (c) => `<span style="color:rgb(${c.r}, ${c.g}, ${c.b})">■</span>`
            ).join("") + "<br>"
        ).join("")
      }
      </body>
      </html>`,
      "utf-8"
    )
  );
})();