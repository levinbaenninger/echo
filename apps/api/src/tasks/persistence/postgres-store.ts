import { Tasks } from "@echo/db";
import { eq } from "drizzle-orm";
import { Effect, Layer, Option, Schema } from "effect";

import { Database } from "../../database";
import { Task, type TaskId } from "../task";
import { TaskStore, TaskStoreFailure } from "./store";

/** Postgres-backed task persistence with row validation on reads. */
export const PostgresTaskStore = Layer.effect(
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
