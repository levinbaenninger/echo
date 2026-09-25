import { Tasks } from "@echo/db";
import { asc, eq } from "drizzle-orm";
import { Array, Effect, Layer, Schema } from "effect";

import { Database } from "../../database";
import { Task, type TaskId } from "../task";
import { TaskStore, TaskStoreFailure } from "./store";

type StoreOperation = TaskStoreFailure["operation"];

const failWith =
  (operation: StoreOperation, message: string) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Effect.mapError((cause) => new TaskStoreFailure({ operation, message, cause })));

const decodeTasks = (operation: StoreOperation, rows: ReadonlyArray<typeof Tasks.$inferSelect>) =>
  Schema.decodeEffect(Schema.Array(Task))(rows).pipe(
    failWith(operation, "Task record could not be parsed"),
  );

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
          .pipe(failWith("findById", "Task store read failed"));

        const tasks = yield* decodeTasks("findById", rows);

        return Array.head(tasks);
      }),
      list: Effect.gen(function* () {
        const rows = yield* db
          .select()
          .from(Tasks)
          .orderBy(asc(Tasks.title), asc(Tasks.id))
          .pipe(failWith("list", "Task store read failed"));

        return yield* decodeTasks("list", rows);
      }).pipe(Effect.withSpan("PostgresTaskStore.list")),
      insert: Effect.fn("PostgresTaskStore.insert")(function* (task: Task) {
        yield* db.insert(Tasks).values(task).pipe(failWith("insert", "Task store write failed"));
      }),
      update: Effect.fn("PostgresTaskStore.update")(function* (task: Task) {
        const rows = yield* db
          .update(Tasks)
          .set({ title: task.title, completed: task.completed })
          .where(eq(Tasks.id, task.id))
          .returning()
          .pipe(failWith("update", "Task store write failed"));

        const tasks = yield* decodeTasks("update", rows);

        return Array.head(tasks);
      }),
      remove: Effect.fn("PostgresTaskStore.remove")(function* (id: TaskId) {
        const rows = yield* db
          .delete(Tasks)
          .where(eq(Tasks.id, id))
          .returning({ id: Tasks.id })
          .pipe(failWith("remove", "Task store write failed"));

        return Array.isReadonlyArrayNonEmpty(rows);
      }),
    });
  }),
);
