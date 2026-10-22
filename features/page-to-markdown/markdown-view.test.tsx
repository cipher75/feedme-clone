import { render } from "@testing-library/react";
import { expect, test } from "vitest";

import { MarkdownView } from "./markdown-view";

test("본문 이미지는 Referer 없이 요청해 핫링크 차단을 피한다", () => {
  const { container } = render(
    <MarkdownView markdown="![](https://postfiles.pstatic.net/a/Stack.png?type=w966)" />
  );

  const img = container.querySelector("img");
  expect(img).toHaveAttribute("src", "https://postfiles.pstatic.net/a/Stack.png?type=w966");
  expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
});
