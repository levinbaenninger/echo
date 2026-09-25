import { Array, Effect, Layer, Option, Order, Ref } from "effect";

import { TaskIds } from "./ids";
import { TaskStore, type TaskStoreService } from "./persistence/store";
import { Task, TaskId } from "./task";

/** The deterministic task ID used by task operation and RPC tests. */
export const knownId = TaskId.make("a3bcb5e4-4705-45ba-87e1-b398a21b7953");

/** A fixed ID source for tests that do not exercise ID generation. */
export const TaskIdsTest = Layer.succeed(
  TaskIds,
  TaskIds.of({ next: () => Effect.succeed(knownId) }),
);

const byTitleThenId: Order.Order<Task> = Order.combine(
  Order.mapInput(Order.String, (task: Task) => task.title),
  Order.mapInput(Order.String, (task: Task) => task.id),
);

/** A fresh in-memory task store for each Layer acquisition. */
export const TaskStoreTest = Layer.effect(
  TaskStore,
  Effect.gen(function* () {
    const tasks = yield* Ref.make(new Map<string, Task>());

    return TaskStore.of({
      findById: (id) =>
        Ref.get(tasks).pipe(Effect.map((items) => Option.fromUndefinedOr(items.get(id)))),
      list: Ref.get(tasks).pipe(Effect.map((items) => Array.sort(items.values(), byTitleThenId))),
      insert: (task) => Ref.update(tasks, (items) => new Map(items).set(task.id, task)),
      update: (task) =>
        Ref.modify(tasks, (items) =>
          items.has(task.id)
            ? [Option.some(task), new Map(items).set(task.id, task)]
            : [Option.none(), items],
        ),
      remove: (id) =>
        Ref.modify(tasks, (items) => {
          const remaining = new Map(items);

          return [remaining.delete(id), remaining];
        }),
    });
  }),
);

/** A store for failure tests: every operation behaves as an empty store unless overridden. */
export const taskStoreWith = (overrides: Partial<TaskStoreService>) =>
  Layer.succeed(
    TaskStore,
    TaskStore.of({
      findById: () => Effect.succeedNone,
      list: Effect.succeed([]),
      insert: () => Effect.void,
      update: () => Effect.succeedNone,
      remove: () => Effect.succeed(false),
      ...overrides,
    }),
  );
