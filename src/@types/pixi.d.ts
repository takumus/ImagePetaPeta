import "pixi.js";
import { Point, IPointData } from "pixi.js";
declare module "pixi.js" {
  export interface DisplayObject {
    toLocal(position: IPointData, from?: DisplayObject, point?: IPointData, skipUpdate?: boolean): Point;
    toGlobal(position: IPointData, point?: IPointData, skipUpdate?: boolean): Point;
  }
}
