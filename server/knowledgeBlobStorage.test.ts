import { beforeEach, describe, expect, it, vi } from "vitest";

const blobMock = vi.hoisted(() => ({
  del: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
}));

vi.mock("@vercel/blob", () => blobMock);

import {
  deletePrivateKnowledgeBlob,
  getPrivateKnowledgeBlob,
  isKnowledgeBlobConfigured,
  putPrivateKnowledgeBlob,
} from "./knowledgeBlobStorage";

describe("private knowledge Blob storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLOB_STORE_ID = "store_test";
    delete process.env.VERCEL_OIDC_TOKEN;
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("writes knowledge files privately with a collision-resistant server-owned key", async () => {
    blobMock.put.mockResolvedValue({
      pathname: "knowledge/42/1700000000000-notes-abc123.md",
      url: "https://store.private.blob.vercel-storage.com/knowledge/42/1700000000000-notes-abc123.md",
    });

    await expect(putPrivateKnowledgeBlob("/knowledge/42/1700000000000-notes.md", "正文", "text/markdown", "request-oidc")).resolves.toEqual({
      key: "knowledge/42/1700000000000-notes-abc123.md",
      url: "https://store.private.blob.vercel-storage.com/knowledge/42/1700000000000-notes-abc123.md",
    });
    expect(blobMock.put).toHaveBeenCalledWith("knowledge/42/1700000000000-notes.md", "正文", {
      access: "private",
      addRandomSuffix: true,
      contentType: "text/markdown",
      cacheControlMaxAge: 60,
      oidcToken: "request-oidc",
      storeId: "store_test",
    });
  });

  it("reads and deletes by private pathname only", async () => {
    blobMock.get.mockResolvedValue({ statusCode: 200 });
    await getPrivateKnowledgeBlob("/knowledge/42/document.pdf", "etag-1", "request-oidc");
    await deletePrivateKnowledgeBlob("/knowledge/42/document.pdf", "request-oidc");
    expect(blobMock.get).toHaveBeenCalledWith("knowledge/42/document.pdf", { access: "private", ifNoneMatch: "etag-1", oidcToken: "request-oidc", storeId: "store_test" });
    expect(blobMock.del).toHaveBeenCalledWith("knowledge/42/document.pdf", { oidcToken: "request-oidc", storeId: "store_test" });
  });

  it("requires OIDC plus store id, or an explicit read-write token", () => {
    expect(isKnowledgeBlobConfigured()).toBe(false);
    expect(isKnowledgeBlobConfigured("request-oidc")).toBe(true);
    process.env.BLOB_READ_WRITE_TOKEN = "fallback-token";
    expect(isKnowledgeBlobConfigured()).toBe(true);
  });
});
