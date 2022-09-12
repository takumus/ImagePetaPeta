<template>
  <t-property-root>
    <t-infos v-if="singlePetaImageInfo" class="content">
      <p>{{ t("browser.property.infos.label") }}</p>
      <t-datas>
        <t-data>
          <t-name>{{ t("browser.property.infos.name") }}</t-name>
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
          <t-name>{{ t("browser.property.infos.note") }}</t-name>
          <t-value>
            <VTextarea
              :type="'multi'"
              :clickToEdit="true"
              :allowEmpty="true"
              :textAreaStyle="{ width: '100%' }"
              :outerStyle="{ width: '100%' }"
              :value="note"
              @update:value="changeNote"
            />
          </t-value>
        </t-data>
        <t-data>
          <t-name>{{ t("browser.property.infos.size") }}</t-name>
          <t-value
            >{{ singlePetaImageInfo.petaImage.width }}px,
            {{ singlePetaImageInfo.petaImage.height }}px</t-value
          >
        </t-data>
        <t-data>
          <t-name>{{ t("browser.property.infos.fileDate") }}</t-name>
          <t-value>{{ singlePetaImageInfo.fileDate }}</t-value>
        </t-data>
        <t-data>
          <t-name>{{ t("browser.property.infos.addDate") }}</t-name>
          <t-value>{{ singlePetaImageInfo.addDate }}</t-value>
        </t-data>
      </t-datas>
    </t-infos>
    <t-colors v-if="singlePetaImageInfo" class="content">
      <p>{{ t("browser.property.colors.label") }}</p>
      <t-palette>
        <t-color-background>
          <t-color
            v-for="color in singlePetaImageInfo.palette"
            :key="color.id"
            :style="{
              backgroundColor: color.color,
              flex: Math.floor(color.population * 80 + 20),
            }"
          >
          </t-color>
        </t-color-background>
      </t-palette>
    </t-colors>
    <t-tags v-show="!noImage" class="content">
      <p>{{ t("browser.property.tags") }}</p>
      <t-search-box v-if="!fetchingTags">
        <t-tag v-for="tag in sharedPetaTags" :key="tag.id">
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
            :type="'single'"
            :trim="true"
            :look="textsStore.state.value.plus + '       '"
            :clickToEdit="true"
            :blurToReset="true"
            :complements="complements"
            :textAreaStyle="{ width: '100%' }"
            :outerStyle="{ width: '100%' }"
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
import { API } from "@/rendererProcess/api";
import { vec2FromPointerEvent } from "@/commons/utils/vec2";
import { UNTAGGED_ID } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import dateFormat from "dateformat";
import { computed, ref, watch } from "vue";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";
import { usePetaTagsStore } from "@/rendererProcess/stores/petaTagsStore";
import { usePetaImagesStore } from "@/rendererProcess/stores/petaImagesStore";

const emit = defineEmits<{
  (e: "selectTag", tag: PetaTag): void;
}>();
const props = defineProps<{
  petaImages: PetaImage[];
}>();
const textsStore = useTextsStore();
const petaTagsStore = usePetaTagsStore();
const petaImagesStore = usePetaImagesStore();
const components = useComponentsStore();
const { t } = useI18n();
const fetchingTags = ref(false);
const note = ref("");
const sharedPetaTags = ref<PetaTag[]>([]);
async function addTag(name: string) {
  // タグを探す。なかったら作る。
  let petaTag = petaTagsStore.state.petaTags.value.find((pti) => pti.name === name);
  // リクエスト2回飛ばさない
  if (!petaTag) {
    petaTag = createPetaTag(name);
    await petaTagsStore.updatePetaTags([petaTag], UpdateMode.INSERT);
  }
  await API.send(
    "updatePetaImagesPetaTags",
    props.petaImages.map((petaImage) => petaImage.id),
    [petaTag.id],
    UpdateMode.INSERT,
  );
}
async function removeTag(petaTag: PetaTag) {
  await API.send(
    "updatePetaImagesPetaTags",
    props.petaImages.map((petaImage) => petaImage.id),
    [petaTag.id],
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
function tagMenu(event: PointerEvent | MouseEvent, tag: PetaTag) {
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
function selectTag(tag: PetaTag) {
  emit("selectTag", tag);
}
async function fetchPetaTags() {
  fetchingTags.value = true;
  if (noImage.value) {
    sharedPetaTags.value = [];
    fetchingTags.value = false;
    return;
  }
  const result = await API.send(
    "getPetaTagIdsByPetaImageIds",
    props.petaImages.map((petaImage) => petaImage.id),
  );
  sharedPetaTags.value = petaTagsStore.state.petaTags.value
    .filter((pti) => result.find((id) => id === pti.id))
    .map((pi) => pi);
  fetchingTags.value = false;
}
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
          color: `rgb(${color.r}, ${color.g}, ${color.b})`,
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
    } else {
      note.value = "";
    }
  },
  { deep: true },
);
petaTagsStore.onUpdate((petaTagIds, petaImageIds) => {
  if (
    petaImageIds.find((id) => props.petaImages.find((petaImage) => petaImage.id === id)) ||
    petaTagIds.find((id) => sharedPetaTags.value.find((petaTag) => petaTag.id === id)) ||
    fetchingTags.value
  ) {
    fetchPetaTags();
  }
});
</script>

<style lang="scss" scoped>
t-property-root {
  width: 100%;
  // color: #333333;
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
        margin: 4px 0px;
        > t-name {
          display: block;
          width: 35%;
          position: relative;
          text-align: right;
          padding: 0px 8px;
          &::after {
            position: absolute;
            right: 0px;
            content: ":";
          }
        }
        > t-value {
          padding: 0px 8px;
          display: block;
          width: 65%;
          word-break: break-word;
          > textarea {
            width: 100%;
            height: 80px;
            resize: none;
            background-color: transparent;
            color: inherit;
            border: none;
            font-family: inherit;
            font-size: inherit;
          }
        }
      }
    }
  }
  > t-colors {
    > t-palette {
      pointer-events: none;
      padding: 8px;
      display: block;
      width: 100%;
      > t-color-background {
        display: flex;
        border-radius: var(--rounded);
        height: 8px;
        width: 100%;
        overflow: hidden;
        box-shadow: 0px 0px 0px 1px #ffffff, 0px 0px 2px 1.5px rgba(0, 0, 0, 0.5);
        > t-color {
          height: 100%;
          display: block;
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
      padding: 4px 4px 0px 0px;
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
        margin: 0px 0px 4px 4px;
        border-radius: var(--rounded);
        padding: 4px;
        background-color: var(--color-sub);
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
    margin: 4px 0px;
  }
}
</style>
