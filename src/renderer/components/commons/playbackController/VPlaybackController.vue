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
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VSeekBar from "@/renderer/components/commons/playbackController/VSeekBar.vue";

import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const { t } = useI18n();
const props = defineProps<{
  pFileObjectContent: PPlayableFileObjectContent<void>;
}>();
const emit = defineEmits<{
  (e: "pause"): void;
  (e: "play"): void;
  (e: "volume"): void;
  (e: "seek"): void;
}>();
const duration = ref(0);
const currentTime = ref(0);
const currentVolumeTime = ref(0);
const isPlayingBeforeSeek = ref(false);
const playing = ref(false);
onUnmounted(() => {
  unobserve(props.pFileObjectContent);
});
function play() {
  props.pFileObjectContent.play();
  emit("play");
}
function pause() {
  props.pFileObjectContent.pause();
  emit("pause");
}
function startSeek() {
  isPlayingBeforeSeek.value = playing.value;
  props.pFileObjectContent.pause();
}
function stopSeek() {
  if (isPlayingBeforeSeek.value) {
    props.pFileObjectContent.play();
  }
  emit("seek");
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
      emit("volume");
    }
  },
});
function onPlay() {
  playing.value = !props.pFileObjectContent.getPaused();
}
function onPause() {
  playing.value = !props.pFileObjectContent.getPaused();
}
function onTime() {
  currentTime.value = props.pFileObjectContent.getCurrentTime() * 1000;
}
function onVolume() {
  if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
    currentVolumeTime.value = props.pFileObjectContent.getVolume() * 1000;
  }
}
function observe(content: PPlayableFileObjectContent<void>) {
  duration.value = content.getDuration() * 1000;
  playing.value = !content.getPaused();
  currentTime.value = content.getCurrentTime() * 1000;
  content.event.on("play", onPlay);
  content.event.on("pause", onPause);
  content.event.on("time", onTime);
  if (content instanceof PVideoFileObjectContent) {
    content.event.on("volume", onVolume);
    currentVolumeTime.value = content.getVolume() * 1000;
  }
}
function unobserve(content?: PPlayableFileObjectContent<void>) {
  content?.event.off("play", onPlay);
  content?.event.off("pause", onPause);
  content?.event.off("time", onTime);
  if (content instanceof PVideoFileObjectContent) {
    content.event.off("volume", onVolume);
  }
}
watch(
  () => props.pFileObjectContent,
  (newContent, oldContent) => {
    unobserve(oldContent);
    observe(newContent);
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
