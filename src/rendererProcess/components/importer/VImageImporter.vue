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
        const url = getURLFromImgTag(event.dataTransfer.getData('text/html'));
        let ids: string[] = [];
        if (url != "") {
          ids = [await API.send("importImageFromURL", url)];
        } else if (event.dataTransfer.files.length > 0) {
          const filePaths: string[] = [];
          for (const file of event.dataTransfer.files) {
            filePaths.push(file.path);
          }
          ids = await API.send("importImagesFromFilePaths", filePaths);
        }
        // if (ids.length == 1) {
        this.$emit("addPanelByDragAndDrop", ids, vec2FromMouseEvent(event));
        // }
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
      await promiseSerial(readBuffer, [...items]).value;
      const ids = await API.send("importImagesFromClipboard", buffers);
      this.$emit("addPanelByDragAndDrop", ids, this.currentMousePosition);
    });
  }
}
</script>

<style lang="scss" scoped>
</style>