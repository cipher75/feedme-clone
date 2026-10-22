import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Card } from "@/components/ui/card";

// 원본 HTML은 렌더링하지 않는다(react-markdown 기본값). 링크는 새 탭으로 연다.
const PROSE =
  "px-6 py-6 text-[15px] leading-7 wrap-anywhere " +
  "[&_h1]:mt-7 [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold " +
  "[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold " +
  "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:font-semibold " +
  "[&_p]:mb-3.5 [&_a]:underline [&_a]:underline-offset-4 " +
  "[&_ul]:mb-3.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3.5 [&_ol]:list-decimal [&_ol]:pl-5 " +
  "[&_blockquote]:mb-3.5 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] " +
  "[&_pre]:mb-3.5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3.5 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] " +
  "[&_img]:max-w-full [&_table]:mb-3.5 [&_table]:block [&_table]:overflow-x-auto " +
  "[&_th]:border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1.5 [&_td]:border [&_td]:px-3 [&_td]:py-1.5";

export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <Card className={PROSE}>
      <div className="min-w-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => {
            void node;
            return <a {...props} target="_blank" rel="noopener noreferrer" />;
          },
          // 네이버 등은 다른 사이트에서 온 Referer를 가진 이미지 요청을 403으로 막는다.
          img: ({ node, alt, ...props }) => {
            void node;
            // eslint-disable-next-line @next/next/no-img-element
            return <img {...props} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" />;
          },
        }}
      >
        {markdown}
      </Markdown>
      </div>
    </Card>
  );
}
