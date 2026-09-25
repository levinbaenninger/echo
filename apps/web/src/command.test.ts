import { Effect, Layer } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/unstable/http'
import {
  RpcClient,
  type RpcGroup,
  RpcSerialization,
  RpcTest,
} from 'effect/unstable/rpc'
import { describe, expect, test } from 'vite-plus/test'

import { ApiRpcs, TaskNotFound, UpdateTaskFailed } from '@echo/api/rpcs'

import { ApiClient } from './api'
import { DeleteTask, LoadTasks, UpdateTask } from './command'
import { API_UNREACHABLE_ERROR } from './constant'
import { Message } from './message'
import { docsTask } from './model.fixture'

type ApiHandlers = RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof ApiRpcs>>

const unexpectedCall = () => Effect.die('The Command called an unexpected RPC')

const apiClientWith = <Handlers extends Partial<ApiHandlers>>(
  handlers: Handlers,
) =>
  Layer.effect(ApiClient, RpcTest.makeClient(ApiRpcs)).pipe(
    Layer.provide(
      ApiRpcs.toLayer({
        getTask: unexpectedCall,
        listTasks: unexpectedCall,
        createTask: unexpectedCall,
        updateTask: unexpectedCall,
        deleteTask: unexpectedCall,
        ...handlers,
      }),
    ),
  )

const unreachableApiClient = Layer.effect(
  ApiClient,
  RpcClient.make(ApiRpcs),
).pipe(
  Layer.provide(
    RpcClient.layerProtocolHttp({ url: 'https://api.test/' }).pipe(
      Layer.provide([
        RpcSerialization.layerNdjson,
        Layer.succeed(
          HttpClient.HttpClient,
          HttpClient.make(request =>
            Effect.succeed(
              HttpClientResponse.fromWeb(
                request,
                new Response(null, { status: 503 }),
              ),
            ),
          ),
        ),
      ]),
    ),
  ),
)

const resultMessage = (
  effect: Effect.Effect<Message, never, ApiClient>,
  layer: Layer.Layer<ApiClient>,
  expected: Message,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(layer),
      Effect.map(message => {
        expect(message).toStrictEqual(expected)
      }),
    ),
  )

describe('commands against the RPC contract', () => {
  test('LoadTasks reports the listed tasks', () =>
    resultMessage(
      LoadTasks().effect,
      apiClientWith({ listTasks: () => Effect.succeed([docsTask]) }),
      Message.SucceededLoadTasks({ tasks: [docsTask] }),
    ))

  test('a typed API failure reaches the Message as its safe message', () =>
    resultMessage(
      UpdateTask({ id: docsTask.id, title: 'Write docs', completed: true })
        .effect,
      apiClientWith({
        updateTask: () =>
          Effect.fail(
            new UpdateTaskFailed({ message: 'Unable to update task' }),
          ),
      }),
      Message.FailedUpdateTask({
        id: docsTask.id,
        error: 'Unable to update task',
      }),
    ))

  test('deleting a task that is already gone counts as deleted', () =>
    resultMessage(
      DeleteTask({ id: docsTask.id }).effect,
      apiClientWith({
        deleteTask: ({ id }) =>
          Effect.fail(new TaskNotFound({ id, message: 'Task not found' })),
      }),
      Message.SucceededDeleteTask({ id: docsTask.id }),
    ))

  test('an unreachable API is reported without transport details', () =>
    resultMessage(
      LoadTasks().effect,
      unreachableApiClient,
      Message.FailedLoadTasks({ error: API_UNREACHABLE_ERROR }),
    ))
})
