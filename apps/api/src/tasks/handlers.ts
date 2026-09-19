import { Effect } from "effect";

import { CreateTaskFailed, GetTaskFailed } from "./model";
import { TaskOperations } from "./operations";
import { TaskRpcs } from "./rpcs";

/** RPC handlers that translate task application outcomes to the public contract. */
export const TaskHandlers = TaskRpcs.toLayer(
  Effect.gen(function* () {
    const tasks = yield* TaskOperations;
    return {
      getTask: ({ id }) =>
        tasks
          .getTask(id)
          .pipe(
            Effect.catchTag("TaskStoreFailure", () =>
              Effect.fail(new GetTaskFailed({ message: "Unable to load task" })),
            ),
          ),
      createTask: ({ title }) =>
        tasks
          .createTask({ title })
          .pipe(
            Effect.catchTag("TaskStoreFailure", () =>
              Effect.fail(new CreateTaskFailed({ message: "Unable to create task" })),
            ),
          ),
    };
  }),
);
