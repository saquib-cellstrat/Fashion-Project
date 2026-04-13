export type UploadAssetInput = {
  userId: string;
  filename: string;
  contentType: string;
};

export async function createUploadAsset(input: UploadAssetInput) {
  return {
    uploadUrl: "",
    assetUrl: "",
    ...input,
  };
}
