<template>
  <VModal
    :visible="loading"
    :center="true"
    :visibleCloseButton="false"
  >
    <article class="image-importer-root">
      <p>
        {{$t("imageImporter.importing")}}{{Math.floor(progress)}}%
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
import VModal from "@/renderer/components/modal/VModal.vue";
import VProgressBar from "@/renderer/components/utils/VProgressBar.vue";
// Others
import { getURLFromImgTag } from "@/utils/getURLFromImgTag";
import { API } from "@/renderer/api";
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
  mounted() {
    API.on("importImagesProgress", (e, progress, file, result) => {
      this.progress = Math.floor(progress * 100);
      this.log = result + " -> " + file + "\n" + this.log;
    });
    API.on("importImagesBegin", (e, fileCount) => {
      this.progress = 0;
      this.loading = true;
      this.hasErrors = false;
      this.log = "";
    });
    API.on("importImagesComplete", (e, fileCount, addedFileCount) => {
      if (fileCount != addedFileCount) {
        this.hasErrors = true;
        this.log = `Error!\n${addedFileCount}/${fileCount} files added.` + "\n" + this.log;
      } else {
        setTimeout(() => {
          this.loading = false;
        }, 500);
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
  }
  ok() {
    this.hasErrors = false;
    this.loading = false;
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