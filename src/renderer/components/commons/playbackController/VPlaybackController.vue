<template>
  <t-playback-controller-root>
    <button @click="playing ? pause() : play()">
      {{ playing ? t("playbackController.pause") : t("playbackController.play") }}
    </button>
    <t-seekbar>
      <VSeekBar
        :duration="duration"
        v-model:time="currentTimeModel"
        @start-seek="startSeek"
        @stop-seek="stopSeek" />
    </t-seekbar>
    <input type="range" :max="1000" v-model="currentVolumeModel" />
  </t-playback-controller-root>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VSeekBar from "@/renderer/components/commons/playbackController/VSeekBar.vue";

import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const { t } = useI18n();
const props = defineProps<{
  pFileObjectContent: PPlayableFileObjectContent<void>;
}>();
const duration = ref(0);
const currentTime = ref(0);
const currentVolumeTime = ref(0);
const isPlayingBeforeSeek = ref(false);
const playing = ref(false);
function play() {
  props.pFileObjectContent.play();
}
function pause() {
  props.pFileObjectContent.pause();
}
function startSeek() {
  isPlayingBeforeSeek.value = playing.value;
  props.pFileObjectContent.pause();
}
function stopSeek() {
  if (isPlayingBeforeSeek.value) {
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
    playing.value = !playable.getPaused();
    playable.event.on("play", () => {
      playing.value = !playable.getPaused();
      console.log(playing.value);
    });
    playable.event.on("pause", () => {
      playing.value = !playable.getPaused();
      console.log(playing.value);
    });
    playable.event.on("time", () => {
      currentTime.value = playable.getCurrentTime() * 1000;
    });
    if (playable instanceof PVideoFileObjectContent) {
      playable.event.on("volume", () => {
        currentVolumeTime.value = playable.getVolume() * 1000;
      });
    }
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
t-playback-controller-root {
  display: flex;
  width: 100%;
  height: 100%;
  > button {
    min-width: 64px;
  }
  > t-seekbar {
    padding: var(--px-1);
    display: block;
    flex: 1;
  }
}
</style>
