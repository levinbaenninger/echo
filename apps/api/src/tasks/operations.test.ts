import { expect, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";

import { TaskOperations, TaskOperationsLive } from "./operations";
import { TaskStore, TaskStoreFailure } from "./persistence/store";
import { TaskIdGenerationFailed, TaskIds } from "./ids";
import { TaskId, TaskNotFound } from "./task";
import { knownId, TaskIdsTest, taskStoreWith, TaskStoreTest } from "./test-layers";

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
  const store = taskStoreWith({});

  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.getTask(knownId).pipe(Effect.flip);

    expect(error).toStrictEqual(new TaskNotFound({ id: knownId, message: "Task not found" }));
  }).pipe(Effect.provide(operationsFor(store)));
});

it.effect("a store read failure remains available to the caller", () => {
  const failure = new TaskStoreFailure({
    operation: "findById",
    message: "Task store read failed",
    cause: new Error("database unavailable"),
  });

  const store = taskStoreWith({
    findById: () => Effect.fail(failure),
  });

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

  const store = taskStoreWith({
    insert: () => Effect.die("A task cannot be written without an ID"),
  });

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

  const store = taskStoreWith({
    insert: () => Effect.fail(failure),
  });

  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.createTask({ title: "Write tests" }).pipe(Effect.flip);

    expect(error).toBe(failure);
  }).pipe(Effect.provide(operationsFor(store)));
});

const secondId = TaskId.make("0f5c3b9e-1d2a-4c3b-8e7f-6a5b4c3d2e1f");

const sequentialTaskIds = Layer.effect(
  TaskIds,
  Effect.gen(function* () {
    const remaining = yield* Ref.make([knownId, secondId]);

    return TaskIds.of({
      next: () =>
        Ref.modify(remaining, ([next = knownId, ...rest]) => [next, rest]).pipe(Effect.orDie),
    });
  }),
);

it.effect("tasks are listed by title", () => {
  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const later = yield* tasks.createTask({ title: "Write docs" });
    const earlier = yield* tasks.createTask({ title: "Plan release" });

    expect(yield* tasks.listTasks).toEqual([earlier, later]);
  }).pipe(Effect.provide(operationsFor(TaskStoreTest, sequentialTaskIds)));
});

it.effect("an updated task replaces the stored title and completion state", () => {
  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const created = yield* tasks.createTask({ title: "Write tests" });

    const updated = yield* tasks.updateTask({
      id: created.id,
      title: "Write more tests",
      completed: true,
    });

    expect(updated).toEqual({ id: knownId, title: "Write more tests", completed: true });
    expect(yield* tasks.getTask(created.id)).toEqual(updated);
  }).pipe(Effect.provide(operationsFor()));
});

it.effect("updating a missing task returns a typed not-found error", () => {
  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;

    const error = yield* tasks
      .updateTask({ id: knownId, title: "Write tests", completed: true })
      .pipe(Effect.flip);

    expect(error).toStrictEqual(new TaskNotFound({ id: knownId, message: "Task not found" }));
  }).pipe(Effect.provide(operationsFor()));
});

it.effect("a deleted task can no longer be retrieved", () => {
  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const created = yield* tasks.createTask({ title: "Write tests" });
    yield* tasks.deleteTask(created.id);

    expect(yield* tasks.listTasks).toEqual([]);
    const error = yield* tasks.getTask(created.id).pipe(Effect.flip);
    expect(error._tag).toBe("TaskNotFound");
  }).pipe(Effect.provide(operationsFor()));
});

it.effect("deleting a missing task returns a typed not-found error", () => {
  return Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    const error = yield* tasks.deleteTask(knownId).pipe(Effect.flip);

    expect(error).toStrictEqual(new TaskNotFound({ id: knownId, message: "Task not found" }));
  }).pipe(Effect.provide(operationsFor()));
});
