// @vitest-environment node
import { unzipSync, strFromU8 } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const PNG = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

function call(body: unknown) {
  return POST(
    new Request("http://localhost/api/download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

function stubImages(map: Record<string, Response | "fail">) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      const hit = map[String(input)];
      if (!hit || hit === "fail") throw new TypeError("fetch failed");
      return hit;
    })
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/download", () => {
  it("이미지가 있으면 .md와 images/ 파일을 담은 zip을 돌려준다", async () => {
    stubImages({
      "https://img.example.com/a/Stack.png?type=w966": new Response(PNG, {
        headers: { "content-type": "image/png" },
      }),
      "https://img.example.com/b": new Response(new Uint8Array([1, 2]), {
        headers: { "content-type": "image/jpeg" },
      }),
    });
    const markdown =
      "본문\n\n![그림](https://img.example.com/a/Stack.png?type=w966)\n\n![](https://img.example.com/b)";

    const res = await call({ title: "글 제목", markdown });
    const files = unzipSync(new Uint8Array(await res.arrayBuffer()));

    expect(res.headers.get("content-type")).toBe("application/zip");
    expect(Object.keys(files).sort()).toEqual(["images/1.png", "images/2.jpg", "글 제목.md"]);
    expect(strFromU8(files["글 제목.md"])).toBe(
      "본문\n\n![그림](images/1.png)\n\n![](images/2.jpg)"
    );
    expect(files["images/1.png"]).toEqual(PNG);
  });

  it("받지 못한 이미지는 원래 주소를 그대로 두고, 하나도 받지 못하면 .md만 돌려준다", async () => {
    stubImages({ "https://img.example.com/x.png": "fail" });
    const markdown = "![](https://img.example.com/x.png)";

    const res = await call({ title: "t", markdown });

    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(await res.text()).toBe(markdown);
  });

  it("title과 markdown이 문자열이 아니면 400", async () => {
    const res = await call({ title: 1 });
    expect(res.status).toBe(400);
  });
});
