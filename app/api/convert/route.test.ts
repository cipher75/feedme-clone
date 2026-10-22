// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const ARTICLE = `<!doctype html><html lang="en"><head><title>Use the saw, fear the saw</title>
<meta name="author" content="Steph Ango"><meta property="og:site_name" content="Steph Ango"></head>
<body><nav><a href="/">Home</a><a href="/about">About</a></nav>
<article><h1>Use the saw, fear the saw</h1>
<p>When I learned to use a table saw, my teacher impressed upon me that the machine wants to cut fingers. Fear the saw!</p>
<p>Powerful tools can do powerful things. If you want to make handmade wooden furniture you must cut wood, and your desire to have limbs and your desire to have furniture are not at odds if you respect the tool.</p>
<h2>Three rules</h2><ul><li>Understand what the tool wants.</li><li>Do one thing at a time.</li></ul></article>
<footer>Subscribe to my newsletter</footer></body></html>`;

function call(url: unknown) {
  return POST(
    new Request("http://localhost/api/convert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    })
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/convert", () => {
  it("페이지를 가져와 제목·저자·Markdown 본문을 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(ARTICLE, { status: 200, headers: { "content-type": "text/html" } })
      )
    );

    const res = await call("https://stephango.com/saw");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe("Use the saw, fear the saw");
    expect(body.author).toBe("Steph Ango");
    expect(body.markdown).toContain("Fear the saw!");
    expect(body.markdown).toContain("- Understand what the tool wants.");
    expect(body.markdown).not.toContain("About");
  });

  it("http/https가 아닌 주소는 400으로 거절하고 페이지를 가져오지 않는다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    for (const url of ["ftp://example.com/a", "not a url", "", undefined]) {
      const res = await call(url);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("invalid-url");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("원본 서버가 거부하면 상태 코드가 담긴 가져오기 실패를 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 403 })));

    const res = await call("https://example.com/private");
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error.code).toBe("fetch-failed");
    expect(body.error.message).toContain("403");
  });

  it("네트워크 오류도 가져오기 실패로 돌려준다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const res = await call("https://nonexistent.invalid/");

    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("fetch-failed");
  });

  it("본문을 찾지 못한 페이지는 추출 실패로 돌려준다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html><head><title>x</title></head><body><div id='root'></div></body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        })
      )
    );

    const res = await call("https://spa.example.com/");

    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("empty-content");
  });

  it("네이버 블로그는 mainFrame 안의 글 본문만 가져온다", async () => {
    const shell = '<html><body><iframe id="mainFrame" src="/PostView.naver?blogId=a&logNo=1"></iframe></body></html>';
    const post = `<html><head><title>글 제목 : 네이버 블로그</title></head><body>
      <div id="blog-menu"><a href="/x">메뉴 바로가기</a><a href="/y">이웃추가</a></div>
      <div class="se-main-container"><p>첫 번째 문단입니다. 충분히 긴 본문 내용을 담고 있습니다.</p><p>두 번째 문단입니다.</p></div></body></html>`;
    const fetchMock = vi.fn(async (input: URL | string) =>
      new Response(String(input).includes("PostView.naver") ? post : shell, {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await call("https://blog.naver.com/a/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.markdown).toContain("첫 번째 문단입니다");
    expect(body.markdown).not.toContain("이웃추가");
    expect(String(fetchMock.mock.calls[1][0])).toBe("https://blog.naver.com/PostView.naver?blogId=a&logNo=1");
  });

  it("TLS 인증서 오류는 원인을 알 수 있는 안내로 돌려준다", async () => {
    const error = Object.assign(new TypeError("fetch failed"), { cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" } });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await call("https://blog.naver.com/a/1");

    expect(res.status).toBe(502);
    expect((await res.json()).error.message).toContain("NODE_EXTRA_CA_CERTS");
  });
});
