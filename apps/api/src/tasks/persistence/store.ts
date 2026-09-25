import { Context, Effect, Option, Schema } from "effect";

import type { Task, TaskId } from "../task";

/** An expected failure while accessing task persistence. */
export class TaskStoreFailure extends Schema.TaggedError<TaskStoreFailure>()("TaskStoreFailure", {
  operation: Schema.Literals(["findById", "list", "insert", "update", "remove"]),
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Persistence operations needed by the task application module. */
export interface TaskStoreService {
  /** Reads and validates a stored task; absence is an ordinary result. */
  readonly findById: (id: TaskId) => Effect.Effect<Option.Option<Task>, TaskStoreFailure>;
  /** Reads and validates every stored task, ordered by title and then ID. */
  readonly list: Effect.Effect<ReadonlyArray<Task>, TaskStoreFailure>;
  /** Persists a task or returns a typed storage failure. */
  readonly insert: (task: Task) => Effect.Effect<void, TaskStoreFailure>;
  /** Overwrites the stored task with the same ID; returns none when no such task exists. */
  readonly update: (task: Task) => Effect.Effect<Option.Option<Task>, TaskStoreFailure>;
  /** Deletes a task; returns whether a task with that ID existed. */
  readonly remove: (id: TaskId) => Effect.Effect<boolean, TaskStoreFailure>;
}

/** The task persistence port. */
export class TaskStore extends Context.Service<TaskStore, TaskStoreService>()(
  "@echo/api/TaskStore",
) {}
