<template>
  <VModal
    :visible="loading"
    :center="true"
    :zIndex="zIndex"
  >
    <article class="image-importer-root">
      <p>
        {{$t("imageImporter.importing")}}{{Math.floor(_progress)}}%
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
      <VProgressBar :progress="_progress"></VProgressBar>
      <pre class="log">{{log}}</pre>
      <section class="confirms">
        <button
          tabindex="-1"
          @click="ok"
          v-if="this.hasErrors">
          OK
        </button>
      </section>
    </article>
  </VModal>
</template>

<script lang="ts">
// Vue
import { Options, Vue } from "vue-class-component";
import { Prop, Ref } from "vue-property-decorator";
// Components
import VModal from "@/components/modal/VModal.vue";
import VProgressBar from "@/components/utils/VProgressBar.vue";
// Others
import { getURLFromImgTag } from "@/utils/getURLFromImgTag";
import { API } from "@/api";
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
  @Prop()
  zIndex = 0;
  rawProgress = 100;
  progress = 100;
  loading = false;
  hasErrors = false;
  log = "";
  mounted() {
    API.on("importImagesProgress", (e, progress, file, result) => {
      this.rawProgress = Math.floor(progress * 100);
      this.log = result + " -> " + file + "\n" + this.log;
    });
    API.on("importImagesBegin", (e, fileCount) => {
      this.progress = 0;
      this.rawProgress = 0;
      this.loading = true;
      this.hasErrors = false;
      this.log = "";
    });
    API.on("importImagesComplete", (e, fileCount, addedFileCount) => {
      // this.loading = false;
      if (fileCount != addedFileCount) {
        this.hasErrors = true;
        this.log = `Error!\n${addedFileCount}/${fileCount} files added.` + "\n" + this.log;
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
        this.$emit("addPanelByDragAndDrop", ids, event);
        // }
      }
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.smoothProgress();
  }
  smoothProgress() {
    if (this.loading) {
      this.progress += (this.rawProgress - this.progress) * 0.2;
      if (this.progress > 99.9) {
        this.progress = 100;
        if (!this.hasErrors) {
          setTimeout(() => {
            this.loading = false;
          }, 100);
        }
      }
    }
    requestAnimationFrame(this.smoothProgress);
  }
  ok() {
    this.hasErrors = false;
    this.loading = false;
  }
  get _progress() {
    return this.progress;
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