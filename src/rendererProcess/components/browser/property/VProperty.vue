<template>
  <t-property-root>
    <t-infos v-if="singlePetaImageInfo">
      <p>{{$t("browser.property.infos.label")}}</p>
      <t-datas>
        <t-data>
          <t-name>{{$t("browser.property.infos.name")}}</t-name>
          <t-value>
            <VEditableLabel
              :label="singlePetaImageInfo.petaImage.name"
              :labelLook="singlePetaImageInfo.petaImage.name"
              :clickToEdit="true"
              :allowEmpty="true"
              :growWidth="true"
              @change="changeName"
            />
          </t-value>
        </t-data>
        <t-data>
          <t-name>{{$t("browser.property.infos.note")}}</t-name>
          <t-value>
            <textarea
              lock-keyboard
              ref="noteTextArea"
              v-model="note"
              @blur="blurNoteTextarea"
              @input="resizeNote"
            >
            </textarea>
          </t-value>
        </t-data>
        <t-data>
          <t-name>{{$t("browser.property.infos.fileDate")}}</t-name>
          <t-value>{{singlePetaImageInfo.fileDate}}</t-value>
        </t-data>
        <t-data>
          <t-name>{{$t("browser.property.infos.addDate")}}</t-name>
          <t-value>{{singlePetaImageInfo.addDate}}</t-value>
        </t-data>
      </t-datas>
      <t-palette>
        <t-color-background>
          <t-color
            v-for="color in singlePetaImageInfo.palette"
            :key="color.id"
            :style="{
              backgroundColor: color.color,
              flex: Math.floor(color.population * 80 + 20)
            }"
          >
          </t-color>
        </t-color-background>
      </t-palette>
    </t-infos>
    <t-tags v-show="!noImage">
      <p>{{$t("browser.property.tags")}}</p>
      <t-search-box v-if="!fetchingTags">
        <t-tag
          v-for="tag in sharedPetaTags"
          :key="tag.id"
        >
          <VEditableLabel
            :label="tag.name"
            :labelLook="tag.name"
            :clickToEdit="true"
            :allowEmpty="true"
            :readonly="true"
            @focus="complementTag"
            @click="selectTag(tag)"
            @contextmenu="tagMenu($event, tag)"
          />
        </t-tag>
        <t-tag class="last">
          <VEditableLabel
            :label="''"
            :labelLook="$texts.plus + '       '"
            :clickToEdit="true"
            @change="(name) => addTag(name)"
            @focus="complementTag"
            :growWidth="true"
            :noOutline="true"
          />
        </t-tag>
      </t-search-box>
      <ul v-else>
        <li>
          {{$t("browser.property.fetchingTags")}}
        </li>
      </ul>
    </t-tags>
    <section v-show="!noImage">
      <label>
        <input
          type="checkbox"
          tabindex="-1"
          :checked="nsfw"
          @change="changeNSFW(Boolean(($event.target as HTMLInputElement).checked))"
        >
          NSFW
        </label>
    </section>
  </t-property-root>
</template>

<script setup lang="ts">
// // Vue
// import { Options, Vue } from "vue-class-component";
// import { Prop, Ref, Watch } from "vue-property-decorator";
// Components
import VEditableLabel from "@/rendererProcess/components/utils/VEditableLabel.vue";
import VPropertyThumbnail from "@/rendererProcess/components/browser/property/VPropertyThumbnail.vue";
// Others
import { API } from "@/rendererProcess/api";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { MAX_PREVIEW_COUNT, UNTAGGED_ID } from "@/commons/defines";
import { PetaImage } from "@/commons/datas/petaImage";
import { UpdateMode } from "@/commons/api/interfaces/updateMode";
import { PropertyThumbnail } from "@/rendererProcess/components/browser/property/propertyThumbnail";
import { updatePetaImages } from "@/rendererProcess/utils/updatePetaImages";
import { createPetaTag, PetaTag } from "@/commons/datas/petaTag";
import { PetaTagInfo } from "@/commons/datas/petaTagInfo";
import dateFormat from "dateformat";
import { computed, nextTick, ref, watch, getCurrentInstance } from "vue";

const emit = defineEmits<{
  (e: "selectTag", tag: PetaTag): void
}>();
const props = defineProps<{
  petaImages: PetaImage[],
  petaTagInfos: PetaTagInfo[],
}>();
const fetchingTags = ref(false);
const note = ref("");
const sharedPetaTags = ref<PetaTag[]>([]);
const noteTextArea = ref<HTMLTextAreaElement>();
const _this = getCurrentInstance()!.proxy!;
async function addTag(name: string) {
  // タグを探す。なかったら作る。
  let petaTag = props.petaTagInfos.find((pti) => pti.petaTag.name === name)?.petaTag;
  // リクエスト2回飛ばさない
  if (!petaTag) {
    petaTag = createPetaTag(name);
    await API.send(
      "updatePetaTags",
      [petaTag],
      UpdateMode.UPSERT
    );
  }
  await API.send(
    "updatePetaImagesPetaTags",
    props.petaImages.map((petaImage) => petaImage.id),
    [petaTag.id],
    UpdateMode.UPSERT
  );
}
async function removeTag(petaTag: PetaTag) {
  await API.send(
    "updatePetaImagesPetaTags",
    props.petaImages.map((petaImage) => petaImage.id),
    [petaTag.id],
    UpdateMode.REMOVE
  );
}
function resizeNote() {
  if (noteTextArea.value === undefined) {
    return;
  }
  const _noteTextArea = noteTextArea.value;
  _noteTextArea.style.height = _noteTextArea.scrollHeight + 'px';//この行だけでOK？
  _noteTextArea.style.height = "auto";
  nextTick(()=>{
    _noteTextArea.style.height = _noteTextArea.scrollHeight + 'px';
  })
}
function changeName(name: string) {
  if (singlePetaImageInfo.value === undefined) {
    return;
  }
  singlePetaImageInfo.value.petaImage.name = name;
  API.send("updatePetaImages", [singlePetaImageInfo.value.petaImage], UpdateMode.UPDATE);
}
function blurNoteTextarea(e: FocusEvent) {
  const textarea = e.target as HTMLTextAreaElement;
  changeNote(textarea.value);
}
function changeNote(note: string) {
  if (singlePetaImageInfo.value === undefined) {
    return;
  }
  if (singlePetaImageInfo.value.petaImage.note === note) {
    return;
  }
  singlePetaImageInfo.value.petaImage.note = note;
  API.send("updatePetaImages", [singlePetaImageInfo.value.petaImage], UpdateMode.UPDATE);
}
function changeNSFW(value: boolean) {
  props.petaImages.forEach((pi, i) => {
    pi.nsfw = value;
  });
  updatePetaImages(props.petaImages, UpdateMode.UPDATE);
}
function clearSelection() {
  props.petaImages.forEach((pi) => {
    pi._selected = false;
  })
}
function complementTag(editableLabel: VEditableLabel) {
  _this.$components.complement.open(editableLabel, props.petaTagInfos.filter((pti) => {
    return pti.petaTag.id !== UNTAGGED_ID;
  }).map((pti) => {
    return pti.petaTag.name;
  }));
}
function tagMenu(event: PointerEvent, tag: PetaTag) {
  _this.$components.contextMenu.open([
    {
      label: _this.$t("browser.property.tagMenu.remove", [tag.name]),
      click: () => {
        removeTag(tag);
      }
    }
  ], vec2FromPointerEvent(event));
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
  const result = await API.send("getPetaTagIdsByPetaImageIds", props.petaImages.map((petaImage) => petaImage.id));
  sharedPetaTags.value = props.petaTagInfos.filter((pti) => result.find((id) => id === pti.petaTag.id)).map((pi) => pi.petaTag);
  fetchingTags.value = false;
}
const singlePetaImageInfo = computed(() => {
  if (props.petaImages.length === 1) {
    const petaImage = props.petaImages[0]!;
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
          id: i
        };
      })
    }
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
watch(() => props.petaImages, () => {
  fetchPetaTags();
  console.log("petaTags");
  if (singlePetaImageInfo.value) {
    note.value = singlePetaImageInfo.value.petaImage.note;
    nextTick(() => {
      resizeNote();
    })
  } else {
    note.value = "";
  }
});
watch(() => props.petaTagInfos, () => {
  fetchPetaTags();
});
</script>

<style lang="scss" scoped>
t-property-root {
  flex: 1;
  width: 100%;
  height: 100%;
  // color: #333333;
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  >t-infos {
    display: block;
    >t-datas {
      display: block;
      >t-data {
        display: flex;
        margin-bottom: 8px;
        &:last-child {
          margin-bottom: 0px;
        }
        >t-name {
          display: block;
          width: 40%;
          position: relative;
          text-align: right;
          padding: 0px 8px;
          &::after {
            position: absolute;
            right: 0px;
            content: ":";
          }
        }
        >t-value {
          padding: 0px 8px;
          display: block;
          width: 60%;
          word-break: break-word;
          >textarea {
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
    display: block;
    >t-palette {
      pointer-events: none;
      padding: 8px;
      display: block;
      width: 100%;
      >t-color-background {
        display: flex;
        border-radius: var(--rounded);
        height: 8px;
        width: 100%;
        overflow: hidden;
        box-shadow: 0px 0px 0px 1px #ffffff, 0px 0px 2px 1.5px rgba(0, 0, 0, 0.5);
        >t-color {
          height: 100%;
          display: block;
        }
      }
    }
  }
  >t-tags {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    >t-search-box {
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
      >t-tag {
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
  }
  p {
    text-align: center;
    margin: 4px 0px;
  }
}
</style>