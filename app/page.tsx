import { ThemeToggle } from "@/components/theme-toggle";
import { PageConverter } from "@/features/page-to-markdown";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 break-keep sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-primary font-mono text-[11px] text-primary-foreground">
            md
          </span>
          URL to Markdown
        </div>
        <ThemeToggle />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
          웹 페이지를 Markdown으로 바꿔 LLM에 바로 넘기세요
        </h1>
        <p className="text-muted-foreground">
          주소를 붙여넣으면 광고와 메뉴를 걷어낸 본문만 Markdown으로 가져옵니다.
        </p>
      </div>
      <PageConverter />
    </main>
  );
}
