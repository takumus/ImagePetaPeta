<template>
  <t-playback-controller-root>
    <t-advanced>
      <button @click="paused(playing)">
        {{ playing ? t("playbackController.pause") : t("playbackController.play") }}
      </button>
      <VSlider v-if="hasAudio" :min="0" :max="1000" v-model:value="currentVolumeModel" />
      <VSlider :min="100" :max="4000" v-model:value="currentSpeedModel" /><button
        @click="currentSpeedModel = 1000">
        reset
      </button>
    </t-advanced>
    <t-general>
      <t-seekbar>
        <VSeekBar
          :duration="duration"
          v-model:time="currentTimeModel"
          @start-seek="startSeek"
          @stop-seek="stopSeek" />
      </t-seekbar>
    </t-general>
  </t-playback-controller-root>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VSeekBar from "@/renderer/components/commons/playbackController/VSeekBar.vue";
import VSlider from "@/renderer/components/commons/utils/slider/VSlider.vue";

import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const { t } = useI18n();
const props = defineProps<{
  pFileObjectContent: PPlayableFileObjectContent<void>;
}>();
const emit = defineEmits<{
  (e: "paused", paused: boolean): void;
  (e: "volume"): void;
  (e: "seek"): void;
  (e: "speed"): void;
}>();
const duration = ref(0);
const currentTime = ref(0);
const currentVolume = ref(0);
const currentSpeed = ref(1);
const isPlayingBeforeSeek = ref(false);
const playing = ref(false);
onUnmounted(() => {
  unobserve(props.pFileObjectContent);
});
function paused(paused: boolean) {
  props.pFileObjectContent.setPaused(paused);
  emit("paused", paused);
}
function startSeek() {
  isPlayingBeforeSeek.value = playing.value;
  props.pFileObjectContent.setPaused(true);
}
function stopSeek() {
  if (isPlayingBeforeSeek.value) {
    props.pFileObjectContent.setPaused(false);
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
    return currentVolume.value;
  },
  set(value) {
    if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
      const video = props.pFileObjectContent;
      video.setVolume(value / 1000);
      emit("volume");
    }
  },
});
const currentSpeedModel = computed<number>({
  get() {
    return currentSpeed.value;
  },
  set(value) {
    props.pFileObjectContent.setSpeed(value / 1000);
    emit("speed");
  },
});
function onPause() {
  playing.value = !props.pFileObjectContent.getPaused();
}
function onTime() {
  currentTime.value = props.pFileObjectContent.getCurrentTime() * 1000;
}
function onVolume() {
  if (props.pFileObjectContent instanceof PVideoFileObjectContent) {
    currentVolume.value = props.pFileObjectContent.getVolume() * 1000;
  }
}
function onSpeed() {
  currentSpeed.value = props.pFileObjectContent.getSpeed() * 1000;
  console.log(currentSpeed.value);
}
function observe(content: PPlayableFileObjectContent<void>) {
  duration.value = content.getDuration() * 1000;
  playing.value = !content.getPaused();
  currentTime.value = content.getCurrentTime() * 1000;
  currentSpeed.value = content.getSpeed() * 1000;
  content.event.on("paused", onPause);
  content.event.on("time", onTime);
  content.event.on("speed", onSpeed);
  if (content instanceof PVideoFileObjectContent) {
    content.event.on("volume", onVolume);
    currentVolume.value = content.getVolume() * 1000;
  }
}
function unobserve(content?: PPlayableFileObjectContent<void>) {
  content?.event.off("paused", onPause);
  content?.event.off("time", onTime);
  content?.event.off("speed", onSpeed);
  if (content instanceof PVideoFileObjectContent) {
    content.event.off("volume", onVolume);
  }
}
const hasAudio = computed(() => {
  return props.pFileObjectContent instanceof PVideoFileObjectContent;
});
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
  flex-direction: column;
  > t-general {
    display: flex;
    > button {
      min-width: 64px;
    }
    > t-seekbar {
      padding: var(--px-1);
      display: block;
      flex: 1;
    }
  }
  > t-advanced {
    display: flex;
    align-items: center;
  }
}
</style>
