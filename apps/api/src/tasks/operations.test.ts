import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { TaskOperations, TaskOperationsLive } from "./operations";
import { TaskStore, TaskStoreFailure } from "./persistence/store";
import { TaskIdGenerationFailed, TaskIds } from "./ids";
import { knownId, TaskIdsTest, TaskStoreTest } from "./test-layers";

const operationsFor = (
  store: Layer.Layer<TaskStore> = TaskStoreTest,
  idSource: Layer.Layer<TaskIds> = TaskIdsTest,
) => TaskOperationsLive.pipe(Layer.provide(Layer.mergeAll(store, idSource)));

it.effect("a created task can be retrieved", () => {
  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const created = yield* tasks.createTask({ title: "Write tests" });
    const retrieved = yield* tasks.getTask(created.id);

    expect(created).toEqual({ id: knownId, title: "Write tests", completed: false });
    expect(retrieved).toEqual(created);
  }).pipe(Effect.provide(operationsFor()));
});

it.effect("a missing task returns its ID in a typed error", () => {
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.succeedNone,
      insert: () => Effect.void,
    }),
  );

  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.getTask(knownId).pipe(Effect.flip);

    expect(error).toMatchObject({
      _tag: "TaskNotFound",
      id: knownId,
      message: "Task not found",
    });
  }).pipe(Effect.provide(operationsFor(store)));
});

it.effect("a store read failure remains available to the caller", () => {
  const failure = new TaskStoreFailure({
    operation: "findById",
    message: "Task store read failed",
    cause: new Error("database unavailable"),
  });
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.fail(failure),
      insert: () => Effect.void,
    }),
  );

  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.getTask(knownId).pipe(Effect.flip);

    expect(error).toBe(failure);
  }).pipe(Effect.provide(operationsFor(store)));
});

it.effect("an ID generation failure does not write a task", () => {
  const failure = new TaskIdGenerationFailed({
    message: "Task ID generation failed",
    cause: new Error("crypto unavailable"),
  });
  const failingIds = Layer.succeed(TaskIds, TaskIds.of({ next: () => Effect.fail(failure) }));
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.succeedNone,
      insert: () => Effect.die("A task cannot be written without an ID"),
    }),
  );

  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.createTask({ title: "Write tests" }).pipe(Effect.flip);

    expect(error).toBe(failure);
  }).pipe(Effect.provide(operationsFor(store, failingIds)));
});

it.effect("a store write failure remains available to the caller", () => {
  const failure = new TaskStoreFailure({
    operation: "insert",
    message: "Task store write failed",
    cause: new Error("database unavailable"),
  });
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.succeedNone,
      insert: () => Effect.fail(failure),
    }),
  );

  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.createTask({ title: "Write tests" }).pipe(Effect.flip);

    expect(error).toBe(failure);
  }).pipe(Effect.provide(operationsFor(store)));
});
