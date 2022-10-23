import { getURLFromHTML } from "@/rendererProcess/utils/getURLFromHTML";

url(`
  <img
    alt="aaa"
    class="aaa"
    importance="auto"
    loading="auto"
    src="./img.png"
    srcset="./img1x.png 1x, ./img2x.png 2x, ./img4x.png 3x, ./img4x.png 4x"
  >
`);
url(`
  <a href="./img.png">
`);
url(`
  <img
    alt="aaa"
    class="aaa"
    importance="auto"
    loading="auto"
    srcset="./img1x.png           1x         , 
           ./img2x.png 2x                          , 
        ./img4x.png 3x      , 
                /img4x.png        4x"
  >
`);
url(`
  <div>
    <img
      alt="aaa"
      class="aaa"
      importance="auto"
      loading="auto"
      Src="./img.png"
    >
  </div>
`);
url(`
  <div>
    <img
      alt="aaa"
      class="aaa"
      importance="auto"
      loading="auto"
    >
  </div>
`);

function url(html: string) {
  try {
    console.log(`"${getURLFromHTML(html)}"`);
  } catch (err) {
    console.error(err);
  }
}
