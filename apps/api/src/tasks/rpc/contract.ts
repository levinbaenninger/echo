import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { Task, TaskId, TaskNotFound } from "../task";

/** The task could not be read. */
export class GetTaskFailed extends Schema.TaggedError<GetTaskFailed>()("GetTaskFailed", {
  message: Schema.String,
}) {}

/** The task could not be created. */
export class CreateTaskFailed extends Schema.TaggedError<CreateTaskFailed>()("CreateTaskFailed", {
  message: Schema.String,
}) {}

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
