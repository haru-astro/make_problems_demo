/** 画像の長辺の上限。これを超える場合は縮小してから保存する */
export const MAX_IMAGE_EDGE = 1600;

/** 縮小後に PNG のまま保存する上限。超えたら JPEG に変換する */
const PNG_KEEP_LIMIT = 800 * 1024;

export type PreparedImage = {
  base64: string;
  mimeType: "image/png" | "image/jpeg";
  width: number;
  height: number;
  size: number;
};

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function toBase64(blob: Blob) {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // 大きな配列を一度に展開するとスタックが溢れるため分割する
  const chunkSize = 0x8000;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * 選択された画像を長辺 1600px 以内に縮小し、base64 に変換する。
 * 図やグラフの文字がつぶれないよう、PNG は軽ければ PNG のまま保存する。
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選んでください");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を変換できませんでした");

  // JPEG は透明部分が黒くなるため、白で塗りつぶしてから描画する
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob: Blob | null = null;
  let mimeType: PreparedImage["mimeType"] = "image/jpeg";

  if (file.type === "image/png") {
    blob = await toBlob(canvas, "image/png");
    if (blob && blob.size <= PNG_KEEP_LIMIT) {
      mimeType = "image/png";
    } else {
      blob = null;
    }
  }

  if (!blob) {
    blob = await toBlob(canvas, "image/jpeg", 0.85);
    mimeType = "image/jpeg";
  }

  if (!blob) throw new Error("画像を変換できませんでした");

  return {
    base64: await toBase64(blob),
    mimeType,
    width,
    height,
    size: blob.size,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
