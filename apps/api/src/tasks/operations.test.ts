import { Effect, Layer, Option, Ref } from "effect";
import { expect, test } from "vite-plus/test";

import { Task, TaskId } from "./model";
import { TaskIds, TaskOperations, TaskOperationsLive } from "./operations";
import { TaskStore } from "./task-store";

const knownId = TaskId.make("a3bcb5e4-4705-45ba-87e1-b398a21b7953");

test("a created task can be retrieved", () => {
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

  return Effect.runPromise(
    Effect.gen(function* () {
      const tasks = yield* TaskOperations;
      const created = yield* tasks.createTask({ title: "Write tests" });
      const retrieved = yield* tasks.getTask(created.id);

      expect(created).toEqual({ id: knownId, title: "Write tests", completed: false });
      expect(retrieved).toEqual(created);
    }).pipe(Effect.provide(operations)),
  );
});
