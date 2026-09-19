import { eq } from "drizzle-orm";
import { Context, Effect, Layer, Option, Schema } from "effect";

import { Tasks } from "@echo/db";

import { Database } from "../database";
import { Task, type TaskId } from "./model";

/** An expected failure while accessing task persistence. */
export class TaskStoreFailure extends Schema.TaggedError<TaskStoreFailure>()("TaskStoreFailure", {
  operation: Schema.Literals(["findById", "insert"]),
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Persistence operations needed by the task application module. */
export interface TaskStoreService {
  readonly findById: (id: TaskId) => Effect.Effect<Option.Option<Task>, TaskStoreFailure>;
  readonly insert: (task: Task) => Effect.Effect<void, TaskStoreFailure>;
}

/** The task persistence port. */
export class TaskStore extends Context.Service<TaskStore, TaskStoreService>()(
  "@echo/api/TaskStore",
) {}

/** A Postgres implementation of the task persistence port. */
export const TaskStoreLive = Layer.effect(
  TaskStore,
  Effect.gen(function* () {
    const db = yield* Database;

    return TaskStore.of({
      findById: Effect.fn("PostgresTaskStore.findById")(function* (id: TaskId) {
        const rows = yield* db
          .select()
          .from(Tasks)
          .where(eq(Tasks.id, id))
          .pipe(
            Effect.mapError(
              (cause) =>
                new TaskStoreFailure({
                  operation: "findById",
                  message: "Task store read failed",
                  cause,
                }),
            ),
          );

        const row = rows[0];
        if (row === undefined) return Option.none();

        const task = yield* Schema.decodeEffect(Task)(row).pipe(
          Effect.mapError(
            (cause) =>
              new TaskStoreFailure({
                operation: "findById",
                message: "Task record could not be parsed",
                cause,
              }),
          ),
        );
        return Option.some(task);
      }),
      insert: Effect.fn("PostgresTaskStore.insert")(function* (task: Task) {
        yield* db
          .insert(Tasks)
          .values(task)
          .pipe(
            Effect.mapError(
              (cause) =>
                new TaskStoreFailure({
                  operation: "insert",
                  message: "Task store write failed",
                  cause,
                }),
            ),
          );
      }),
    });
  }),
);
