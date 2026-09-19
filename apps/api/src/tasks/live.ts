import { BrowserCrypto } from "@effect/platform-browser";
import { Crypto, Effect, Layer } from "effect";

import { TaskHandlers } from "./handlers";
import { TaskId } from "./model";
import { TaskIds, TaskOperationsLive } from "./operations";
import { TaskStoreLive } from "./task-store";

const taskIds = Layer.effect(
  TaskIds,
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;
    return TaskIds.of({
      next: crypto.randomUUIDv4.pipe(
        Effect.map((uuid) => TaskId.make(uuid)),
        Effect.orDie,
      ),
    });
  }),
).pipe(Layer.provide(BrowserCrypto.layer));

const taskOperations = TaskOperationsLive.pipe(
  Layer.provide(Layer.mergeAll(TaskStoreLive, taskIds)),
);

/** Complete task RPC handlers requiring only the shared database handle. */
export const TaskRpcsLive = TaskHandlers.pipe(Layer.provide(taskOperations));
