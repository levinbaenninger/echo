import { BrowserCrypto } from "@effect/platform-browser";
import { Context, Crypto, Effect, Layer, Schema } from "effect";

import { TaskId } from "./task";

/** Generates task identifiers without exposing the cryptographic runtime. */
export interface TaskIdsService {
  /** Generates a new ID or reports a runtime generation failure. */
  readonly next: () => Effect.Effect<TaskId, TaskIdGenerationFailed>;
}

/** A source of new task identifiers. */
export class TaskIds extends Context.Service<TaskIds, TaskIdsService>()("@echo/api/TaskIds") {}

/** The runtime could not generate a new task identifier. */
export class TaskIdGenerationFailed extends Schema.TaggedError<TaskIdGenerationFailed>()(
  "TaskIdGenerationFailed",
  { message: Schema.String, cause: Schema.Defect() },
) {}

/** Generates branded task IDs using the runtime cryptographic source. */
export const CryptoTaskIds = Layer.effect(
  TaskIds,
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;

    return TaskIds.of({
      next: Effect.fn("TaskIds.next")(function* () {
        const uuid = yield* crypto.randomUUIDv4.pipe(
          Effect.mapError(
            (cause) => new TaskIdGenerationFailed({ message: "Task ID generation failed", cause }),
          ),
        );
        return TaskId.make(uuid);
      }),
    });
  }),
).pipe(Layer.provide(BrowserCrypto.layer));
