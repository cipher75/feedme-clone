export type LlmService = "chatgpt" | "claude";

export type Handoff = {
  /** 새 탭으로 열 주소. 텍스트가 너무 길면 입력창을 채우지 않는 기본 주소다. */
  href: string;
  /** 주소에 담지 못해 클립보드에 복사해야 하는 전체 텍스트. 주소에 담았으면 null. */
  clipboardText: string | null;
};

const ENDPOINTS: Record<LlmService, string> = {
  chatgpt: "https://chatgpt.com/",
  claude: "https://claude.ai/new",
};

// 브라우저와 각 서비스가 받아 주는 주소 길이는 정해져 있지 않아 보수적으로 잡는다.
const MAX_HREF_LENGTH = 6_000;

export function buildHandoff(
  service: LlmService,
  prompt: string,
  markdown: string
): Handoff {
  const text = prompt ? `${prompt}\n\n${markdown}` : markdown;
  const filled = new URL(ENDPOINTS[service]);
  filled.searchParams.set("q", text);

  // 공백을 '+'가 아닌 '%20'으로 보내 서비스 쪽 해석 차이를 피한다.
  const href = filled.href.replace(/\+/g, "%20");
  if (href.length <= MAX_HREF_LENGTH) {
    return { href, clipboardText: null };
  }
  return { href: ENDPOINTS[service], clipboardText: text };
}
