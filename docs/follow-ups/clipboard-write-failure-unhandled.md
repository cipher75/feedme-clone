# 클립보드 쓰기 실패를 처리하지 않음

- 증상: 클립보드 권한이 거부되거나 비보안 컨텍스트면 `navigator.clipboard.writeText`가 reject된다. 복사하기는 반응이 없고, 긴 본문으로 ChatGPT·Claude 열기를 누르면 새 탭도 안내도 나타나지 않는다.
- 근거: code-review(low) 지적, `features/page-to-markdown/page-converter.tsx`의 `copyMarkdown`, `openLlm`. 실제 재현은 하지 않았다.
- 제안: 실패 시 toast 오류를 보이고, 긴 본문 경로에서는 안내를 바꿔 수동 복사를 유도한다.
