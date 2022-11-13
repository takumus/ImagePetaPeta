import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";
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
export function initSortHelper<T extends SortHelperData>(connections: {
  getElementFromId: (id: string) => HTMLElement;
  getIsDraggableFromId?: (id: string) => boolean;
  onChangeDraggingData: (data: T | undefined) => void;
  onSort?: () => void;
  onStartDrag?: (data: T) => void;
  orders: Ref<{ [key: string]: number }>;
  constraints: Ref<{
    [key: string]: SortHelperConstraint;
  }>;
  floatingCellElement: Ref<HTMLElement | undefined>;
  dragTargetLineElement: Ref<HTMLElement | undefined>;
}) {
  function startDrag(event: PointerEvent, data: T) {
    connections.onStartDrag?.(data);
    const id = data.id;
    if (connections.getIsDraggableFromId?.(id) === false) {
      return;
    }
    const startDragCellElement = event.currentTarget as HTMLElement;
    const startDragCellRect = startDragCellElement.getBoundingClientRect();
    const mouseDownPosition = vec2FromPointerEvent(event);
    const startDragOffset = new Vec2(8, 8); //vec2FromPointerEvent(event).getDiff(startDragCellRect);
    const prevOrders = JSON.stringify(connections.orders.value);
    let newOrder = connections.orders.value[id] ?? 0;
    // draggingData.value = data;
    connections.onChangeDraggingData(data);
    nextTick(() => {
      const floatingCellStyle = connections.floatingCellElement.value?.style as CSSStyleDeclaration;
      const dragTargetLineStyle = connections.dragTargetLineElement.value
        ?.style as CSSStyleDeclaration;
      const constraint = connections.constraints.value[id];
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
      setFloatingPosition(mouseDownPosition.clone().add(startDragOffset));
      function pointermove(event: PointerEvent) {
        const mouseMovePosition = vec2FromPointerEvent(event);
        const flexGap = 2;
        let minDistance = Infinity;
        setFloatingPosition(mouseMovePosition.clone().add(startDragOffset));
        startDragCellElement.style.opacity = "0.2";
        floatingCellStyle.visibility = "visible";
        if (initMovement) {
          initMovement = false;
        } else {
          dragTargetLineStyle.transition = "50ms";
        }
        Object.keys(connections.orders.value)
          .map((id) => ({
            order: connections.orders.value[id] ?? 0,
            constraint: connections.constraints.value[id] ?? { insertToX: true, insertToY: true },
            rect: connections.getElementFromId(id).getBoundingClientRect(),
          }))
          .sort((a, b) => a.order - b.order)
          .map((o) => {
            if (o.rect.y > mouseMovePosition.y || o.rect.y + o.rect.height < mouseMovePosition.y) {
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
              dragTargetLineStyle.width = o.rect.height + "px";
            } else {
              dragTargetLineStyle.width = o.rect.width + "px";
            }
            if (myMinDistance.type === "left") {
              dragTargetLineStyle.transform = `translate(${o.rect.x - flexGap}px, ${
                o.rect.y + o.rect.height / 2
              }px) rotate(90deg)`;
              newOrder = o.order;
            } else if (myMinDistance.type === "right") {
              dragTargetLineStyle.transform = `translate(${o.rect.x + o.rect.width + flexGap}px, ${
                o.rect.y + o.rect.height / 2
              }px) rotate(90deg)`;
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
        connections.orders.value[id] = newOrder;
        Object.keys(connections.orders.value)
          .map((id) => {
            return {
              order: connections.orders.value[id] ?? 0,
              id,
            };
          })
          .filter((o) => o.id !== id)
          .sort((a, b) => a.order - b.order)
          .forEach((o) => {
            if (o.order >= newOrder) {
              if (connections.orders.value[o.id]) {
                connections.orders.value[o.id]++;
              }
            }
          });
        Object.keys(connections.orders.value)
          .map((id) => ({
            order: connections.orders.value[id] ?? 0,
            id,
          }))
          .sort((a, b) => a.order - b.order)
          .forEach((o, index) => {
            connections.orders.value[o.id] = index;
          });
        window.removeEventListener("pointermove", pointermove);
        window.removeEventListener("pointerup", pointerup);
        // draggingData.value = undefined;
        connections.onChangeDraggingData(undefined);
        startDragCellElement.style.opacity = "unset";
        floatingCellStyle.visibility = "hidden";
        if (prevOrders !== JSON.stringify(connections.orders.value)) {
          connections.onSort?.();
        }
      }
      window.addEventListener("pointermove", pointermove);
      window.addEventListener("pointerup", pointerup);
    });
  }
  return {
    startDrag,
  };
}
