<template>
  <t-details-root
    ref="detailsRoot"
    :style="{
      zIndex: zIndex,
    }"
  >
    <!-- <select v-model="currentSource">
      <option v-for="source in sources" :key="source.id" :value="source">{{ source.name }}</option>
    </select> -->
    <t-video>
      <VDragView
        v-if="currentSource?.size"
        :contentWidth="currentSource.size.width"
        :contentHeight="currentSource.size.height"
      >
        <video ref="video"></video>
      </VDragView>
    </t-video>
    <t-thumbnails
      ><img
        v-for="source in sources"
        :key="source.id"
        :src="source.thumbnailDataURL"
        @click="currentSource = source"
        :class="{
          selected: source === currentSource,
        }"
        draggable="false"
      />
    </t-thumbnails>
  </t-details-root>
</template>

<script setup lang="ts">
// Vue
import { IPC } from "@/rendererProcess/ipc";
import { ref, onMounted, watch } from "vue";
import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";
import VDragView from "@/rendererProcess/components/utils/VDragView.vue";
// const props =
defineProps<{
  zIndex: number;
}>();
const detailsRoot = ref<HTMLElement>();
const video = ref<HTMLVideoElement>();
const sources = ref<MediaSourceInfo[]>([]);
const currentSource = ref<MediaSourceInfo>();
const mediaStream = ref<MediaStream>();
onMounted(async () => {
  sources.value = await IPC.send("getMediaSources");
  currentSource.value = sources.value[0];
});
function stopSource() {
  if (mediaStream.value === undefined) {
    return;
  }
  try {
    mediaStream.value.getVideoTracks().forEach((track) => {
      track.stop();
    });
  } catch {
    //
  }
}
async function changeSource() {
  stopSource();
  if (currentSource.value === undefined) {
    return;
  }
  console.log("change source:", currentSource.value);
  mediaStream.value = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: currentSource.value.id,
        maxFrameRate: 60,
        minWidth: currentSource.value.size?.width,
        minHeight: currentSource.value.size?.height,
      },
    },
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  } as any);
  if (video.value !== undefined) {
    video.value.srcObject = mediaStream.value;
    video.value.play();
  }
}
watch(currentSource, changeSource);
</script>

<style lang="scss" scoped>
t-details-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-image: url("~@/@assets/transparentBackground.png");
  overflow: hidden;
  > input {
    display: block;
  }
  > t-video {
    display: block;
    flex: 1;
    overflow: hidden;
  }
  video {
    width: 100%;
    height: 100%;
  }
  > t-thumbnails {
    background-color: var(--color-0);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--px-2);
    height: 128px;
    > img {
      height: 100%;
      display: block;
      margin-right: var(--px-2);
      cursor: pointer;
      border-radius: var(--rounded);
      overflow: hidden;
      filter: brightness(0.5);
      &.selected {
        filter: brightness(1);
      }
    }
  }
}
</style>
