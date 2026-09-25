import { Effect } from "effect";

import { TaskOperations, type UpdateTaskInput } from "../operations";
import type { TaskId } from "../task";
import {
  CreateTaskFailed,
  DeleteTaskFailed,
  GetTaskFailed,
  ListTasksFailed,
  TaskRpcs,
  UpdateTaskFailed,
} from "./contract";

/** RPC handlers that translate task application outcomes to the public contract. */
export const TaskHandlers = TaskRpcs.toLayer(
  Effect.gen(function* () {
    const tasks = yield* TaskOperations;

    return {
      getTask: Effect.fn("TaskRpcs.getTask")(function* ({ id }: { id: TaskId }) {
        return yield* tasks
          .getTask(id)
          .pipe(
            Effect.catchTag("TaskStoreFailure", () =>
              Effect.fail(new GetTaskFailed({ message: "Unable to load task" })),
            ),
          );
      }),
      listTasks: Effect.fn("TaskRpcs.listTasks")(function* () {
        return yield* tasks.listTasks.pipe(
          Effect.catchTag("TaskStoreFailure", () =>
            Effect.fail(new ListTasksFailed({ message: "Unable to load tasks" })),
          ),
        );
      }),
      createTask: Effect.fn("TaskRpcs.createTask")(function* ({ title }: { title: string }) {
        return yield* tasks
          .createTask({ title })
          .pipe(Effect.mapError(() => new CreateTaskFailed({ message: "Unable to create task" })));
      }),
      updateTask: Effect.fn("TaskRpcs.updateTask")(function* (input: UpdateTaskInput) {
        return yield* tasks
          .updateTask(input)
          .pipe(
            Effect.catchTag("TaskStoreFailure", () =>
              Effect.fail(new UpdateTaskFailed({ message: "Unable to update task" })),
            ),
          );
      }),
      deleteTask: Effect.fn("TaskRpcs.deleteTask")(function* ({ id }: { id: TaskId }) {
        return yield* tasks
          .deleteTask(id)
          .pipe(
            Effect.catchTag("TaskStoreFailure", () =>
              Effect.fail(new DeleteTaskFailed({ message: "Unable to delete task" })),
            ),
          );
      }),
    };
  }),
);
