import { Schema } from "effect";

/** A task identifier accepted by the API and stored in Postgres. */
export const TaskId = Schema.String.check(Schema.isUUID(4)).pipe(Schema.brand("TaskId"));

/** A parsed task identifier. */
export type TaskId = typeof TaskId.Type;

/** A task returned by task operations and RPC. */
export const Task = Schema.Struct({
  id: TaskId,
  title: Schema.String,
  completed: Schema.Boolean,
});

/** A task returned by task operations and RPC. */
export interface Task extends Schema.Schema.Type<typeof Task> {}

/** The requested task does not exist. */
export class TaskNotFound extends Schema.TaggedError<TaskNotFound>()("TaskNotFound", {
  id: TaskId,
  message: Schema.String,
}) {}
