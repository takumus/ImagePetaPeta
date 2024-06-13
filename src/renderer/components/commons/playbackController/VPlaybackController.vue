<template>
  <e-playback-controller-root>
    <e-advanced>
      <!-- volume -->
      <e-property v-if="hasAudio">
        <e-label> {{ t("playbackController.volume") }} </e-label>
        <VSlider :min="0" :max="1000" v-model:value="currentVolumeModel" />
      </e-property>
      <!-- playback speed -->
      <e-property>
        <e-label> {{ t("playbackController.speed") }} </e-label>
        <VSlider :min="100" :max="4000" v-model:value="currentSpeedModel" />
        <button v-for="speed in speeds" :key="speed.label" @click="currentSpeedModel = speed.value">
          {{ speed.label }}x
        </button>
      </e-property>
    </e-advanced>
    <e-general>
      <button @click="paused(playing)">
        {{ playing ? t("playbackController.pause") : t("playbackController.play") }}
      </button>
      <e-seekbar>
        <VSeekBar
          :duration="duration"
          v-model:time="currentTimeModel"
          v-model:loop-start="currentLoopStartModel"
          v-model:loop-end="currentLoopEndModel"
          @start-seek="startSeek"
          @stop-seek="stopSeek" />
      </e-seekbar>
      <!-- <e-seekbar>
        <VSeekBar :duration="duration" v-model:time="currentLoopStartModel" />
      </e-seekbar>
      <e-seekbar>
        <VSeekBar :duration="duration" v-model:time="currentLoopEndModel" />
      </e-seekbar> -->
      <e-current-time>{{ currentTimeHMS }}</e-current-time>
    </e-general>
  </e-playback-controller-root>
</template>

<script setup lang="ts">
import cloneDeep from "lodash.clonedeep";
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VSeekBar from "@/renderer/components/commons/playbackController/VSeekBar.vue";
import VSlider from "@/renderer/components/commons/utils/slider/VSlider.vue";

import { PetaPanelPlayableLoop } from "@/commons/datas/petaPanel";
import { secondsToHMS } from "@/commons/utils/secondsToHMS";

import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";
import { PVideoFileObjectContent } from "@/renderer/utils/pFileObject/video";

const { t } = useI18n();
const speeds: {
  value: number;
  label: string;
}[] = [
  { value: 500, label: "0.5" },
  { value: 1000, label: "1.0" },
  { value: 2000, label: "2.0" },
];
const props = defineProps<{
  pFileObjectContent: PPlayableFileObjectContent<void>;
}>();
const emit = defineEmits<{
  (e: "paused", paused: boolean): void;
  (e: "volume"): void;
  (e: "seek"): void;
  (e: "speed"): void;
  (e: "loop"): void;
}>();
const duration = ref(0);
const currentTime = ref(0);
const currentVolume = ref(0);
const currentSpeed = ref(1);
const currentLoopStart = ref(0);
const currentLoopEnd = ref(0);
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
const currentTimeHMS = computed(() => {
  return secondsToHMS(currentTime.value / 1000);
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
const currentLoopStartModel = computed<number>({
  get() {
    return currentLoopStart.value;
  },
  set(value) {
    const loop = cloneDeep(props.pFileObjectContent.getLoop());
    loop.range.start = value / 1000;
    props.pFileObjectContent.setLoop(loop);
    emit("loop");
  },
});
const currentLoopEndModel = computed<number>({
  get() {
    return currentLoopEnd.value;
  },
  set(value) {
    const loop = cloneDeep(props.pFileObjectContent.getLoop());
    loop.range.end = value / 1000;
    props.pFileObjectContent.setLoop(loop);
    emit("loop");
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
}
function onLoop() {
  currentLoopStart.value = props.pFileObjectContent.getLoop().range.start * 1000;
  currentLoopEnd.value = props.pFileObjectContent.getLoop().range.end * 1000;
}
function observe(content: PPlayableFileObjectContent<void>) {
  duration.value = content.getDuration() * 1000;
  playing.value = !content.getPaused();
  currentTime.value = content.getCurrentTime() * 1000;
  currentSpeed.value = content.getSpeed() * 1000;
  currentLoopStart.value = content.getLoop().range.start * 1000;
  currentLoopEnd.value = content.getLoop().range.end * 1000;
  content.event.on("paused", onPause);
  content.event.on("time", onTime);
  content.event.on("speed", onSpeed);
  content.event.on("loop", onLoop);
  if (content instanceof PVideoFileObjectContent) {
    content.event.on("volume", onVolume);
    currentVolume.value = content.getVolume() * 1000;
  }
}
function unobserve(content?: PPlayableFileObjectContent<void>) {
  content?.event.off("paused", onPause);
  content?.event.off("time", onTime);
  content?.event.off("speed", onSpeed);
  content?.event.off("loop", onLoop);
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
e-playback-controller-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  > e-general {
    display: flex;
    align-items: center;
    > button {
      min-width: 64px;
    }
    > e-seekbar {
      display: block;
      flex: 1;
      padding: var(--px-1);
    }
    > e-current-time {
      display: block;
      padding: 0px var(--px-1);
    }
  }
  > e-advanced {
    display: flex;
    flex-direction: column;
    padding: var(--px-1);
    > e-property {
      display: flex;
      align-items: center;
    }
  }
}
</style>
