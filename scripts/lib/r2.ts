export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const accessKey = process.env.R2_ACCESS_KEY;
  const secretKey = process.env.R2_SECRET_KEY;
  const bucket = process.env.R2_BUCKET ?? "llm-news-flow";
  const accountId = process.env.R2_ACCOUNT_ID;

  if (!accessKey || !secretKey || !accountId) {
    throw new Error("R2 credentials not configured");
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const url = `${endpoint}/${bucket}/${key}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "Content-Length": buffer.length.toString(),
    },
    body: new Uint8Array(buffer),
  });

  if (!res.ok) {
    throw new Error(`R2 upload failed: ${res.status}`);
  }

  const publicDomain =
    process.env.R2_PUBLIC_DOMAIN ?? `${bucket}.${accountId}.r2.dev`;
  return `https://${publicDomain}/${key}`;
}
