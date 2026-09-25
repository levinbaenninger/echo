import { expect, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";
import { RpcTest } from "effect/unstable/rpc";

import { TaskOperationsLive } from "../operations";
import { TaskStore, TaskStoreFailure } from "../persistence/store";
import { TaskIdGenerationFailed, TaskIds } from "../ids";
import { TaskNotFound } from "../task";
import { knownId, TaskIdsTest, taskStoreWith, TaskStoreTest } from "../test-layers";
import { DeleteTaskFailed, ListTasksFailed, TaskRpcs, UpdateTaskFailed } from "./contract";
import { TaskHandlers } from "./handlers";

const handlersFor = (
  store: Layer.Layer<TaskStore> = TaskStoreTest,
  idSource: Layer.Layer<TaskIds> = TaskIdsTest,
) =>
  TaskHandlers.pipe(
    Layer.provide(TaskOperationsLive.pipe(Layer.provide(Layer.mergeAll(store, idSource)))),
  );

it.effect("tasks can be created and read through the public RPC", () => {
  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const created = yield* client.createTask({ title: "Write tests" });
    const retrieved = yield* client.getTask({ id: created.id });

    expect(created).toEqual({ id: knownId, title: "Write tests", completed: false });
    expect(retrieved).toEqual(created);
  }).pipe(Effect.provide(handlersFor()));
});

it.effect("a task read failure has a safe RPC error", () => {
  const failure = new TaskStoreFailure({
    operation: "findById",
    message: "Task store failed during findById",
    cause: new Error("private database detail"),
  });

  const store = taskStoreWith({
    findById: () => Effect.fail(failure),
  });

  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const error = yield* client.getTask({ id: knownId }).pipe(Effect.flip);

    expect(error._tag).toBe("GetTaskFailed");
    expect(error.message).toBe("Unable to load task");
    expect(error).not.toHaveProperty("cause");
    const serialized = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(error);
    expect(serialized).not.toContain("private database detail");
  }).pipe(Effect.provide(handlersFor(store)));
});

it.effect("a missing task remains a typed RPC error", () => {
  const store = taskStoreWith({});

  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const error = yield* client.getTask({ id: knownId }).pipe(Effect.flip);

    expect(error).toStrictEqual(new TaskNotFound({ id: knownId, message: "Task not found" }));
  }).pipe(Effect.provide(handlersFor(store)));
});

it.effect("a task write failure does not expose database details", () => {
  const store = taskStoreWith({
    insert: () =>
      Effect.fail(
        new TaskStoreFailure({
          operation: "insert",
          message: "Task store write failed",
          cause: new Error("private database detail"),
        }),
      ),
  });

  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const error = yield* client.createTask({ title: "Write tests" }).pipe(Effect.flip);

    expect(error._tag).toBe("CreateTaskFailed");
    expect(error.message).toBe("Unable to create task");
    expect(error).not.toHaveProperty("cause");
    const serialized = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(error);
    expect(serialized).not.toContain("private database detail");
  }).pipe(Effect.provide(handlersFor(store)));
});

it.effect("an ID generation failure has a safe RPC error", () => {
  const failingIds = Layer.succeed(
    TaskIds,
    TaskIds.of({
      next: () =>
        Effect.fail(
          new TaskIdGenerationFailed({
            message: "Task ID generation failed",
            cause: new Error("private crypto detail"),
          }),
        ),
    }),
  );

  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const error = yield* client.createTask({ title: "Write tests" }).pipe(Effect.flip);

    expect(error._tag).toBe("CreateTaskFailed");
    expect(error.message).toBe("Unable to create task");
    expect(error).not.toHaveProperty("cause");
    const serialized = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(error);
    expect(serialized).not.toContain("private crypto detail");
  }).pipe(Effect.provide(handlersFor(TaskStoreTest, failingIds)));
});

it.effect("tasks can be listed, updated, and deleted through the public RPC", () => {
  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const created = yield* client.createTask({ title: "Write tests" });

    expect(yield* client.listTasks()).toEqual([created]);

    const updated = yield* client.updateTask({ id: created.id, title: "Ship it", completed: true });
    expect(updated).toEqual({ id: knownId, title: "Ship it", completed: true });
    expect(yield* client.listTasks()).toEqual([updated]);

    yield* client.deleteTask({ id: created.id });
    expect(yield* client.listTasks()).toEqual([]);
  }).pipe(Effect.provide(handlersFor()));
});

it.effect("updating or deleting a missing task is a typed RPC error", () => {
  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);
    const notFound = new TaskNotFound({ id: knownId, message: "Task not found" });

    const updateError = yield* client
      .updateTask({ id: knownId, title: "Ship it", completed: true })
      .pipe(Effect.flip);

    const deleteError = yield* client.deleteTask({ id: knownId }).pipe(Effect.flip);

    expect(updateError).toStrictEqual(notFound);
    expect(deleteError).toStrictEqual(notFound);
  }).pipe(Effect.provide(handlersFor()));
});

it.effect("store failures while listing, updating, and deleting have safe RPC errors", () => {
  const failure = (operation: "list" | "update" | "remove") =>
    new TaskStoreFailure({
      operation,
      message: "Task store failed",
      cause: new Error("private database detail"),
    });

  const store = taskStoreWith({
    list: Effect.fail(failure("list")),
    update: () => Effect.fail(failure("update")),
    remove: () => Effect.fail(failure("remove")),
  });

  return Effect.gen(function* () {
    const client = yield* RpcTest.makeClient(TaskRpcs);

    const listError = yield* client.listTasks().pipe(Effect.flip);

    const updateError = yield* client
      .updateTask({ id: knownId, title: "Ship it", completed: true })
      .pipe(Effect.flip);

    const deleteError = yield* client.deleteTask({ id: knownId }).pipe(Effect.flip);

    expect(listError).toStrictEqual(new ListTasksFailed({ message: "Unable to load tasks" }));
    expect(updateError).toStrictEqual(new UpdateTaskFailed({ message: "Unable to update task" }));
    expect(deleteError).toStrictEqual(new DeleteTaskFailed({ message: "Unable to delete task" }));
  }).pipe(Effect.provide(handlersFor(store)));
});
