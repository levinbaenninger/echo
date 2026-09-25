import { Effect, Schema } from 'effect'
import { RpcClientError } from 'effect/unstable/rpc'
import { Command, Dom } from 'foldkit'

import { TaskId, TaskTitle } from '@echo/api/rpcs'

import { ApiClient } from './api'
import { API_UNREACHABLE_ERROR, EDIT_TASK_INPUT_ID } from './constant'
import { Message } from './message'

const isRpcClientError = Schema.is(RpcClientError.RpcClientError)

const toFailureText = Effect.mapError(
  (error: Readonly<{ message: string }>): string =>
    isRpcClientError(error) ? API_UNREACHABLE_ERROR : error.message,
)

export const LoadTasks = Command.define('LoadTasks', {
  messages: [Message.SucceededLoadTasks, Message.FailedLoadTasks],
  execute: Effect.gen(function* () {
    const api = yield* ApiClient
    const tasks = yield* api.listTasks()

    return Message.SucceededLoadTasks({ tasks })
  }).pipe(
    toFailureText,
    Effect.catch(error => Effect.succeed(Message.FailedLoadTasks({ error }))),
  ),
})

export const CreateTask = Command.define('CreateTask', {
  args: { title: TaskTitle },
  messages: [Message.SucceededCreateTask, Message.FailedCreateTask],
  execute: ({ title }) =>
    Effect.gen(function* () {
      const api = yield* ApiClient
      const task = yield* api.createTask({ title })

      return Message.SucceededCreateTask({ task })
    }).pipe(
      toFailureText,
      Effect.catch(error =>
        Effect.succeed(Message.FailedCreateTask({ error })),
      ),
    ),
})

export const UpdateTask = Command.define('UpdateTask', {
  args: { id: TaskId, title: TaskTitle, completed: Schema.Boolean },
  messages: [Message.SucceededUpdateTask, Message.FailedUpdateTask],
  execute: ({ id, title, completed }) =>
    Effect.gen(function* () {
      const api = yield* ApiClient
      const task = yield* api.updateTask({ id, title, completed })

      return Message.SucceededUpdateTask({ task })
    }).pipe(
      toFailureText,
      Effect.catch(error =>
        Effect.succeed(Message.FailedUpdateTask({ id, error })),
      ),
    ),
})

export const DeleteTask = Command.define('DeleteTask', {
  args: { id: TaskId },
  messages: [Message.SucceededDeleteTask, Message.FailedDeleteTask],
  execute: ({ id }) =>
    Effect.gen(function* () {
      const api = yield* ApiClient
      yield* api.deleteTask({ id })

      return Message.SucceededDeleteTask({ id })
    }).pipe(
      // NOTE: a task that no longer exists was deleted elsewhere, which is the outcome this Command wants.
      Effect.catchTag('TaskNotFound', () =>
        Effect.succeed(Message.SucceededDeleteTask({ id })),
      ),
      toFailureText,
      Effect.catch(error =>
        Effect.succeed(Message.FailedDeleteTask({ id, error })),
      ),
    ),
})

export const FocusEditTitle = Command.define('FocusEditTitle', {
  messages: [Message.CompletedFocusEditTitle],
  execute: Dom.focus(`#${EDIT_TASK_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(Message.CompletedFocusEditTitle()),
  ),
})
