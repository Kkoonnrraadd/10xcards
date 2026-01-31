import { describe, it, expect } from "vitest";
import { extractUser } from "../auth";

describe("extractUser", () => {
  it("returns user when supabase.auth.getUser succeeds", async () => {
    const supabase = {
      auth: {
        getUser: async () => ({
          data: { user: { id: "u1", email: "u1@example.com" } },
          error: null,
        }),
      },
    } as any;

    const user = await extractUser(supabase);
    expect(user).toEqual({ id: "u1", email: "u1@example.com" });
  });

  it("returns null when error or no user is returned", async () => {
    const noUser = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as any;
    const withError = {
      auth: { getUser: async () => ({ data: { user: null }, error: { message: "boom" } }) },
    } as any;

    expect(await extractUser(noUser)).toBeNull();
    expect(await extractUser(withError)).toBeNull();
  });
});
