import { Layer } from "effect";

import { TaskOperationsLive } from "../operations";
import { PostgresTaskStore } from "../persistence/postgres-store";
import { CryptoTaskIds } from "../ids";
import { TaskHandlers } from "./handlers";

const taskOperations = TaskOperationsLive.pipe(
  Layer.provide(Layer.mergeAll(PostgresTaskStore, CryptoTaskIds)),
);

/** Complete task RPC handlers requiring only the shared database handle. */
export const TaskRpcsLive = TaskHandlers.pipe(Layer.provide(taskOperations));
