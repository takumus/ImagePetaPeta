<template>
  <VModal
    :visible="loading"
    :center="true"
    :visibleCloseButton="false"
  >
    <article class="image-importer-root">
      <p v-if="name !== ''">
        {{$t(name)}}({{Math.floor(progress)}}%)
      </p>
      <!-- <section class="bar">
        <div
          class="fill"
          :style="{
            width: `${_progress}%`
          }"
        >
        </div>
      </section> -->
      <VProgressBar :progress="progress"></VProgressBar>
      <pre class="log">{{log}}</pre>
      <section class="confirms">
        <button
          tabindex="-1"
          @click="cancel"
          v-if="!canceled">
          {{$t("imageImporter.cancel")}}
        </button>
        <button
          tabindex="-1"
          @click="ok"
          v-if="hasErrors">
          {{$t("shared.closeButton")}}
        </button>
      </section>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VModal from "@/rendererProcess/components/modal/VModal.vue";
import VProgressBar from "@/rendererProcess/components/utils/VProgressBar.vue";
// Others
import { getURLFromImgTag } from "@/rendererProcess/utils/getURLFromImgTag";
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromMouseEvent } from "@/commons/utils/vec2";
import * as Cursor from "@/rendererProcess/utils/cursor";
import { promiseSerial } from "@/commons/utils/promiseSerial";
import { TaskStatus } from "@/commons/api/interfaces/task";
@Options({
  components: {
    VModal,
    VProgressBar
  },
  emits: [
    "addPanelByDragAndDrop"
  ]
})
export default class VImageImporter extends Vue {
  progress = 100;
  loading = false;
  hasErrors = false;
  log = "";
  currentMousePosition = new Vec2();
  canceled = false;
  name = "";
  closeWindowHandler = -1;
  mounted() {
    API.on("taskStatus", (e, task) => {
      window.clearTimeout(this.closeWindowHandler);
      this.name = task.i18nKey + ".name";
      this.hasErrors = false;
      this.loading = true;
      this.progress = task.progress ? Math.floor(task.progress.current / task.progress.all * 100) : 0;
      this.canceled = false;
      const i18nKey = `${task.i18nKey}.logs.${task.status}`;
      const localized = this.$t(i18nKey, task.log);
      if (localized.indexOf("undefined") >= 0) {
        console.warn(i18nKey, "にundefinedが含まれています。怪しい。");
        console.warn(localized);
      }
      if (task.status == TaskStatus.BEGIN) {
        this.log = "";
      }
      this.addLog(`[${task.status}]${
        task.status == TaskStatus.PROGRESS && task.progress ? `(${task.progress.current}/${task.progress.all})` : ""
      }:${localized}`);
      Cursor.setCursor("wait");
      if (task.status == TaskStatus.COMPLETE || task.status == TaskStatus.FAILED) {
        if (task.status == TaskStatus.COMPLETE) {
          this.closeWindowHandler = window.setTimeout(() => {
            this.loading = false;
          }, 200);
        }
        if (task.status == TaskStatus.FAILED) {
          this.hasErrors = true;
        }
        this.progress = 100;
        Cursor.setDefaultCursor();
        this.canceled = true;
      }
    });
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
  addLog(value: string) {
    this.log = value + "\n" + this.log;
  }
  ok() {
    this.hasErrors = false;
    this.loading = false;
  }
  cancel() {
    API.send("cancelImportImages");
  }
}
</script>

<style lang="scss" scoped>
.image-importer-root {
  text-align: center;
  .log {
    text-align: left;
    overflow: hidden;
    word-break: break-all;
    white-space: pre-wrap;
    height: 64px;
    overflow-y: auto;
    overflow-x: hidden;
    font-size: 0.8em;
  }
  p {
    white-space: nowrap;
  }
}
</style>