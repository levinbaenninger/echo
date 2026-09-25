import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Task, TaskId } from '@echo/api/rpcs'

export const Message = defineMessageUnion({
  SucceededLoadTasks: { tasks: Schema.Array(Task) },
  FailedLoadTasks: { error: Schema.String },
  ClickedRetryLoad: {},
  UpdatedNewTaskTitle: { value: Schema.String },
  SubmittedNewTask: {},
  SucceededCreateTask: { task: Task },
  FailedCreateTask: { error: Schema.String },
  ToggledTask: { id: TaskId, isCompleted: Schema.Boolean },
  ClickedEditTask: { id: TaskId },
  UpdatedEditTitle: { value: Schema.String },
  SubmittedEditTask: {},
  ClickedCancelEdit: {},
  CompletedFocusEditTitle: {},
  SucceededUpdateTask: { task: Task },
  FailedUpdateTask: { id: TaskId, error: Schema.String },
  ClickedDeleteTask: { id: TaskId },
  SucceededDeleteTask: { id: TaskId },
  FailedDeleteTask: { id: TaskId, error: Schema.String },
  ClickedDismissError: {},
})

export type Message = typeof Message.Type
