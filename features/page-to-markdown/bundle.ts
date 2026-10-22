import { strToU8, zipSync } from "fflate";

import { markdownFileName } from "./markdown-file";

export type Bundle =
  | { kind: "markdown"; body: string }
  | { kind: "zip"; body: Uint8Array };

const IMAGE_PATTERN = /(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
const MAX_IMAGES = 50;
const IMAGE_TIMEOUT_MS = 15_000;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function extensionOf(contentType: string | null, url: URL): string {
  const fromType = EXTENSIONS[(contentType ?? "").split(";")[0].trim().toLowerCase()];
  if (fromType) return fromType;
  return url.pathname.match(/\.([a-z0-9]{2,4})$/i)?.[1].toLowerCase() ?? "img";
}

async function fetchImage(src: string): Promise<{ bytes: Uint8Array; ext: string } | null> {
  try {
    const url = new URL(src);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    // Referer를 보내지 않아 핫링크 차단(네이버 등)을 피한다.
    const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    return {
      bytes: new Uint8Array(await res.arrayBuffer()),
      ext: extensionOf(res.headers.get("content-type"), url),
    };
  } catch {
    return null;
  }
}

/** 본문 이미지를 서버가 받아 images/ 아래에 넣은 zip을 만든다. 하나도 받지 못하면 본문 그대로 돌려준다. */
export async function bundleMarkdown(title: string, markdown: string): Promise<Bundle> {
  const sources = [...new Set([...markdown.matchAll(IMAGE_PATTERN)].map((m) => m[2]))].slice(
    0,
    MAX_IMAGES
  );
  const fetched = await Promise.all(sources.map(fetchImage));

  const files: Record<string, Uint8Array> = {};
  const localPath = new Map<string, string>();
  sources.forEach((src, i) => {
    const image = fetched[i];
    if (!image) return;
    const path = `images/${localPath.size + 1}.${image.ext}`;
    localPath.set(src, path);
    files[path] = image.bytes;
  });

  if (localPath.size === 0) return { kind: "markdown", body: markdown };

  const rewritten = markdown.replace(
    IMAGE_PATTERN,
    (whole, head: string, src: string, tail: string) => {
      const path = localPath.get(src);
      return path ? `${head}${path}${tail}` : whole;
    }
  );
  files[markdownFileName(title)] = strToU8(rewritten);
  return { kind: "zip", body: zipSync(files) };
}
