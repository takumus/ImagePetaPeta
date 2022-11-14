import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
import { ClickChecker } from "@/rendererProcess/utils/clickChecker";
import { nextTick, Ref } from "vue";

export type SortHelperData = {
  id: string;
};
export type SortHelperConstraint = {
  insertToX: boolean;
  insertToY: boolean;
  moveX: boolean;
  moveY: boolean;
};
export function initSortHelper<T extends SortHelperData>(
  functions: {
    getElementFromId: (id: string) => HTMLElement;
    onChangeDraggingData: (data: T | undefined) => void;
    onSort?: () => void;
    getIsDraggableFromId?: (id: string) => boolean;
    onStartDrag?: (data: T) => void;
    onClick?: (event: MouseEvent, data: T) => void;
  },
  refs: {
    orders: Ref<{ [key: string]: number }>;
    constraints: Ref<{
      [key: string]: SortHelperConstraint;
    }>;
    floatingCellElement: Ref<HTMLElement | undefined>;
  },
  config?: {
    flexGap?: number;
  },
) {
  const dragTargetLineElement = document.createElement("t-drag-target-line");
  dragTargetLineElement.classList.add("t-drag-target-line");
  dragTargetLineElement.style.display = "none";
  const click = new ClickChecker();
  const flexGap = config?.flexGap ?? 0;
  let dragTargetLineElementAdded = false;
  function destroy() {
    dragTargetLineElement.remove();
  }
  function pointerdown(event: PointerEvent, data: T) {
    const startDragCellElement = event.currentTarget as HTMLElement;
    if (!dragTargetLineElementAdded) {
      startDragCellElement.parentElement?.appendChild(dragTargetLineElement);
    }
    dragTargetLineElementAdded = true;
    click.on("startDrag", (event) => {
      startDrag(event);
    });
    click.on("click", (event) => {
      functions.onClick?.(event, data);
    });
    click.down();
    function startDrag(event: PointerEvent) {
      dragTargetLineElement.style.display = "block";
      const startDrag = vec2FromPointerEvent(event);
      functions.onStartDrag?.(data);
      const id = data.id;
      if (functions.getIsDraggableFromId?.(id) === false) {
        return;
      }
      const startDragCellRect = startDragCellElement.getBoundingClientRect();
      const startDragOffset = new Vec2(8, 8); //vec2FromPointerEvent(event).getDiff(startDragCellRect);
      const prevOrders = JSON.stringify(refs.orders.value);
      let newOrder = refs.orders.value[id] ?? 0;
      // draggingData.value = data;
      functions.onChangeDraggingData(data);
      nextTick(() => {
        const floatingCellStyle = refs.floatingCellElement.value?.style as CSSStyleDeclaration;
        const dragTargetLineStyle = dragTargetLineElement.style as CSSStyleDeclaration;
        const constraint = refs.constraints.value[id];
        const setFloatingPosition = (position: Vec2) => {
          if (constraint?.moveX === false) {
            position.x = startDragCellRect.x;
          }
          if (constraint?.moveY === false) {
            position.y = startDragCellRect.y;
          }
          floatingCellStyle.transform = `translate(${position.x}px, ${position.y}px)`;
        };
        let initMovement = true;
        floatingCellStyle.width = startDragCellRect.width + "px";
        floatingCellStyle.height = startDragCellRect.height + "px";
        dragTargetLineStyle.transition = "unset";
        setFloatingPosition(startDrag.clone().add(startDragOffset));
        function pointermove(event: PointerEvent) {
          const mouseMovePosition = vec2FromPointerEvent(event);
          let minDistance = Infinity;
          setFloatingPosition(mouseMovePosition.clone().add(startDragOffset));
          startDragCellElement.style.opacity = "0.2";
          floatingCellStyle.visibility = "visible";
          if (initMovement) {
            initMovement = false;
          } else {
            dragTargetLineStyle.transition = "50ms";
          }
          Object.keys(refs.orders.value)
            .map((id) => ({
              order: refs.orders.value[id] ?? 0,
              constraint: refs.constraints.value[id] ?? { insertToX: true, insertToY: true },
              rect: functions.getElementFromId(id).getBoundingClientRect(),
            }))
            .sort((a, b) => a.order - b.order)
            .map((o) => {
              if (
                o.rect.y > mouseMovePosition.y ||
                o.rect.y + o.rect.height < mouseMovePosition.y
              ) {
                return;
              }
              const distances = {
                left: o.constraint.insertToX
                  ? mouseMovePosition.getDistance({
                      x: o.rect.x,
                      y: o.rect.y + o.rect.height / 2,
                    })
                  : Infinity,
                right: o.constraint.insertToX
                  ? mouseMovePosition.getDistance({
                      x: o.rect.x + o.rect.width,
                      y: o.rect.y + o.rect.height / 2,
                    })
                  : Infinity,
                top: o.constraint.insertToY
                  ? mouseMovePosition.getDistance({
                      x: o.rect.x + o.rect.width / 2,
                      y: o.rect.y,
                    })
                  : Infinity,
                bottom: o.constraint.insertToY
                  ? mouseMovePosition.getDistance({
                      x: o.rect.x + o.rect.width / 2,
                      y: o.rect.y + o.rect.height,
                    })
                  : Infinity,
              };
              const myMinDistance = Object.keys(distances)
                .map((key) => {
                  const type = key as keyof typeof distances;
                  return {
                    type,
                    distance: distances[type],
                  };
                })
                .sort((a, b) => {
                  return a.distance - b.distance;
                })[0];
              if (myMinDistance === undefined) {
                return;
              }
              if (myMinDistance.distance > minDistance) {
                return;
              }
              minDistance = myMinDistance.distance;
              dragTargetLineStyle.height = "2px";
              if (myMinDistance.type === "left" || myMinDistance.type === "right") {
                dragTargetLineStyle.width = o.rect.height - 4 + "px";
              } else {
                dragTargetLineStyle.width = o.rect.width - 4 + "px";
              }
              if (myMinDistance.type === "left") {
                dragTargetLineStyle.transform = `translate(${o.rect.x - flexGap}px, ${
                  o.rect.y + o.rect.height / 2
                }px) rotate(90deg)`;
                newOrder = o.order;
              } else if (myMinDistance.type === "right") {
                dragTargetLineStyle.transform = `translate(${
                  o.rect.x + o.rect.width + flexGap
                }px, ${o.rect.y + o.rect.height / 2}px) rotate(90deg)`;
                newOrder = o.order + 1;
              } else if (myMinDistance.type === "top") {
                dragTargetLineStyle.transform = `translate(${o.rect.x + o.rect.width / 2}px, ${
                  o.rect.y - flexGap
                }px)`;
                newOrder = o.order;
              } else if (myMinDistance.type === "bottom") {
                dragTargetLineStyle.transform = `translate(${o.rect.x + o.rect.width / 2}px, ${
                  o.rect.y + o.rect.height + flexGap
                }px)`;
                newOrder = o.order + 1;
              }
              return o;
            });
        }
        function pointerup() {
          refs.orders.value[id] = newOrder;
          Object.keys(refs.orders.value)
            .map((id) => {
              return {
                order: refs.orders.value[id] ?? 0,
                id,
              };
            })
            .filter((o) => o.id !== id)
            .sort((a, b) => a.order - b.order)
            .forEach((o) => {
              if (o.order >= newOrder && refs.orders.value[o.id] !== undefined) {
                refs.orders.value[o.id]++;
              }
            });
          Object.keys(refs.orders.value)
            .map((id) => ({
              order: refs.orders.value[id] ?? 0,
              id,
            }))
            .sort((a, b) => a.order - b.order)
            .forEach((o, index) => {
              refs.orders.value[o.id] = index;
            });
          window.removeEventListener("pointermove", pointermove);
          window.removeEventListener("pointerup", pointerup);
          // draggingData.value = undefined;
          functions.onChangeDraggingData(undefined);
          startDragCellElement.style.opacity = "unset";
          floatingCellStyle.visibility = "hidden";
          dragTargetLineElement.style.display = "none";
          if (prevOrders !== JSON.stringify(refs.orders.value)) {
            functions.onSort?.();
          }
        }
        window.addEventListener("pointermove", pointermove);
        window.addEventListener("pointerup", pointerup);
      });
    }
  }
  return {
    pointerdown,
    destroy,
  };
}
