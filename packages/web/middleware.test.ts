import { expect, test, describe } from "vitest";
import { config } from "./middleware";

describe("middleware config", () => {
    test("exports correct matcher config", () => {
        expect(config).toEqual({
            matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
        });
    });
});
