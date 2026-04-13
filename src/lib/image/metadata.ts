export type ImageMetadata = {
  width: number;
  height: number;
  mimeType: string;
};

export function isPortraitImage({ width, height }: ImageMetadata) {
  return height >= width;
}
