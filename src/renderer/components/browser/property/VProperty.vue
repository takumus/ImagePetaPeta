<template>
  <t-property-root>
    <t-infos v-if="singlePetaImageInfo" class="content">
      <p>{{ t("browser.property.infos.label") }}</p>
      <t-datas>
        <t-data>
          <t-name>{{ t("browser.property.infos.name") }}:</t-name>
          <t-value>
            <VTextarea
              :type="'single'"
              :clickToEdit="true"
              :allowEmpty="true"
              :textAreaStyle="{ width: '100%' }"
              :outerStyle="{ width: '100%' }"
              :value="singlePetaImageInfo.petaImage.name"
              :look="singlePetaImageInfo.petaImage.name"
              @update:value="changeName"
            />
          </t-value>
        </t-data>
        <t-data>
          <t-name>{{ t("browser.property.infos.note") }}:</t-name>
          <t-value>
            <VTextarea
              :type="'multi'"
              :clickToEdit="true"
              :allowEmpty="true"
              :textAreaStyle="{ width: '100%', overflowY: 'auto', maxHeight: '64px' }"
              :outerStyle="{ width: '100%' }"
              :value="note"
              @update:value="changeNote"
            />
          </t-value>
        </t-data>
        <t-data>
          <t-name>{{ t("browser.property.infos.size") }}:</t-name>
          <t-value
            >{{ singlePetaImageInfo.petaImage.width }}px,
            {{ singlePetaImageInfo.petaImage.height }}px</t-value
          >
        </t-data>
        <!-- <t-data>
          <t-name>{{ t("browser.property.infos.fileDate") }}</t-name>
          <t-value>{{ singlePetaImageInfo.fileDate }}</t-value>
        </t-data> -->
        <t-data>
          <t-name>{{ t("browser.property.infos.addDate") }}:</t-name>
          <t-value>{{ singlePetaImageInfo.addDate }}</t-value>
        </t-data>
      </t-datas>
    </t-infos>
    <t-colors v-if="singlePetaImageInfo" class="content">
      <p>{{ t("browser.property.colors.label") }}</p>
      <t-palette>
        <t-color-wrapper>
          <t-color
            v-for="color in singlePetaImageInfo.palette"
            :key="color.id"
            :style="{
              backgroundColor: `rgb(${color.color.r}, ${color.color.g}, ${color.color.b})`,
              flex: Math.floor(color.population * 90 + 10),
            }"
            @click="changeCurrentColor(color.color)"
          >
          </t-color>
        </t-color-wrapper>
        <t-current-color v-if="currentColor">
          <t-color-label
            ><t-name>RGB:</t-name> <t-value> {{ toRGB(currentColor) }}</t-value></t-color-label
          >
          <t-color-label
            ><t-name>HEX:</t-name> <t-value> #{{ toHEX(currentColor) }}</t-value></t-color-label
          >
          <t-color-label
            ><t-name>HSL:</t-name> <t-value> {{ toHSL(currentColor) }}</t-value></t-color-label
          >
          <t-color-wrapper
            ><t-color
              :style="{
                backgroundColor: `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`,
                flex: 1,
              }"
            ></t-color
          ></t-color-wrapper>
        </t-current-color>
      </t-palette>
    </t-colors>
    <t-tags v-show="!noImage" class="content">
      <p>
        {{
          singlePetaImageInfo !== undefined
            ? t("browser.property.tags")
            : t("browser.property.mutualTags")
        }}
      </p>
      <t-search-box v-if="!fetchingTags">
        <t-tag v-for="tag in mutualPetaTags" :key="tag.id">
          <VTextarea
            :type="'single'"
            :trim="true"
            :clickToEdit="true"
            :allowEmpty="true"
            :readonly="true"
            :blurToReset="true"
            :complements="complements"
            :value="tag.name"
            :look="tag.name"
            @click="selectTag(tag)"
            @contextmenu="tagMenu($event, tag)"
          />
        </t-tag>
        <t-tag class="last">
          <VTextarea
            ref="tagInput"
            :type="'single'"
            :trim="true"
            :look="textsStore.state.value.plus + '       '"
            :clickToEdit="true"
            :blurToReset="true"
            :complements="complements"
            :textAreaStyle="{ width: '100%' }"
            :outerStyle="{ width: '100%' }"
            :noOutline="true"
            @update:value="addTag"
          />
        </t-tag>
      </t-search-box>
      <ul v-else>
        <li>
          {{ t("browser.property.fetchingTags") }}
        </li>
      </ul>
    </t-tags>
    <t-nsfw v-show="!noImage" class="content">
      <p>{{ t("browser.property.nsfw.label") }}</p>
      <label>
        <input
          type="checkbox"
          tabindex="-1"
          :checked="nsfw"
          @change="changeNSFW(Boolean(($event.target as HTMLInputElement).checked))"
        />
      </label>
    </t-nsfw>
  </t-property-root>
</template>

<script setup lang="ts">
// // Vue
// import { Options, Vue } from "vue-class-component";
// import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
// Others
import { IPC } from "@/renderer/ipc";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { UNTAGGED_ID } from "@/commons/defines";
import { UpdateMode } from "@/commons/datas/updateMode";
import dateFormat from "dateformat";
import { computed, ref, watch } from "vue";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import VTextarea from "@/renderer/components/utils/VTextarea.vue";
import { usePetaTagsStore } from "@/renderer/stores/petaTagsStore/usePetaTagsStore";
import { usePetaImagesStore } from "@/renderer/stores/petaImagesStore/usePetaImagesStore";
import { PetaColor } from "@/commons/datas/petaColor";
import { rgb2hex, rgb2hsl } from "@/commons/utils/colors";
import { RPetaImage } from "@/commons/datas/rPetaImage";
import { RPetaTag } from "@/commons/datas/rPetaTag";

const emit = defineEmits<{
  (e: "selectTag", tag: RPetaTag): void;
}>();
const props = defineProps<{
  petaImages: RPetaImage[];
}>();
const textsStore = useTextsStore();
const petaTagsStore = usePetaTagsStore();
const petaImagesStore = usePetaImagesStore();
const components = useComponentsStore();
const { t } = useI18n();
const fetchingTags = ref(false);
const note = ref("");
const mutualPetaTags = ref<RPetaTag[]>([]);
const tagInput = ref<InstanceType<typeof VTextarea>>();
const currentColor = ref<PetaColor | undefined>();
async function addTag(name: string) {
  await IPC.send(
    "updatePetaImagesPetaTags",
    props.petaImages.map((petaImage) => petaImage.id),
    [{ type: "name", name }],
    UpdateMode.INSERT,
  );
  setTimeout(() => {
    tagInput.value?.edit();
  }, 100);
}
async function removeTag(petaTag: RPetaTag) {
  await IPC.send(
    "updatePetaImagesPetaTags",
    props.petaImages.map((petaImage) => petaImage.id),
    [{ type: "id", id: petaTag.id }],
    UpdateMode.REMOVE,
  );
}
function changeName(name: string) {
  if (singlePetaImageInfo.value === undefined) {
    return;
  }
  singlePetaImageInfo.value.petaImage.name = name;
  petaImagesStore.updatePetaImages([singlePetaImageInfo.value.petaImage], UpdateMode.UPDATE);
}
function changeNote(note: string) {
  if (singlePetaImageInfo.value === undefined) {
    return;
  }
  singlePetaImageInfo.value.petaImage.note = note;
  petaImagesStore.updatePetaImages([singlePetaImageInfo.value.petaImage], UpdateMode.UPDATE);
}
function changeNSFW(value: boolean) {
  props.petaImages.forEach((pi) => {
    pi.nsfw = value;
  });
  petaImagesStore.updatePetaImages(props.petaImages, UpdateMode.UPDATE);
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
    const result = await IPC.send(
      "getPetaTagIdsByPetaImageIds",
      props.petaImages.map((petaImage) => petaImage.id),
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
const singlePetaImageInfo = computed(() => {
  if (props.petaImages.length === 1) {
    const petaImage = props.petaImages[0];
    if (petaImage === undefined) {
      return undefined;
    }
    const all = petaImage.palette.reduce((p, c) => {
      return p + c.population;
    }, 0);
    return {
      name: petaImage.name,
      petaImage: petaImage,
      fileDate: dateFormat(petaImage.fileDate, "yyyy/mm/dd hh:MM:ss"),
      addDate: dateFormat(petaImage.addDate, "yyyy/mm/dd hh:MM:ss"),
      palette: petaImage.palette.map((color, i) => {
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
  return props.petaImages.length === 0;
});
const nsfw = computed(() => {
  let nsfw = false;
  let same = true;
  props.petaImages.forEach((pi, i) => {
    if (i === 0) {
      nsfw = pi.nsfw;
      return;
    }
    if (nsfw != pi.nsfw) {
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
      return pti.id !== UNTAGGED_ID;
    })
    .filter((pti) => {
      return mutualPetaTags.value.find((tag) => pti.id === tag.id) === undefined;
    })
    .map((pti) => {
      return pti.name;
    });
});
watch(
  () => props.petaImages,
  () => {
    fetchPetaTags();
    if (singlePetaImageInfo.value) {
      note.value = singlePetaImageInfo.value.petaImage.note;
      changeCurrentColor(singlePetaImageInfo.value.palette[0]?.color);
    } else {
      note.value = "";
    }
  },
  { deep: true },
);
petaTagsStore.onUpdate((petaTagIds, petaImageIds) => {
  if (
    petaImageIds.find((id) => props.petaImages.find((petaImage) => petaImage.id === id)) ||
    petaTagIds.find((id) => mutualPetaTags.value.find((petaTag) => petaTag.id === id)) ||
    fetchingTags.value
  ) {
    fetchPetaTags();
  }
});
</script>

<style lang="scss" scoped>
t-property-root {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  > .content {
    > p {
      text-decoration: underline;
      font-weight: bold;
    }
  }
  > t-infos {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    > t-datas {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      > t-data {
        display: flex;
        margin: var(--px-1) 0px;
        > t-name {
          display: block;
          width: 35%;
          position: relative;
          text-align: right;
          padding: 0px var(--px-1);
        }
        > t-value {
          padding: 0px var(--px-1);
          display: block;
          width: 65%;
          word-break: break-word;
        }
      }
    }
  }
  > t-colors {
    > t-palette {
      padding: var(--px-2);
      display: block;
      width: 100%;
      t-color-wrapper {
        display: flex;
        border-radius: var(--rounded);
        height: var(--px-2);
        width: 100%;
        overflow: hidden;
        margin: var(--px-0) 0px;
        box-shadow: 0px 0px 0px var(--px-0) var(--color-border);
        > t-color {
          height: 100%;
          display: block;
          &:hover {
            cursor: pointer;
            transform: scaleX(1.5) scaleY(2);
          }
        }
      }
      > t-current-color {
        display: flex;
        flex-direction: column;
        > t-color-label {
          display: flex;
          margin: var(--px-1) 0px;
          > t-name {
            display: block;
            width: 30%;
            position: relative;
            text-align: right;
            padding: 0px var(--px-1);
          }
          > t-value {
            padding: 0px var(--px-1);
            display: block;
            width: 70%;
            word-break: break-word;
            user-select: text;
          }
        }
      }
    }
  }
  > t-tags {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 128px;
    > t-search-box {
      outline: none;
      padding: var(--px-1) var(--px-1) 0px 0px;
      width: 100%;
      word-break: break-word;
      text-align: left;
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
      overflow-y: auto;
      > t-tag {
        display: inline-block;
        margin: 0px 0px var(--px-1) var(--px-1);
        border-radius: var(--rounded);
        padding: var(--px-1);
        background-color: var(--color-1);
        &.last {
          width: 100%;
          background-color: unset;
          flex: 1 1 64px;
        }
      }
    }
    > t-nsfw {
      display: block;
    }
  }
  p {
    text-align: center;
    margin: var(--px-1) 0px;
  }
}
</style>
