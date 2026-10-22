import { expect, it } from "vitest";

import { hasImages, markdownFileName } from "./markdown-file";

it("제목으로 .md 파일명을 만들고 파일명에 쓸 수 없는 문자는 지운다", () => {
  expect(markdownFileName("Use the saw, fear the saw")).toBe("Use the saw, fear the saw.md");
  expect(markdownFileName('A/B: "C"?')).toBe("A B C.md");
  expect(markdownFileName("a\\b")).toBe("a b.md");
  expect(markdownFileName("   ")).toBe("page.md");
});

it("http(s) 이미지가 있는 본문만 이미지 포함으로 본다", () => {
  expect(hasImages("글\n\n![](https://a.com/x.png)")).toBe(true);
  expect(hasImages("[링크](https://a.com) 그림 없음")).toBe(false);
});
