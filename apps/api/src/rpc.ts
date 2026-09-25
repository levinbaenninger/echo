import { RpcGroup } from "effect/unstable/rpc";

import { TaskRpcs } from "./tasks/rpc/contract";

export {
  CreateTaskFailed,
  DeleteTaskFailed,
  GetTaskFailed,
  ListTasksFailed,
  UpdateTaskFailed,
} from "./tasks/rpc/contract";

export { Task, TaskId, TaskNotFound, TaskTitle } from "./tasks/task";

/** The public RPC groups served by the API Worker. */
export class ApiRpcs extends RpcGroup.make().merge(TaskRpcs) {}
