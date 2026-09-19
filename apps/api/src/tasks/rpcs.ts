import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { Task, TaskId, TaskNotFound, CreateTaskFailed, GetTaskFailed } from "./model";

const getTask = Rpc.make("getTask", {
  success: Task,
  error: Schema.Union([TaskNotFound, GetTaskFailed]),
  payload: { id: TaskId },
});

const createTask = Rpc.make("createTask", {
  success: Task,
  error: CreateTaskFailed,
  payload: { title: Schema.String },
});

/** Public task RPC procedures. */
export class TaskRpcs extends RpcGroup.make(getTask, createTask) {}
