<template>
  <t-details-root
    ref="detailsRoot"
    :style="{
      zIndex: zIndex,
    }"
  >
    <video
      ref="video"
      :style="{
        width: '100%',
        // height: '256px',
      }"
    ></video>
  </t-details-root>
</template>

<script setup lang="ts">
// Vue
import { API } from "@/rendererProcess/api";
import { ref, onMounted } from "vue";
const props = defineProps<{
  zIndex: number;
}>();
const detailsRoot = ref<HTMLElement>();
const video = ref<HTMLVideoElement>();
onMounted(() => {
  props;
  (async () => {
    const sources = await API.send("getMediaSources");
    const source = sources[0];
    if (source === undefined) {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: source.id,
          maxFrameRate: 60,
        },
      },
    } as any);
    if (video.value) {
      video.value.srcObject = stream;
      video.value.onloadedmetadata = (e) => video.value?.play();
      setInterval(() => {
        console.log(stream.getVideoTracks()[0]?.getSettings());
      }, 1000);
    }
  })();
});
</script>

<style lang="scss" scoped>
t-details-root {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  background-image: url("~@/@assets/transparentBackground.png");
  overflow: hidden;
}
</style>
