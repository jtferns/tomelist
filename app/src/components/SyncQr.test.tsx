import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SyncQr } from "./SyncQr";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async (text: string) => `data:image/png;base64,${btoa(text)}`) },
}));

describe("SyncQr", () => {
  it("renders the link as a QR image", async () => {
    render(<SyncQr url="https://x.test/#sync=AAAAAAAAAAAAAAAAAAAAAA" />);
    const img = await screen.findByRole("img", { name: /qr code/i });
    expect(img.getAttribute("src")).toBe(`data:image/png;base64,${btoa("https://x.test/#sync=AAAAAAAAAAAAAAAAAAAAAA")}`);
  });
});
