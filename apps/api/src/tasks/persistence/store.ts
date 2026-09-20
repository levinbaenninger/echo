import { Context, Effect, Option, Schema } from "effect";

import type { Task, TaskId } from "../task";

/** An expected failure while accessing task persistence. */
export class TaskStoreFailure extends Schema.TaggedError<TaskStoreFailure>()("TaskStoreFailure", {
  operation: Schema.Literals(["findById", "insert"]),
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Persistence operations needed by the task application module. */
export interface TaskStoreService {
  /** Reads and validates a stored task; absence is an ordinary result. */
  readonly findById: (id: TaskId) => Effect.Effect<Option.Option<Task>, TaskStoreFailure>;
  /** Persists a task or returns a typed storage failure. */
  readonly insert: (task: Task) => Effect.Effect<void, TaskStoreFailure>;
}

/** The task persistence port. */
export class TaskStore extends Context.Service<TaskStore, TaskStoreService>()(
  "@echo/api/TaskStore",
) {}
