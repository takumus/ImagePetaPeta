<template>
  <t-tags-root>
    <t-tags-top>
      <VTagCell
        @click="selectPetaTag()"
        :selected="selectedAll"
        :readonly="true"
        :look="`${t('browser.all')}(${petaImagesArray.length})`"
      />
    </t-tags-top>
    <t-tags>
      <VTagCell
        v-for="c in browserTags"
        :key="c.petaTag.id"
        :selected="(c.selected && draggingPetaTag === undefined) || draggingPetaTag === c.petaTag"
        @click="selectPetaTag(c.petaTag)"
        @mousedown="startDrag($event, c.petaTag)"
        :readonly="c.readonly"
        :value="c.petaTag.name"
        :look="`${c.petaTag.name}`"
        :ref="(element) => setVTagCellRef(element as any as VTagCellInstance, c.petaTag.id)"
        @update:value="(name) => changeTag(c.petaTag, name)"
        @contextmenu="tagMenu($event, c)"
        :style="{
          order: (orders[c.petaTag.id] ?? browserTags.length) * 2,
        }"
      />
      <t-drag-target></t-drag-target>
    </t-tags>
    <t-tag-dragging v-if="draggingPetaTag">
      <VTagCell
        :key="draggingPetaTag.id"
        :selected="true"
        :readonly="true"
        :value="draggingPetaTag.name"
        :look="`${draggingPetaTag.name}`"
        ref="draggingTagCell"
      />
    </t-tag-dragging>
    <t-tag-add>
      <t-tag>
        <VTextarea
          :type="'single'"
          :trim="true"
          :clickToEdit="true"
          :textAreaStyle="{ width: '100%' }"
          :outerStyle="{ width: '100%' }"
          :look="textsStore.state.value.plus"
          @update:value="addTag"
        />
      </t-tag>
    </t-tag-add>
  </t-tags-root>
</template>

<script setup lang="ts">
// Vue
import { computed, nextTick, onBeforeUpdate, ref, watch } from "vue";
import { PetaImage } from "@/commons/datas/petaImage";
import { PetaTag } from "@/commons/datas/petaTag";
import { BrowserTag } from "@/rendererProcess/components/browser/browserTag";
import { UpdateMode } from "@/commons/datas/updateMode";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { UNTAGGED_ID } from "@/commons/defines";
import { useTextsStore } from "@/rendererProcess/stores/textsStore";
import { useI18n } from "vue-i18n";
import { useComponentsStore } from "@/rendererProcess/stores/componentsStore";
import VTextarea from "@/rendererProcess/components/utils/VTextarea.vue";
import { usePetaTagsStore } from "@/rendererProcess/stores/petaTagsStore";
import VTagCell from "@/rendererProcess/components/browser/tags/VTagCell.vue";
type VTagCellInstance = InstanceType<typeof VTagCell>;
const emit = defineEmits<{
  (e: "update:selectedPetaTagIds", selectedPetaTagIds: string[]): void;
}>();
const props = defineProps<{
  petaImagesArray: PetaImage[];
  selectedPetaTagIds: string[];
}>();
const textsStore = useTextsStore();
const components = useComponentsStore();
const petaTagsStore = usePetaTagsStore();
const { t } = useI18n();
const vTagCells = ref<{ [key: string]: VTagCellInstance }>({});
const draggingPetaTag = ref<PetaTag>();
const draggingTagCell = ref<VTagCellInstance>();
const startDragOffset = ref(new Vec2());
const orders = ref<{ [key: string]: number }>({});
onBeforeUpdate(() => {
  vTagCells.value = {};
});
function setVTagCellRef(element: VTagCellInstance, id: string) {
  vTagCells.value[id] = element;
}
function startDrag(event: PointerEvent, petaTag: PetaTag) {
  const element = event.currentTarget as HTMLElement;
  if (element === undefined) {
    return;
  }
  const rect = element.getBoundingClientRect();
  startDragOffset.value = vec2FromPointerEvent(event);
  draggingPetaTag.value = petaTag;
  nextTick(() => {
    const draggingCellStyle = draggingTagCell.value?.$el.style as CSSStyleDeclaration;
    if (draggingCellStyle === undefined) {
      return;
    }
    draggingCellStyle.width = rect.width + "px";
    draggingCellStyle.height = rect.height + "px";
    const mouse = vec2FromPointerEvent(event);
    const style = draggingTagCell.value?.$el.style as CSSStyleDeclaration;
    style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
    const prevOrders = JSON.stringify(orders.value);
    function pointermove(event: PointerEvent) {
      const rect = element.getBoundingClientRect();
      const mouse = vec2FromPointerEvent(event);
      style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      let newOrder = 0;
      Object.keys(orders.value)
        .map((id) => {
          const element = vTagCells.value[id]?.$el as HTMLElement;
          const rect = element.getBoundingClientRect();
          return {
            order: orders.value[id] ?? 0,
            id,
            element,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
          };
        })
        .filter((o) => o.id !== petaTag.id)
        .sort((a, b) => a.order - b.order)
        .map((o) => {
          if (mouse.y > o.rect.y && mouse.y < o.rect.y + o.rect.height) {
            if (rect.y == o.rect.y) {
              //同じ高さにある
              if (mouse.x > o.rect.x + o.rect.width / 2) {
                newOrder = o.order + 1;
              }
            } else {
              //違う高さにある
              if (mouse.x > o.rect.x && mouse.x < o.rect.x + o.rect.width) {
                //ホバーした
                newOrder = o.order + (rect.y < o.rect.y ? 1 : 0);
              }
            }
          } else {
            if (mouse.y > o.rect.y + o.rect.height) {
              newOrder = o.order + 1;
            }
          }
          return o;
        })
        .forEach((o) => {
          if (o.order >= newOrder) {
            if (orders.value[o.id]) {
              orders.value[o.id]++;
            }
          }
        });
      orders.value[petaTag.id] = newOrder;
      Object.keys(orders.value)
        .map((id) => ({
          order: orders.value[id] ?? 0,
          id,
        }))
        .sort((a, b) => a.order - b.order)
        .forEach((o, index) => {
          orders.value[o.id] = index;
        });
    }
    function pointerup() {
      window.removeEventListener("pointermove", pointermove);
      window.removeEventListener("pointerup", pointerup);
      const afterOrders = JSON.stringify(orders.value);
      draggingPetaTag.value = undefined;
      if (prevOrders !== afterOrders) {
        petaTagsStore.updatePetaTags(
          Object.values(petaTagsStore.state.petaTags.value).map((petaTag) => ({
            type: "petaTag",
            petaTag: {
              ...petaTag,
              index: orders.value[petaTag.id] ?? 0,
            },
          })),
          UpdateMode.UPDATE,
        );
      }
    }
    window.addEventListener("pointermove", pointermove);
    window.addEventListener("pointerup", pointerup);
  });
}
function tagMenu(event: PointerEvent | MouseEvent, tag: BrowserTag) {
  if (tag.readonly) {
    return;
  }
  components.contextMenu.open(
    [
      {
        label: t("browser.tagMenu.remove", [tag.petaTag.name]),
        click: () => {
          removeTag(tag.petaTag);
        },
      },
    ],
    vec2FromPointerEvent(event),
  );
}
async function addTag(name: string) {
  await petaTagsStore.updatePetaTags([{ type: "name", name }], UpdateMode.INSERT);
}
async function removeTag(petaTag: PetaTag) {
  if (
    (await components.dialog.show(t("browser.removeTagDialog", [petaTag.name]), [
      t("commons.yes"),
      t("commons.no"),
    ])) === 0
  ) {
    await petaTagsStore.updatePetaTags([{ type: "id", id: petaTag.id }], UpdateMode.REMOVE);
    const index = props.selectedPetaTagIds.findIndex((pt) => pt === petaTag.id);
    if (index >= 0) {
      // props.selectedPetaTags.splice(index, 1);
      const newData = [...props.selectedPetaTagIds];
      newData.splice(index, 1);
      emit("update:selectedPetaTagIds", newData);
    }
  }
}
async function changeTag(petaTag: PetaTag, newName: string) {
  if (petaTag.name === newName) {
    return;
  }
  if (browserTags.value.find((c) => c.petaTag.name === newName)) {
    components.dialog.show(t("browser.tagAlreadyExistsDialog", [newName]), [t("commons.yes")]);
    return;
  }
  petaTag.name = newName;
  await petaTagsStore.updatePetaTags([{ type: "petaTag", petaTag }], UpdateMode.UPDATE);
  selectPetaTag(petaTag);
}
function selectPetaTag(petaTag?: PetaTag) {
  const newData = [...props.selectedPetaTagIds];
  const prevTags = props.selectedPetaTagIds.join(",");
  let single = false;
  if (
    !Keyboards.pressedOR(
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "MetaLeft",
      "MetaRight",
    )
  ) {
    newData.length = 0;
    single = true;
  }
  const untaggedId = props.selectedPetaTagIds.findIndex((id) => id === UNTAGGED_ID);
  if (untaggedId >= 0 || petaTag?.id === UNTAGGED_ID) {
    newData.length = 0;
  }
  if (petaTag) {
    if (!single) {
      if (!props.selectedPetaTagIds.includes(petaTag.id)) {
        newData.push(petaTag.id);
      }
    } else {
      newData.push(petaTag.id);
    }
  }
  const newTags = newData.join(",");
  if (prevTags === newTags) {
    return;
  }
  emit("update:selectedPetaTagIds", newData);
}
const browserTags = computed((): BrowserTag[] => {
  const browserTags = petaTagsStore.state.petaTags.value.map((petaTag): BrowserTag => {
    const count = petaTagsStore.state.petaTagCounts.value[petaTag.id];
    return {
      petaTag: petaTag,
      count: count !== undefined ? count : -1,
      selected: props.selectedPetaTagIds.find((id) => id === petaTag.id) !== undefined,
      readonly: petaTag.id === UNTAGGED_ID,
    };
  });
  return browserTags;
});
watch(
  petaTagsStore.state.petaTags,
  () => {
    petaTagsStore.state.petaTags.value.forEach((petaTag) => {
      orders.value[petaTag.id] = petaTag.index;
    });
  },
  { immediate: true },
);
const selectedAll = computed(() => {
  return props.selectedPetaTagIds.length === 0;
});
</script>

<style lang="scss" scoped>
t-tags-root {
  flex-direction: column;
  display: flex;
  width: 100%;
  height: 100%;
  > t-tag-add {
    padding: var(--px-1) var(--px-1) 0px 0px;
    > t-tag {
      padding: var(--px-1);
    }
  }
  > t-tags-top {
    outline: none;
    padding: var(--px-1) var(--px-1) 0px 0px;
    width: 100%;
    text-align: left;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--px-1);
  }
  > t-tags {
    outline: none;
    padding: var(--px-1) var(--px-1) 0px 0px;
    width: 100%;
    text-align: left;
    overflow-y: scroll;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--px-1);
    > t-drag-target {
      position: relative;
      width: 0px;
      &::after {
        width: 1px;
        height: 100%;
        background-color: #ff0000;
        content: "";
        position: absolute;
        display: block;
      }
    }
  }
  > t-tag-dragging {
    top: 0px;
    left: 0px;
    position: fixed;
    visibility: hidden;
  }
}
</style>
