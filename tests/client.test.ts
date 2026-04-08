import { describe, it, expect } from "vitest";
import { CampusmateClient } from "../src/client.js";

describe("CampusmateClient", () => {
  it("can be instantiated", () => {
    const client = new CampusmateClient();
    expect(client).toBeDefined();
  });

  it("has searchLecture method", () => {
    const client = new CampusmateClient();
    expect(typeof client.searchLecture).toBe("function");
  });

  it("has searchInstructor method", () => {
    const client = new CampusmateClient();
    expect(typeof client.searchInstructor).toBe("function");
  });

  it("has searchFulltext method", () => {
    const client = new CampusmateClient();
    expect(typeof client.searchFulltext).toBe("function");
  });

  it("has getDetail method", () => {
    const client = new CampusmateClient();
    expect(typeof client.getDetail).toBe("function");
  });
});
