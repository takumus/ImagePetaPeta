<template>
  <section v-if="false">
    :)
  </section>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
// Others
import { getURLFromImgTag } from "@/rendererProcess/utils/getURLFromImgTag";
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import { promiseSerial } from "@/commons/utils/promiseSerial";
@Options({
  components: {
  },
  emits: [
    "addPanelByDragAndDrop"
  ]
})
export default class VImageImporter extends Vue {
  currentMousePosition = new Vec2();
  mounted() {
    document.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        const htmls = [event.dataTransfer.getData('text/html')];
        const fileList: File[] = [];
        for (const file of event.dataTransfer.files) {
          fileList.push(file);
        }
        const filePaths = fileList.map((file) => file.path).filter((path) => {
          return path.length > 0;
        });
        // 空文字のpathsだったらarraybufferを読む。
        const arrayBuffers = filePaths.length > 0 ? [] : await promiseSerial(async (file) => {
          return file.arrayBuffer();
        }, fileList).promise;
        const dropFromBrowserPetaImageIds = await API.send("getDropFromBrowserPetaImageIds");
        if (dropFromBrowserPetaImageIds) {
          this.$emit("addPanelByDragAndDrop", dropFromBrowserPetaImageIds, vec2FromMouseEvent(event), true);
          return;
        }
        const ids = await API.send("importImagesByDragAndDrop", htmls, arrayBuffers, filePaths);
        this.$emit("addPanelByDragAndDrop", ids, vec2FromMouseEvent(event), false);
      }
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener("mousemove", (event) => {
      this.currentMousePosition = vec2FromMouseEvent(event);
    });
    document.addEventListener("paste", async (event) => {
      const items = event.clipboardData?.files;
      if (!items || items.length < 1) {
        return;
      }
      const buffers: Buffer[] = [];
      const readBuffer = async (item: File, index: number) => {
        const data = await item.arrayBuffer();
        if (!data) {
          return;
        }
        buffers.push(Buffer.from(data));
      }
      await promiseSerial(readBuffer, [...items]).promise;
      const ids = await API.send("importImagesFromClipboard", buffers);
      this.$emit("addPanelByDragAndDrop", ids, this.currentMousePosition, false);
    });
  }
}
</script>

<style lang="scss" scoped>
</style>