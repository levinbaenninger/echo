import { Context, Effect, Layer, Option } from "effect";

import { Task, TaskId, TaskNotFound } from "./model";
import { TaskStore, type TaskStoreFailure } from "./task-store";

/** A source of new task identifiers. */
export class TaskIds extends Context.Service<TaskIds, { readonly next: Effect.Effect<TaskId> }>()(
  "@echo/api/TaskIds",
) {}

/** Input for creating a task. */
export interface CreateTaskInput {
  readonly title: string;
}

/** Operations available to the task RPC adapter. */
export interface TaskOperationsService {
  readonly getTask: (id: TaskId) => Effect.Effect<Task, TaskNotFound | TaskStoreFailure>;
  readonly createTask: (input: CreateTaskInput) => Effect.Effect<Task, TaskStoreFailure>;
}

/** Application operations for tasks. */
export class TaskOperations extends Context.Service<TaskOperations, TaskOperationsService>()(
  "@echo/api/TaskOperations",
) {}

/** Live task operations assembled from persistence and ID-generation ports. */
export const TaskOperationsLive = Layer.effect(
  TaskOperations,
  Effect.gen(function* () {
    const store = yield* TaskStore;
    const ids = yield* TaskIds;

    return TaskOperations.of({
      getTask: Effect.fn("Tasks.getTask")(function* (id: TaskId) {
        const task = yield* store.findById(id);
        if (Option.isNone(task)) {
          return yield* new TaskNotFound({ id, message: "Task not found" });
        }
        return task.value;
      }),
      createTask: Effect.fn("Tasks.createTask")(function* (input: CreateTaskInput) {
        const id = yield* ids.next;
        const task = Task.make({ id, title: input.title, completed: false });
        yield* store.insert(task);
        return task;
      }),
    });
  }),
);
