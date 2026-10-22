import { bundleMarkdown } from "@/features/page-to-markdown/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.title !== "string" || typeof body?.markdown !== "string") {
    return Response.json({ error: { code: "invalid-body" } }, { status: 400 });
  }

  const bundle = await bundleMarkdown(body.title, body.markdown);
  if (bundle.kind === "zip") {
    return new Response(bundle.body as BodyInit, {
      headers: { "content-type": "application/zip" },
    });
  }
  return new Response(bundle.body, {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
