import { Effect, Layer, Option, Ref } from "effect";

import { TaskIds } from "./ids";
import { TaskStore } from "./persistence/store";
import { Task, TaskId } from "./task";

/** The deterministic task ID used by task operation and RPC tests. */
export const knownId = TaskId.make("a3bcb5e4-4705-45ba-87e1-b398a21b7953");

/** A fixed ID source for tests that do not exercise ID generation. */
export const TaskIdsTest = Layer.succeed(
  TaskIds,
  TaskIds.of({ next: () => Effect.succeed(knownId) }),
);

/** A fresh in-memory task store for each Layer acquisition. */
export const TaskStoreTest = Layer.effect(
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
