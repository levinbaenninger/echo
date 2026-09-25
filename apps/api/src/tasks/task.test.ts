import { expect, it } from "@effect/vitest";
import { Schema } from "effect";

import { TaskTitle } from "./task";

const isTaskTitle = Schema.is(TaskTitle);

it("a task title is trimmed, non-empty, and at most 200 characters", () => {
  expect(isTaskTitle("Write tests")).toBe(true);
  expect(isTaskTitle("x".repeat(200))).toBe(true);

  expect(isTaskTitle("")).toBe(false);
  expect(isTaskTitle("  padded  ")).toBe(false);
  expect(isTaskTitle("x".repeat(201))).toBe(false);
});
