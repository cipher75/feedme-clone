import { ConvertError, convertPage } from "@/features/page-to-markdown/server";

const STATUS = {
  "invalid-url": 400,
  "fetch-failed": 502,
  "empty-content": 422,
} as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  try {
    return Response.json(await convertPage(body?.url));
  } catch (error) {
    if (error instanceof ConvertError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: STATUS[error.code] }
      );
    }
    throw error;
  }
}
