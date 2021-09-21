<template>
  <article class="importer-root" v-if="loading">
    <div class="progress">
      <p>読込中...{{Math.floor(_progress)}}%</p>
      <div class="bar">
        <div
          class="fill"
          :style="{
            width: `${_progress}%`
          }"
        >
        </div>
      </div>
      <pre class="log">{{log}}</pre>
      <div class="confirms">
        <button tabindex="-1" @click="ok" v-if="this.hasErrors">OK</button>
      </div>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.importer-root {
  z-index: 3;
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0px;
  left: 0px;
  background-color: rgba($color: #000000, $alpha: 0.7);
  .progress {
    width: 512px;
    background-color: #ffffff;
    padding: 16px;
    border-radius: 8px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    overflow: hidden;
    .log {
      text-align: left;
      overflow: hidden;
      word-break: break-all;
      white-space: pre-wrap ;
      color: #333333;
      height: 64px;
      overflow-y: auto;
      overflow-x: hidden;
      font-size: 0.7em;
    }
    p {
      white-space: nowrap;
      color: #333333;
    }
    .bar {
      background-color: #333333;
      width: 100%;
      height: 16px;
      overflow: hidden;
      border-radius: 8px;
      padding: 2px;
      .fill {
        width: 50%;
        height: 100%;
        border-radius: 8px;
        background-color: #ffffff;
      }
    }
    .confirms {
      text-align: center;
    }
  }
}
</style>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { getURLFromImgTag } from "@/utils";
import { API, log } from "@/api";
@Options({
  components: {
  },
  emits: [
    "addPanelByDragAndDrop"
  ]
})
export default class VImageImporter extends Vue {
  rawProgress = 100;
  progress = 100;
  loading = false;
  hasErrors = false;
  log = "";
  mounted() {
    API.on("importImagesProgress", (e, progress, file, result) => {
      this.rawProgress = Math.floor(progress * 100);
      this.log = result + " -> " + file + "\n" + this.log;
      log(`importing ${this.progress}% (${file})`);
    });
    API.on("importImagesBegin", (e, fileCount) => {
      log(`begin import ${fileCount}`);
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
      log(`complete import (${addedFileCount} / ${fileCount})`);
    });
    document.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      log(event);
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
        if (ids.length == 1) {
          this.$emit("addPanelByDragAndDrop", ids, event);
        }
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
