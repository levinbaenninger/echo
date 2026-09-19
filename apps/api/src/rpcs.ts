import { RpcGroup } from "effect/unstable/rpc";

import { TaskRpcs } from "./tasks/rpcs";

/** The public RPC groups served by the API Worker. */
export class ApiRpcs extends RpcGroup.make().merge(TaskRpcs) {}
