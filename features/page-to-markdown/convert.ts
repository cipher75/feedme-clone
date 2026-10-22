import { parseHTML } from "linkedom";
import { Defuddle } from "defuddle/node";

export type ConvertedPage = {
  title: string;
  author: string;
  site: string;
  markdown: string;
};

export type ConvertErrorCode = "invalid-url" | "fetch-failed" | "empty-content";

export class ConvertError extends Error {
  constructor(
    readonly code: ConvertErrorCode,
    message: string
  ) {
    super(message);
  }
}

const FETCH_TIMEOUT_MS = 15_000;

export function parseHttpUrl(input: unknown): URL {
  if (typeof input === "string") {
    try {
      const url = new URL(input.trim());
      if (url.protocol === "http:" || url.protocol === "https:") return url;
    } catch {
      // 아래에서 같은 오류로 처리한다.
    }
  }
  throw new ConvertError(
    "invalid-url",
    "http:// 또는 https://로 시작하는 올바른 주소를 입력하세요."
  );
}

async function fetchHtml(url: URL): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; PageToMarkdown/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[convert] fetch failed:", url.href, error);
    const code = String((error as { cause?: { code?: unknown } }).cause?.code ?? "");
    if (/CERT|SELF_SIGNED/.test(code)) {
      throw new ConvertError(
        "fetch-failed",
        "서버가 이 사이트의 TLS 인증서를 신뢰하지 못했습니다. 사내 프록시를 쓰는 환경이라면 서버 실행 시 NODE_EXTRA_CA_CERTS에 사내 루트 인증서를 지정하세요."
      );
    }
    throw new ConvertError(
      "fetch-failed",
      "페이지에 연결하지 못했습니다. 주소를 확인하거나 잠시 후 다시 시도하세요."
    );
  }
  if (!res.ok) {
    throw new ConvertError(
      "fetch-failed",
      `서버가 요청을 거부했습니다(HTTP ${res.status}). 로그인이 필요하거나 자동 접근을 막은 페이지일 수 있습니다.`
    );
  }
  return res.text();
}

// 네이버 블로그 주소는 껍데기 페이지이고, 글은 iframe#mainFrame 안에 있다.
const NAVER_BLOG_HOSTS = ["blog.naver.com", "m.blog.naver.com"];
const NAVER_POST_SELECTOR = ".se-main-container, #postViewArea";

export async function convertPage(input: unknown): Promise<ConvertedPage> {
  let url = parseHttpUrl(input);
  let html = await fetchHtml(url);
  let contentSelector: string | undefined;

  if (NAVER_BLOG_HOSTS.includes(url.hostname)) {
    const frameSrc = parseHTML(html).document
      .querySelector("iframe#mainFrame")
      ?.getAttribute("src");
    if (frameSrc) {
      url = new URL(frameSrc, url);
      html = await fetchHtml(url);
    }
    contentSelector = NAVER_POST_SELECTOR;
  }

  const { document } = parseHTML(html);
  const result = await Defuddle(document, url.href, { markdown: true, contentSelector });
  const markdown = result.content.trim();
  if (!markdown) {
    throw new ConvertError(
      "empty-content",
      "본문을 찾지 못했습니다. 로그인이 필요하거나 자바스크립트로만 그려지는 페이지일 수 있습니다."
    );
  }

  return {
    title: result.title || url.hostname,
    author: result.author || "",
    site: result.site || url.hostname,
    markdown,
  };
}
