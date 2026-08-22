import { del, get, put, type GetBlobResult } from "@vercel/blob";

function normalizeKey(key: string) {
  return key.replace(/^\/+/, "");
}

function assertBlobConfigured(oidcToken?: string) {
  const hasOidc = Boolean(process.env.BLOB_STORE_ID && (oidcToken || process.env.VERCEL_OIDC_TOKEN));
  const hasReadWriteToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (!hasOidc && !hasReadWriteToken) {
    throw new Error("知识库私有存储暂未配置，请稍后重试。");
  }
}

export async function putPrivateKnowledgeBlob(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string,
  oidcToken?: string,
) {
  assertBlobConfigured(oidcToken);
  const body = typeof data === "string" || Buffer.isBuffer(data) ? data : Buffer.from(data);
  const blob = await put(normalizeKey(key), body, {
    access: "private",
    addRandomSuffix: true,
    contentType,
    cacheControlMaxAge: 60,
    ...(oidcToken && process.env.BLOB_STORE_ID ? { oidcToken, storeId: process.env.BLOB_STORE_ID } : {}),
  });
  return { key: blob.pathname, url: blob.url };
}

export async function getPrivateKnowledgeBlob(key: string, ifNoneMatch?: string, oidcToken?: string): Promise<GetBlobResult | null> {
  assertBlobConfigured(oidcToken);
  return get(normalizeKey(key), {
    access: "private",
    ifNoneMatch,
    ...(oidcToken && process.env.BLOB_STORE_ID ? { oidcToken, storeId: process.env.BLOB_STORE_ID } : {}),
  });
}

export async function deletePrivateKnowledgeBlob(key: string, oidcToken?: string) {
  assertBlobConfigured(oidcToken);
  await del(normalizeKey(key), oidcToken && process.env.BLOB_STORE_ID ? { oidcToken, storeId: process.env.BLOB_STORE_ID } : undefined);
}

export function isKnowledgeBlobConfigured(oidcToken?: string) {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
    (process.env.BLOB_STORE_ID && (oidcToken || process.env.VERCEL_OIDC_TOKEN)),
  );
}
