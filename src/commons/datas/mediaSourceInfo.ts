export interface MediaSourceInfo {
  name: string;
  id: string;
  thumbnailDataURL: string;
  size?: {
    scale: number;
    width: number;
    height: number;
  };
}
