<template>
  <t-playback-controller-root>
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

import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const props = defineProps<{
  pFileObjectContent: PPlayableFileObjectContent<void>;
}>();
const duration = ref(0);
const currentTime = ref(0);
const currentVolumeTime = ref(0);
const paused = ref(false);
function play() {
  props.pFileObjectContent.play();
}
function pause() {
  props.pFileObjectContent.pause();
}
function startSeek() {
  paused.value = props.pFileObjectContent.getPaused();
  props.pFileObjectContent.pause();
}
function stopSeek() {
  if (!paused.value) {
    props.pFileObjectContent.play();
  }
}
const currentTimeModel = computed<number>({
  get() {
    return currentTime.value;
  },
  set(value) {
    const video = props.pFileObjectContent;
    video.setCurrentTime(value / 1000);
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
    const playable = props.pFileObjectContent;
    duration.value = playable.getDuration() * 1000;
    playable.event.on("updateRenderer", () => {
      currentTime.value = playable.getCurrentTime() * 1000;
      if (playable instanceof PVideoFileObjectContent) {
        currentVolumeTime.value = playable.getVolume() * 1000;
      }
    });
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
