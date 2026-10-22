"use client";

import { useRef, useState } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CircleAlertIcon,
  CopyIcon,
  DownloadIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type { ConvertedPage } from "./convert";
import { buildHandoff, type LlmService } from "./llm-handoff";
import { hasImages, markdownFileName } from "./markdown-file";
import { MarkdownView } from "./markdown-view";

const PRESETS = ["요약해줘", "한국어로 번역해줘", "쉽게 설명해줘"] as const;
const CUSTOM = "직접 입력";
const SERVICE_NAME: Record<LlmService, string> = { chatgpt: "ChatGPT", claude: "Claude" };

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; page: ConvertedPage }
  | { kind: "error"; message: string };

export function PageConverter() {
  const [url, setUrl] = useState("");
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const [clipNote, setClipNote] = useState<LlmService | null>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const requestId = useRef(0);

  const loading = status.kind === "loading";
  const prompt = selected === CUSTOM ? custom.trim() : selected;

  function resetResult() {
    setSelected("");
    setCustom("");
    setClipNote(null);
    setCopied(false);
  }

  function clear() {
    requestId.current += 1; // 진행 중인 요청의 응답은 버린다.
    setUrl("");
    setHint("");
    setStatus({ kind: "idle" });
    resetResult();
  }

  async function convert() {
    if (loading) return;
    if (!url.trim()) return setHint("주소를 입력하세요.");
    setHint("");
    resetResult();
    setStatus({ kind: "loading" });
    const id = ++requestId.current;
    try {
      const res = await fetch("/api/convert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (id !== requestId.current) return;
      if (res.ok) {
        setStatus({ kind: "done", page: body });
      } else if (body.error?.code === "invalid-url") {
        setStatus({ kind: "idle" });
        setHint(body.error.message);
      } else {
        setStatus({ kind: "error", message: body.error?.message ?? "변환에 실패했습니다." });
      }
    } catch {
      if (id !== requestId.current) return;
      setStatus({ kind: "error", message: "서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요." });
    }
  }

  async function copyMarkdown(markdown: string) {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    toast.success("Markdown 본문을 복사했습니다");
    setTimeout(() => setCopied(false), 1800);
  }

  function saveBlob(blob: Blob, fileName: string) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    toast.success(`${fileName} 파일을 저장했습니다`);
  }

  async function download(page: ConvertedPage) {
    const fileName = markdownFileName(page.title);
    if (!hasImages(page.markdown)) {
      return saveBlob(new Blob([page.markdown], { type: "text/markdown;charset=utf-8" }), fileName);
    }

    // 이미지는 서버가 받아 오므로(브라우저에서는 핫링크 차단) 서버에서 묶어 받는다.
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: page.title, markdown: page.markdown }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const isZip = res.headers.get("content-type") === "application/zip";
      saveBlob(await res.blob(), isZip ? fileName.replace(/\.md$/, ".zip") : fileName);
    } catch {
      toast.error("파일을 만들지 못했습니다. 잠시 후 다시 시도하세요.");
    } finally {
      setDownloading(false);
    }
  }

  async function openLlm(service: LlmService, markdown: string) {
    const handoff = buildHandoff(service, prompt, markdown);
    if (handoff.clipboardText !== null) {
      await navigator.clipboard.writeText(handoff.clipboardText);
      setClipNote(service);
    } else {
      setClipNote(null);
    }
    window.open(handoff.href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void convert();
        }}
      >
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-0 flex-1 basis-72">
            <Input
              className="h-10 pr-10"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://example.com/article"
              aria-label="웹 페이지 주소"
              aria-invalid={hint ? true : undefined}
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setHint("");
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1 right-1"
              aria-label="지우기"
              onClick={clear}
            >
              <XIcon />
            </Button>
          </div>
          <Button type="submit" size="lg" className="h-10 px-4" disabled={loading}>
            <ArrowRightIcon data-icon="inline-start" />
            변환
          </Button>
        </div>
        {hint && (
          <p role="alert" className="text-sm text-destructive">
            {hint}
          </p>
        )}
      </form>

      {status.kind === "error" && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>페이지를 가져오지 못했습니다</AlertTitle>
          <AlertDescription>
            <p>{status.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void convert()}
            >
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card className="gap-3 p-6" aria-busy="true" aria-label="변환 중">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </Card>
      )}

      {status.kind === "done" && (
        <ResultView
          page={status.page}
          selected={selected}
          custom={custom}
          clipNote={clipNote}
          copied={copied}
          downloading={downloading}
          onSelect={setSelected}
          onCustom={setCustom}
          onCopy={() => void copyMarkdown(status.page.markdown)}
          onDownload={() => void download(status.page)}
          onOpen={(service) => void openLlm(service, status.page.markdown)}
        />
      )}
    </div>
  );
}

function ResultView(props: {
  page: ConvertedPage;
  selected: string;
  custom: string;
  clipNote: LlmService | null;
  copied: boolean;
  downloading: boolean;
  onSelect: (value: string) => void;
  onCustom: (value: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onOpen: (service: LlmService) => void;
}) {
  const { page } = props;
  const hasPrompt = props.selected === CUSTOM ? props.custom.trim() !== "" : props.selected !== "";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance">
          {page.title}
        </h2>
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
          {page.author && (
            <>
              <span>{page.author}</span>
              <span aria-hidden>·</span>
            </>
          )}
          {page.site !== page.author && (
            <>
              <span>{page.site}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <Badge variant="outline">약 {page.markdown.length.toLocaleString("ko-KR")}자</Badge>
        </p>
      </header>

      <Card className="gap-4 p-4">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">프롬프트 (선택)</h3>
          <ToggleGroup
            variant="outline"
            spacing={2}
            className="flex-wrap"
            aria-label="프롬프트 프리셋"
            value={props.selected ? [props.selected] : []}
            onValueChange={(value) => props.onSelect(value[0] ?? "")}
          >
            {[...PRESETS, CUSTOM].map((name) => (
              <ToggleGroupItem key={name} value={name} className="rounded-full px-3">
                {name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {props.selected === CUSTOM && (
            <Textarea
              aria-label="직접 입력 프롬프트"
              placeholder="LLM에게 전할 요청을 입력하세요. 저장되지 않고 이번에만 쓰입니다."
              value={props.custom}
              onChange={(e) => props.onCustom(e.target.value)}
            />
          )}
          <p className="text-sm text-muted-foreground">
            프롬프트는 ChatGPT·Claude로 열 때만 본문 앞에 붙습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={props.onCopy}>
            <CopyIcon data-icon="inline-start" />
            {props.copied ? "복사됨" : "복사하기"}
          </Button>
          <Button type="button" variant="outline" disabled={props.downloading} onClick={props.onDownload}>
            <DownloadIcon data-icon="inline-start" />
            {props.downloading ? "만드는 중" : hasImages(page.markdown) ? ".md + 이미지 다운로드" : ".md 다운로드"}
          </Button>
          <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />
          {(["chatgpt", "claude"] as const).map((service) => (
            <Button key={service} type="button" onClick={() => props.onOpen(service)}>
              {SERVICE_NAME[service]}로 열기
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          ))}
        </div>

        {props.clipNote && (
          <Alert role="status">
            <InfoIcon />
            <AlertTitle>본문이 길어 클립보드에 복사했습니다</AlertTitle>
            <AlertDescription>
              {SERVICE_NAME[props.clipNote]} 새 탭에서 입력창에 붙여넣기(Ctrl+V) 하세요.
              {hasPrompt ? " 프롬프트도 함께 복사되었습니다." : ""}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      <MarkdownView markdown={page.markdown} />
    </div>
  );
}
