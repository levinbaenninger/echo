import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import { Task, TaskId, TaskNotFound, TaskTitle } from "../task";

/** The task could not be read. */
export class GetTaskFailed extends Schema.TaggedError<GetTaskFailed>()("GetTaskFailed", {
  message: Schema.String,
}) {}

/** The task list could not be read. */
export class ListTasksFailed extends Schema.TaggedError<ListTasksFailed>()("ListTasksFailed", {
  message: Schema.String,
}) {}

/** The task could not be created. */
export class CreateTaskFailed extends Schema.TaggedError<CreateTaskFailed>()("CreateTaskFailed", {
  message: Schema.String,
}) {}

/** The task could not be updated. */
export class UpdateTaskFailed extends Schema.TaggedError<UpdateTaskFailed>()("UpdateTaskFailed", {
  message: Schema.String,
}) {}

/** The task could not be deleted. */
export class DeleteTaskFailed extends Schema.TaggedError<DeleteTaskFailed>()("DeleteTaskFailed", {
  message: Schema.String,
}) {}

const getTask = Rpc.make("getTask", {
  success: Task,
  error: Schema.Union([TaskNotFound, GetTaskFailed]),
  payload: { id: TaskId },
});

const listTasks = Rpc.make("listTasks", {
  success: Schema.Array(Task),
  error: ListTasksFailed,
});

const createTask = Rpc.make("createTask", {
  success: Task,
  error: CreateTaskFailed,
  payload: { title: TaskTitle },
});

const updateTask = Rpc.make("updateTask", {
  success: Task,
  error: Schema.Union([TaskNotFound, UpdateTaskFailed]),
  payload: { id: TaskId, title: TaskTitle, completed: Schema.Boolean },
});

const deleteTask = Rpc.make("deleteTask", {
  error: Schema.Union([TaskNotFound, DeleteTaskFailed]),
  payload: { id: TaskId },
});

/** Public task RPC procedures. */
export class TaskRpcs extends RpcGroup.make(
  getTask,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
) {}
