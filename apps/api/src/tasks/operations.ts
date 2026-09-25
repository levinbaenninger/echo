import { Context, Effect, Layer, Option } from "effect";

import { Task, TaskId, TaskNotFound } from "./task";
import { TaskStore, type TaskStoreFailure } from "./persistence/store";
import { TaskIds, type TaskIdGenerationFailed } from "./ids";

/** Input for creating a task. */
export interface CreateTaskInput {
  readonly title: string;
}

/** Input for replacing an existing task's editable fields. */
export interface UpdateTaskInput {
  readonly id: TaskId;
  readonly title: string;
  readonly completed: boolean;
}

/** Operations available to the task RPC adapter. */
export interface TaskOperationsService {
  /** Loads a task, including a typed not-found result when absent. */
  readonly getTask: (id: TaskId) => Effect.Effect<Task, TaskNotFound | TaskStoreFailure>;
  /** Loads every task in a stable order. */
  readonly listTasks: Effect.Effect<ReadonlyArray<Task>, TaskStoreFailure>;
  /** Generates an ID and stores a new incomplete task. */
  readonly createTask: (
    input: CreateTaskInput,
  ) => Effect.Effect<Task, TaskIdGenerationFailed | TaskStoreFailure>;
  /** Replaces a task's title and completion state, failing when the task does not exist. */
  readonly updateTask: (
    input: UpdateTaskInput,
  ) => Effect.Effect<Task, TaskNotFound | TaskStoreFailure>;
  /** Deletes a task, failing when the task does not exist. */
  readonly deleteTask: (id: TaskId) => Effect.Effect<void, TaskNotFound | TaskStoreFailure>;
}

/** Application operations for tasks. */
export class TaskOperations extends Context.Service<TaskOperations, TaskOperationsService>()(
  "@echo/api/TaskOperations",
) {}

const notFound = (id: TaskId) => new TaskNotFound({ id, message: "Task not found" });

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
          return yield* notFound(id);
        }

        return task.value;
      }),
      listTasks: store.list.pipe(Effect.withSpan("Tasks.listTasks")),
      createTask: Effect.fn("Tasks.createTask")(function* (input: CreateTaskInput) {
        const id = yield* ids.next();
        const task = Task.make({ id, title: input.title, completed: false });
        yield* store.insert(task);

        return task;
      }),
      updateTask: Effect.fn("Tasks.updateTask")(function* (input: UpdateTaskInput) {
        const task = yield* store.update(Task.make(input));

        if (Option.isNone(task)) {
          return yield* notFound(input.id);
        }

        return task.value;
      }),
      deleteTask: Effect.fn("Tasks.deleteTask")(function* (id: TaskId) {
        const existed = yield* store.remove(id);

        if (!existed) {
          return yield* notFound(id);
        }
      }),
    });
  }),
);
