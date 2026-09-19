import { Effect, Layer, Option, Ref, Schema } from "effect";
import { RpcTest } from "effect/unstable/rpc";
import { expect, test } from "vite-plus/test";

import { TaskIds, TaskOperationsLive } from "./operations";
import { TaskHandlers } from "./handlers";
import { Task, TaskId } from "./model";
import { TaskRpcs } from "./rpcs";
import { TaskStore, TaskStoreFailure } from "./task-store";

const knownId = TaskId.make("a3bcb5e4-4705-45ba-87e1-b398a21b7953");

const failure = new TaskStoreFailure({
  operation: "findById",
  message: "Task store failed during findById",
  cause: new Error("private database detail"),
});

test("tasks can be created and read through the public RPC", () => {
  const store = Layer.effect(
    TaskStore,
    Effect.gen(function* () {
      const tasks = yield* Ref.make(new Map<string, Task>());

      return TaskStore.of({
        findById: (id) =>
          Ref.get(tasks).pipe(Effect.map((items) => Option.fromUndefinedOr(items.get(id)))),
        insert: (task) => Ref.update(tasks, (items) => new Map(items).set(task.id, task)),
      });
    }),
  );
  const ids = Layer.succeed(TaskIds, TaskIds.of({ next: Effect.succeed(knownId) }));
  const operations = TaskOperationsLive.pipe(Layer.provide(Layer.mergeAll(store, ids)));
  const handlers = TaskHandlers.pipe(Layer.provide(operations));

  return Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(TaskRpcs);
      const created = yield* client.createTask({ title: "Write tests" });
      const retrieved = yield* client.getTask({ id: created.id });

      expect(created).toEqual({ id: knownId, title: "Write tests", completed: false });
      expect(retrieved).toEqual(created);
    }).pipe(Effect.provide(handlers), Effect.scoped),
  );
});

test("a task read failure has a safe RPC error", () => {
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.fail(failure),
      insert: () => Effect.void,
    }),
  );
  const ids = Layer.succeed(TaskIds, TaskIds.of({ next: Effect.succeed(knownId) }));
  const operations = TaskOperationsLive.pipe(Layer.provide(Layer.mergeAll(store, ids)));
  const handlers = TaskHandlers.pipe(Layer.provide(operations));

  return Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(TaskRpcs);
      const error = yield* client.getTask({ id: knownId }).pipe(Effect.flip);

      expect(error._tag).toBe("GetTaskFailed");
      expect(error.message).toBe("Unable to load task");
      const serialized = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(error);
      expect(serialized).not.toContain("private database detail");
    }).pipe(Effect.provide(handlers), Effect.scoped),
  );
});

test("a missing task remains a typed RPC error", () => {
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.succeedNone,
      insert: () => Effect.void,
    }),
  );
  const ids = Layer.succeed(TaskIds, TaskIds.of({ next: Effect.succeed(knownId) }));
  const operations = TaskOperationsLive.pipe(Layer.provide(Layer.mergeAll(store, ids)));
  const handlers = TaskHandlers.pipe(Layer.provide(operations));

  return Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(TaskRpcs);
      const error = yield* client.getTask({ id: knownId }).pipe(Effect.flip);

      expect(error).toMatchObject({ _tag: "TaskNotFound", id: knownId });
    }).pipe(Effect.provide(handlers), Effect.scoped),
  );
});

test("a task write failure does not expose database details", () => {
  const store = Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.succeedNone,
      insert: () =>
        Effect.fail(
          new TaskStoreFailure({
            operation: "insert",
            message: "Task store write failed",
            cause: new Error("private database detail"),
          }),
        ),
    }),
  );
  const ids = Layer.succeed(TaskIds, TaskIds.of({ next: Effect.succeed(knownId) }));
  const operations = TaskOperationsLive.pipe(Layer.provide(Layer.mergeAll(store, ids)));
  const handlers = TaskHandlers.pipe(Layer.provide(operations));

  return Effect.runPromise(
    Effect.gen(function* () {
      const client = yield* RpcTest.makeClient(TaskRpcs);
      const error = yield* client.createTask({ title: "Write tests" }).pipe(Effect.flip);

      expect(error._tag).toBe("CreateTaskFailed");
      expect(error.message).toBe("Unable to create task");
      const serialized = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(error);
      expect(serialized).not.toContain("private database detail");
    }).pipe(Effect.provide(handlers), Effect.scoped),
  );
});
