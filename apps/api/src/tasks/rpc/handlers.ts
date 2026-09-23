import { Effect } from "effect";

import { TaskOperations } from "../operations";
import type { TaskId } from "../task";
import { CreateTaskFailed, GetTaskFailed, TaskRpcs } from "./contract";

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
      createTask: Effect.fn("TaskRpcs.createTask")(function* ({ title }: { title: string }) {
        return yield* tasks
          .createTask({ title })
          .pipe(Effect.mapError(() => new CreateTaskFailed({ message: "Unable to create task" })));
      }),
    };
  }),
);
