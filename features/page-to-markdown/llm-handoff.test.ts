import { describe, expect, it } from "vitest";

import { buildHandoff } from "./llm-handoff";

describe("buildHandoff", () => {
  it("프롬프트를 본문 앞에 빈 줄로 붙여 URL에 담는다", () => {
    const handoff = buildHandoff("claude", "요약해줘", "# 제목\n본문");

    expect(handoff.clipboardText).toBeNull();
    const q = new URL(handoff.href).searchParams.get("q");
    expect(new URL(handoff.href).origin).toBe("https://claude.ai");
    expect(q).toBe("요약해줘\n\n# 제목\n본문");
  });

  it("프롬프트가 없으면 본문만 넘긴다", () => {
    const handoff = buildHandoff("chatgpt", "", "본문");

    expect(new URL(handoff.href).origin).toBe("https://chatgpt.com");
    expect(new URL(handoff.href).searchParams.get("q")).toBe("본문");
  });

  it("URL로 넘기기에 너무 길면 전체 텍스트를 클립보드로 돌리고 본문은 자르지 않는다", () => {
    const markdown = "가".repeat(20_000);
    const handoff = buildHandoff("chatgpt", "요약해줘", markdown);

    expect(handoff.clipboardText).toBe(`요약해줘\n\n${markdown}`);
    expect(new URL(handoff.href).searchParams.get("q")).toBeNull();
  });
});
