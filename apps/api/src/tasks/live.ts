import { Effect, Layer } from "effect";

import { TaskHandlers } from "./handlers";
import { TaskId } from "./model";
import { TaskIds, TaskOperationsLive } from "./operations";
import { TaskStoreLive } from "./task-store";

const taskIds = Layer.succeed(
  TaskIds,
  TaskIds.of({
    next: Effect.fn("TaskIds.next")(() => Effect.sync(() => TaskId.make(crypto.randomUUID()))),
  }),
);

const taskOperations = TaskOperationsLive.pipe(
  Layer.provide(Layer.mergeAll(TaskStoreLive, taskIds)),
);

/** Complete task RPC handlers requiring only the shared database handle. */
export const TaskRpcsLive = TaskHandlers.pipe(Layer.provide(taskOperations));
