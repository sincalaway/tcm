import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = vi.hoisted(() => ({ triggerReviewReminderByTaskUid: vi.fn() }));
const sdkMock = vi.hoisted(() => ({ sdk: { authenticateRequest: vi.fn() } }));
vi.mock("../db", () => dbMock);
vi.mock("../_core/sdk", () => sdkMock);

import { handleReviewReminderSchedule } from "./reviewReminders";

function response() { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; }

describe("复习提醒定时回调", () => {
  beforeEach(() => vi.clearAllMocks());

  it("仅接受平台认证的任务 UID，并交由数据库幂等触发", async () => {
    const res = response(); sdkMock.sdk.authenticateRequest.mockResolvedValue({ isCron: true, taskUid: "task-99" }); dbMock.triggerReviewReminderByTaskUid.mockResolvedValue({ ok: true, reminderId: 99 });
    await handleReviewReminderSchedule({} as never, res as never);
    expect(dbMock.triggerReviewReminderByTaskUid).toHaveBeenCalledWith("task-99");
    expect(res.json).toHaveBeenCalledWith({ ok: true, reminderId: 99 });
  });

  it("拒绝没有平台定时任务身份的请求", async () => {
    const res = response(); sdkMock.sdk.authenticateRequest.mockResolvedValue({ isCron: false });
    await handleReviewReminderSchedule({} as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(dbMock.triggerReviewReminderByTaskUid).not.toHaveBeenCalled();
  });
});
