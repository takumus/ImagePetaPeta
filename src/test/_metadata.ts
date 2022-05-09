import { generateMetadata } from "@/mainProcess/utils/generateMetadata";
import * as file from "@/mainProcess/storages/file";
import { BROWSER_THUMBNAIL_QUALITY, BROWSER_THUMBNAIL_SIZE } from "@/commons/defines";
(async () => {
  const data = await file.readFile('./src/@assets/sample.png');
  console.time("time");
  const metadata = await generateMetadata({
    data,
    outputFilePath: "./test",
    size: BROWSER_THUMBNAIL_SIZE,
    quality: BROWSER_THUMBNAIL_QUALITY
  });
  console.timeLog("time", metadata);
})();