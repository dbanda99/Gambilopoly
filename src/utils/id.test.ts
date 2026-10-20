import { afterEach, expect, it, vi } from "vitest";
import { randomId } from "./id";
afterEach(() => vi.unstubAllGlobals());
it("creates unique UUID v4 IDs on HTTP LAN origins without randomUUID", () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal("crypto", { getRandomValues });
  const ids = Array.from({ length: 100 }, randomId);
  expect(new Set(ids).size).toBe(100);
  for (const id of ids)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
});
