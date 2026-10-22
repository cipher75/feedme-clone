import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import Home from "@/app/page";

const PAGE = {
  title: "Use the saw, fear the saw",
  author: "Steph Ango",
  site: "stephango.com",
  markdown: "# 소제목\n\n본문 문단입니다.\n\n- 항목 하나",
};

const writeText = vi.fn().mockResolvedValue(undefined);
const open = vi.fn();

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  vi.stubGlobal("open", open);
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  writeText.mockClear();
  open.mockClear();
});

function stubConvert(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function convert(url = "https://stephango.com/saw") {
  render(
    <ThemeProvider attribute="class">
      <Home />
    </ThemeProvider>
  );
  fireEvent.change(screen.getByLabelText("웹 페이지 주소"), { target: { value: url } });
  fireEvent.click(screen.getByRole("button", { name: "변환" }));
}

test("변환하면 제목·저자 헤더와 렌더링된 Markdown이 보인다", async () => {
  const fetchMock = stubConvert(Response.json(PAGE));
  await convert();

  expect(await screen.findByRole("heading", { level: 2, name: PAGE.title })).toBeInTheDocument();
  expect(screen.getByText("Steph Ango")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "소제목" })).toBeInTheDocument();
  expect(screen.getByRole("listitem")).toHaveTextContent("항목 하나");
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/convert",
    expect.objectContaining({ body: JSON.stringify({ url: "https://stephango.com/saw" }) })
  );
});

test("지우기를 누르면 입력과 결과와 프롬프트 선택이 초기화된다", async () => {
  stubConvert(Response.json(PAGE));
  await convert();
  await screen.findByRole("heading", { level: 2, name: PAGE.title });
  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));

  fireEvent.click(screen.getByRole("button", { name: "지우기" }));

  expect(screen.getByLabelText("웹 페이지 주소")).toHaveValue("");
  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
});

test("복사하기는 Markdown 본문만 클립보드에 넣는다(프롬프트 없음)", async () => {
  stubConvert(Response.json(PAGE));
  await convert();
  await screen.findByRole("heading", { level: 2, name: PAGE.title });
  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));

  fireEvent.click(screen.getByRole("button", { name: /복사하기/ }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith(PAGE.markdown));
  expect(await screen.findByRole("button", { name: /복사됨/ })).toBeInTheDocument();
});

test("선택한 프롬프트가 본문 앞에 붙은 채로 Claude를 새 탭에서 연다", async () => {
  stubConvert(Response.json(PAGE));
  await convert();
  await screen.findByRole("heading", { level: 2, name: PAGE.title });
  fireEvent.click(screen.getByRole("button", { name: "한국어로 번역해줘" }));

  fireEvent.click(screen.getByRole("button", { name: /Claude로 열기/ }));

  await waitFor(() => expect(open).toHaveBeenCalled());
  const href = new URL(open.mock.calls[0][0]);
  expect(href.origin).toBe("https://claude.ai");
  expect(href.searchParams.get("q")).toBe(`한국어로 번역해줘\n\n${PAGE.markdown}`);
});

test("직접 입력을 고르면 입력란이 나타나고, 프롬프트를 고르지 않으면 본문만 넘긴다", async () => {
  stubConvert(Response.json(PAGE));
  await convert();
  await screen.findByRole("heading", { level: 2, name: PAGE.title });
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "직접 입력" }));
  fireEvent.change(screen.getByLabelText("직접 입력 프롬프트"), { target: { value: "3줄로 정리해줘" } });
  fireEvent.click(screen.getByRole("button", { name: /ChatGPT로 열기/ }));
  await waitFor(() => expect(open).toHaveBeenCalledTimes(1));
  expect(new URL(open.mock.calls[0][0]).searchParams.get("q")).toBe(`3줄로 정리해줘\n\n${PAGE.markdown}`);

  fireEvent.click(screen.getByRole("button", { name: "직접 입력" })); // 선택 해제
  expect(screen.queryByLabelText("직접 입력 프롬프트")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /ChatGPT로 열기/ }));
  await waitFor(() => expect(open).toHaveBeenCalledTimes(2));
  expect(new URL(open.mock.calls[1][0]).searchParams.get("q")).toBe(PAGE.markdown);
});

test("본문이 너무 길면 전체를 클립보드에 복사하고 붙여넣기 안내를 보여 준다", async () => {
  const long = { ...PAGE, markdown: "가".repeat(20_000) };
  stubConvert(Response.json(long));
  await convert();
  await screen.findByRole("heading", { level: 2, name: PAGE.title });
  fireEvent.click(screen.getByRole("button", { name: "요약해줘" }));

  fireEvent.click(screen.getByRole("button", { name: /ChatGPT로 열기/ }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`요약해줘\n\n${long.markdown}`));
  expect(await screen.findByText(/붙여넣기\(Ctrl\+V\)/)).toBeInTheDocument();
  expect(new URL(open.mock.calls[0][0]).searchParams.get("q")).toBeNull();
});

test("가져오기 실패는 오류 안내와 다시 시도 버튼으로 보이고, 다시 시도하면 변환된다", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ error: { code: "fetch-failed", message: "서버가 요청을 거부했습니다(HTTP 403)." } }, { status: 502 })
    )
    .mockResolvedValueOnce(Response.json(PAGE));
  vi.stubGlobal("fetch", fetchMock);
  await convert("https://example.com/private");

  expect(await screen.findByText("페이지를 가져오지 못했습니다")).toBeInTheDocument();
  expect(screen.getByText(/HTTP 403/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

  expect(await screen.findByRole("heading", { level: 2, name: PAGE.title })).toBeInTheDocument();
});

test("주소 형식 오류는 입력란 아래에 보이고, 빈 주소는 요청하지 않는다", async () => {
  const fetchMock = stubConvert(
    Response.json({ error: { code: "invalid-url", message: "http:// 또는 https://로 시작하는 올바른 주소를 입력하세요." } }, { status: 400 })
  );
  await convert("abc");
  expect(await screen.findByRole("alert")).toHaveTextContent("올바른 주소");

  fireEvent.change(screen.getByLabelText("웹 페이지 주소"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "변환" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("주소를 입력하세요");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("변환 중에 지우기를 누르면 늦게 온 응답이 결과를 되살리지 않는다", async () => {
  let resolve!: (res: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise<Response>((r) => (resolve = r))));
  await convert();
  fireEvent.click(screen.getByRole("button", { name: "지우기" }));

  resolve(Response.json(PAGE));
  await new Promise((r) => setTimeout(r, 20));

  expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  expect(screen.getByLabelText("웹 페이지 주소")).toHaveValue("");
});

test("이미지가 있는 글의 다운로드는 서버에서 이미지를 묶은 zip을 받아 저장한다", async () => {
  const withImage = { ...PAGE, markdown: "본문\n\n![](https://img.example.com/a.png)" };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(withImage))
    .mockResolvedValueOnce(new Response(new Uint8Array([80, 75]), { headers: { "content-type": "application/zip" } }));
  vi.stubGlobal("fetch", fetchMock);
  const createObjectURL = vi.fn().mockReturnValue("blob:x");
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }));
  await convert();
  await screen.findByRole("heading", { level: 2, name: PAGE.title });

  fireEvent.click(screen.getByRole("button", { name: /이미지 다운로드/ }));

  await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenLastCalledWith(
    "/api/download",
    expect.objectContaining({ body: JSON.stringify({ title: PAGE.title, markdown: withImage.markdown }) })
  );
  expect(createObjectURL.mock.calls[0][0].type).toBe("application/zip");
});
