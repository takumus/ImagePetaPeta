<template>
  <e-property-root>
    <e-shrinks class="content">
      <e-infos v-if="singlePetaFileInfo" class="content-child">
        <p>{{ t("browser.property.infos.label") }}</p>
        <e-datas>
          <e-data>
            <e-name>{{ t("browser.property.infos.name") }}:</e-name>
            <e-value>
              <VTextarea
                :type="'single'"
                :click-to-edit="true"
                :allow-empty="true"
                :text-area-style="{ width: '100%' }"
                :outer-style="{ width: '100%' }"
                :value="singlePetaFileInfo.petaFile.name"
                :look="singlePetaFileInfo.petaFile.name"
                @update:value="changeName" />
            </e-value>
          </e-data>
          <e-data>
            <e-name>{{ t("browser.property.infos.note") }}:</e-name>
            <e-value>
              <VTextarea
                :type="'multi'"
                :click-to-edit="true"
                :allow-empty="true"
                :text-area-style="{ width: '100%', overflowY: 'auto', maxHeight: '64px' }"
                :outer-style="{ width: '100%' }"
                :value="note"
                @update:value="changeNote" />
            </e-value>
          </e-data>
          <e-data>
            <e-name>{{ t("browser.property.infos.size") }}:</e-name>
            <e-value
              >{{ singlePetaFileInfo.petaFile.metadata.width }}px,
              {{ singlePetaFileInfo.petaFile.metadata.height }}px</e-value
            >
          </e-data>
          <e-data>
            <e-name>{{ t("browser.property.infos.mimeType") }}:</e-name>
            <e-value>{{ singlePetaFileInfo.petaFile.metadata.mimeType }}</e-value>
          </e-data>
          <!-- <e-data>
          <e-name>{{ t("browser.property.infos.fileDate") }}</e-name>
          <e-value>{{ singlePetaFileInfo.fileDate }}</e-value>
        </e-data> -->
          <e-data>
            <e-name>{{ t("browser.property.infos.addDate") }}:</e-name>
            <e-value>{{ singlePetaFileInfo.addDate }}</e-value>
          </e-data>
        </e-datas>
      </e-infos>
      <e-colors v-if="singlePetaFileInfo" class="content-child">
        <p>{{ t("browser.property.colors.label") }}</p>
        <e-palette>
          <e-color-wrapper>
            <e-color
              v-for="color in singlePetaFileInfo.palette"
              :key="color.id"
              :style="{
                backgroundColor: `rgb(${color.color.r}, ${color.color.g}, ${color.color.b})`,
                flex: Math.floor(color.population * 90 + 10),
              }"
              @click="changeCurrentColor(color.color)">
            </e-color>
          </e-color-wrapper>
          <e-current-color v-if="currentColor">
            <e-color-label
              ><e-name>RGB:</e-name> <e-value> {{ toRGB(currentColor) }}</e-value></e-color-label
            >
            <e-color-label
              ><e-name>HEX:</e-name> <e-value> #{{ toHEX(currentColor) }}</e-value></e-color-label
            >
            <e-color-label
              ><e-name>HSL:</e-name> <e-value> {{ toHSL(currentColor) }}</e-value></e-color-label
            >
            <e-color-wrapper
              ><e-color
                :style="{
                  backgroundColor: `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`,
                  flex: 1,
                }"></e-color
            ></e-color-wrapper>
          </e-current-color>
        </e-palette>
      </e-colors>
      <e-color-circle v-if="singlePetaFileInfo" class="content-child">
        <VGamutMap :peta-file="singlePetaFileInfo.petaFile" />
      </e-color-circle>
    </e-shrinks>
    <e-fixed class="content">
      <e-tags v-show="!noImage" class="content-child">
        <p>
          {{
            singlePetaFileInfo !== undefined
              ? t("browser.property.tags")
              : t("browser.property.mutualTags")
          }}
        </p>
        <e-search-box v-if="!fetchingTags">
          <e-tag v-for="tag in mutualPetaTags" :key="tag.id">
            <VTextarea
              :type="'single'"
              :trim="true"
              :click-to-edit="true"
              :allow-empty="true"
              :readonly="true"
              :blur-to-reset="true"
              :complements="complements"
              :value="tag.name"
              :look="tag.name"
              @click="selectTag(tag)"
              @contextmenu="tagMenu($event, tag)" />
          </e-tag>
          <e-tag class="last">
            <VTextarea
              ref="tagInput"
              :type="'single'"
              :trim="true"
              :look="textsStore.state.value.plus + '       '"
              :click-to-edit="true"
              :blur-to-reset="true"
              :complements="complements"
              :text-area-style="{ width: '100%' }"
              :outer-style="{ width: '100%' }"
              :no-outline="true"
              @update:value="addTag" />
          </e-tag>
        </e-search-box>
        <ul v-else>
          <li>
            {{ t("browser.property.fetchingTags") }}
          </li>
        </ul>
      </e-tags>
      <e-nsfw v-show="!noImage" class="content-child">
        <p>{{ t("browser.property.nsfw.label") }}</p>
        <label>
          <VCheckbox :value="nsfw ?? false" @update:value="changeNSFW" />
        </label>
      </e-nsfw>
    </e-fixed>
  </e-property-root>
</template>

<script setup lang="ts">
//
// import { Options, Vue } from "vue-class-component";
// import { Prop, Ref, Watch } from "vue-property-decorator";
import dateFormat from "dateformat";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import VGamutMap from "@/renderer/components/commons/property/VGamutMap.vue";
import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox.vue";
import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea.vue";

import { PetaColor } from "@/commons/datas/petaColor";
import { RPetaFile } from "@/commons/datas/rPetaFile";
import { RPetaTag } from "@/commons/datas/rPetaTag";
import { rgb2hex, rgb2hsl } from "@/commons/utils/colors";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";

import { IPC } from "@/renderer/libs/ipc";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { usePetaFilesStore } from "@/renderer/stores/petaFilesStore/usePetaFilesStore";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

const emit = defineEmits<{
  (e: "selectTag", tag: RPetaTag): void;
}>();
const props = defineProps<{
  petaFiles: RPetaFile[];
}>();
const textsStore = useTextsStore();
const petaTagsStore = usePetaTagsStore();
const petaFilesStore = usePetaFilesStore();
const components = useComponentsStore();
const { t } = useI18n();
const fetchingTags = ref(false);
const note = ref("");
const mutualPetaTags = ref<RPetaTag[]>([]);
const tagInput = ref<InstanceType<typeof VTextarea>>();
const currentColor = ref<PetaColor | undefined>();
async function addTag(name: string) {
  await IPC.common.updatePetaFilesPetaTags(
    props.petaFiles.map((petaFile) => petaFile.id),
    [{ type: "name", name }],
    "insert",
  );
  setTimeout(() => {
    tagInput.value?.edit();
  }, 100);
}
async function removeTag(petaTag: RPetaTag) {
  await IPC.common.updatePetaFilesPetaTags(
    props.petaFiles.map((petaFile) => petaFile.id),
    [{ type: "id", id: petaTag.id }],
    "remove",
  );
}
function changeName(name: string) {
  if (singlePetaFileInfo.value === undefined) {
    return;
  }
  singlePetaFileInfo.value.petaFile.name = name;
  petaFilesStore.updatePetaFiles([singlePetaFileInfo.value.petaFile], "update");
}
function changeNote(note: string) {
  if (singlePetaFileInfo.value === undefined) {
    return;
  }
  singlePetaFileInfo.value.petaFile.note = note;
  petaFilesStore.updatePetaFiles([singlePetaFileInfo.value.petaFile], "update");
}
function changeNSFW(value: boolean) {
  props.petaFiles.forEach((pi) => {
    pi.nsfw = value;
  });
  petaFilesStore.updatePetaFiles(props.petaFiles, "update");
}
function tagMenu(event: PointerEvent | MouseEvent, tag: RPetaTag) {
  components.contextMenu.open(
    [
      {
        label: t("browser.property.tagMenu.remove", [tag.name]),
        click: () => {
          removeTag(tag);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
function selectTag(tag: RPetaTag) {
  emit("selectTag", tag);
}
function changeCurrentColor(color: PetaColor | undefined) {
  if (color === undefined) {
    return;
  }
  currentColor.value = color;
}
function toHEX(color: PetaColor) {
  return rgb2hex(color).toUpperCase();
}
function toRGB(color: PetaColor) {
  return `${color.r}, ${color.g}, ${color.b}`;
}
function toHSL(color: PetaColor) {
  const hsl = rgb2hsl(color);
  return `${Math.floor(hsl[0])}, ${Math.floor(hsl[1])}%, ${Math.floor(hsl[2])}%`;
}
const fetchPetaTags = (() => {
  let fetchId = 0;
  return async () => {
    const currentFetchId = ++fetchId;
    fetchingTags.value = true;
    if (noImage.value) {
      mutualPetaTags.value = [];
      fetchingTags.value = false;
      return;
    }
    const result = await IPC.common.getPetaTagIdsByPetaFileIds(
      props.petaFiles.map((petaFile) => petaFile.id),
    );
    if (currentFetchId !== fetchId) {
      return;
    }
    mutualPetaTags.value = petaTagsStore.state.petaTags.value
      .filter((pti) => result.find((id) => id === pti.id))
      .map((pi) => pi);
    fetchingTags.value = false;
  };
})();
const singlePetaFileInfo = computed(() => {
  if (props.petaFiles.length === 1) {
    const petaFile = props.petaFiles[0];
    if (petaFile === undefined) {
      return undefined;
    }
    const all = petaFile.metadata.palette.reduce((p, c) => {
      return p + c.population;
    }, 0);
    return {
      name: petaFile.name,
      petaFile: petaFile,
      fileDate: dateFormat(petaFile.fileDate, "yyyy/mm/dd hh:MM:ss"),
      addDate: dateFormat(petaFile.addDate, "yyyy/mm/dd hh:MM:ss"),
      palette: petaFile.metadata.palette.map((color, i) => {
        return {
          color,
          population: color.population / all,
          id: i,
        };
      }),
    };
  }
  return undefined;
});
const noImage = computed(() => {
  return props.petaFiles.length === 0;
});
const nsfw = computed(() => {
  let nsfw = false;
  let same = true;
  props.petaFiles.forEach((pi, i) => {
    if (i === 0) {
      nsfw = pi.nsfw;
      return;
    }
    if (nsfw !== pi.nsfw) {
      same = false;
    }
  });
  if (same) {
    return nsfw;
  }
  return undefined;
});
const complements = computed(() => {
  return petaTagsStore.state.petaTags.value
    .filter((pti) => {
      return mutualPetaTags.value.find((tag) => pti.id === tag.id) === undefined;
    })
    .map((pti) => {
      return pti.name;
    });
});
watch(
  () => props.petaFiles,
  () => {
    fetchPetaTags();
    if (singlePetaFileInfo.value) {
      note.value = singlePetaFileInfo.value.petaFile.note;
      changeCurrentColor(singlePetaFileInfo.value.palette[0]?.color);
    } else {
      note.value = "";
    }
  },
  { deep: true },
);
petaTagsStore.onUpdate((petaTagIds, petaFileIds) => {
  if (
    petaFileIds.find((id) => props.petaFiles.find((petaFile) => petaFile.id === id)) ||
    petaTagIds.find((id) => mutualPetaTags.value.find((petaTag) => petaTag.id === id)) ||
    fetchingTags.value
  ) {
    fetchPetaTags();
  }
});
</script>

<style lang="scss" scoped>
e-property-root {
  display: flex;
  position: relative;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  > .content {
    display: flex;
    flex-direction: column;
    > .content-child {
      > p {
        margin: var(--px-2);
        font-weight: bold;
        text-decoration: underline;
      }
    }
  }
  > e-shrinks {
    overflow-y: auto;
    > e-infos {
      display: flex;
      flex-direction: column;
      > e-datas {
        display: flex;
        flex-direction: column;
        > e-data {
          display: flex;
          gap: var(--px-1);
          margin: var(--px-1) 0px;
          > e-name {
            display: block;
            position: relative;
            width: 35%;
            text-align: right;
          }
          > e-value {
            display: block;
            width: 65%;
            word-break: break-word;
          }
        }
      }
    }
    > e-colors {
      > e-palette {
        display: block;
        padding: var(--px-2);
        width: 100%;
        e-color-wrapper {
          display: flex;
          margin: var(--px-0) 0px;
          box-shadow: 0px 0px 0px var(--px-border) var(--color-font);
          border-radius: var(--rounded);
          width: 100%;
          height: var(--px-2);
          overflow: hidden;
          > e-color {
            display: block;
            height: 100%;
            &:hover {
              transform: scaleX(1.5) scaleY(2);
              cursor: pointer;
            }
          }
        }
        > e-current-color {
          display: flex;
          flex-direction: column;
          > e-color-label {
            display: flex;
            margin: var(--px-1) 0px;
            > e-name {
              display: block;
              position: relative;
              padding: 0px var(--px-1);
              width: 30%;
              text-align: right;
            }
            > e-value {
              display: block;
              padding: 0px var(--px-1);
              width: 70%;
              user-select: text;
              word-break: break-word;
            }
          }
        }
      }
    }
    > e-color-circle {
      display: block;
      width: 100%;
    }
  }
  > e-fixed {
    flex: 1;
    > e-tags {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 128px;
      > e-search-box {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        outline: none;
        padding: var(--px-1) var(--px-1) 0px 0px;
        width: 100%;
        overflow-y: auto;
        text-align: left;
        word-break: break-word;
        > e-tag {
          display: inline-block;
          margin: 0px 0px var(--px-1) var(--px-1);
          box-shadow: var(--shadow-small);
          border-radius: var(--rounded);
          background-color: var(--color-1);
          padding: var(--px-1);
          &.last {
            flex: 1 1 64px;
            box-shadow: unset;
            background-color: unset;
            width: 100%;
          }
        }
      }
      > e-nsfw {
        display: block;
      }
    }
  }
  p {
    margin: var(--px-1) 0px;
    text-align: center;
  }
}
</style>
