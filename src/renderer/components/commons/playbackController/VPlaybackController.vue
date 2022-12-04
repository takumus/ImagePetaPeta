<template>
  <t-playback-controller-root v-if="pFileObjectContent instanceof PVideoFileObjectContent">
    <button @click="play">play</button>
    <button @click="pause">pause</button>
    <input type="range" :max="1000" v-model="currentVolumeModel" />
    <VSeekBar
      :duration="duration"
      v-model:time="currentTimeModel"
      @start-seek="startSeek"
      @stop-seek="stopSeek" />
  </t-playback-controller-root>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

import VSeekBar from "@/renderer/components/commons/playbackController/VSeekBar.vue";

import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const props = defineProps<{
  pFileObjectContent: PFileObjectContent<unknown>;
}>();
const duration = ref(0);
const currentTime = ref(0);
const currentVolumeTime = ref(0);
const paused = ref(false);
function play() {
  if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
    props.pFileObjectContent.play();
  }
}
function pause() {
  if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
    props.pFileObjectContent.pause();
  }
}
function startSeek() {
  if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
    paused.value = props.pFileObjectContent.getPaused();
    props.pFileObjectContent.pause();
  }
}
function stopSeek() {
  if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
    if (!paused.value) {
      props.pFileObjectContent.play();
    }
  }
}
const currentTimeModel = computed<number>({
  get() {
    return currentTime.value;
  },
  set(value) {
    if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
      const video = props.pFileObjectContent;
      video.setCurrentTime(value / 1000);
    }
  },
});
const currentVolumeModel = computed<number>({
  get() {
    return currentVolumeTime.value;
  },
  set(value) {
    if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
      const video = props.pFileObjectContent;
      video.setVolume(value / 1000);
    }
  },
});
watch(
  () => props.pFileObjectContent,
  () => {
    if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
      const video = props.pFileObjectContent;
      duration.value = video.getDuration() * 1000;
      video.event.on("updateRenderer", () => {
        currentTime.value = video.getCurrentTime() * 1000;
        currentVolumeTime.value = video.getVolume() * 1000;
      });
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
t-playback-controller-root {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
