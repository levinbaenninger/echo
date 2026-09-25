import { Array, Option } from 'effect'
import { AsyncData } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vite-plus/test'

import {
  CreateTask,
  DeleteTask,
  FocusEditTitle,
  LoadTasks,
  UpdateTask,
} from './command'
import { INVALID_TITLE_ERROR } from './constant'
import { TaskRow } from './domain'
import { init } from './main'
import { Message } from './message'
import { Editing, type Model, NewTask } from './model'
import {
  docsTask,
  emptyModel,
  loadedModel,
  loadingModel,
  releaseTask,
} from './model.fixture'
import { update } from './update'

const rowsOf = (model: Model) =>
  Option.getOrThrow(AsyncData.getData(model.tasks))

const titlesOf = (model: Model) =>
  Array.map(rowsOf(model), ({ task }) => task.title)

describe('loading', () => {
  test('init starts loading the task list', () => {
    const init_ = init()

    expect(init_.model.tasks).toStrictEqual(loadingModel.tasks)
    expect(init_.commands).toStrictEqual([LoadTasks()])
  })

  test('loaded tasks are shown in title order', () => {
    story(
      update,
      given(loadingModel),
      message(Message.SucceededLoadTasks({ tasks: [docsTask, releaseTask] })),
      Command.expectNone(),
      model(model => {
        expect(titlesOf(model)).toStrictEqual(['Plan release', 'Write docs'])
      }),
    )
  })

  test('a load failure can be retried', () => {
    story(
      update,
      given(loadingModel),
      message(Message.FailedLoadTasks({ error: 'Unable to load tasks' })),
      model(model => {
        expect(AsyncData.getError(model.tasks)).toStrictEqual(
          Option.some('Unable to load tasks'),
        )
      }),
      message(Message.ClickedRetryLoad()),
      model(model => {
        expect(AsyncData.isLoading(model.tasks)).toBe(true)
      }),
      Command.resolve(
        LoadTasks,
        Message.SucceededLoadTasks({ tasks: [docsTask] }),
      ),
      model(model => {
        expect(titlesOf(model)).toStrictEqual(['Write docs'])
      }),
    )
  })
})

describe('creating', () => {
  test('a trimmed title is sent and the created task joins the list', () => {
    story(
      update,
      given(emptyModel),
      message(Message.UpdatedNewTaskTitle({ value: '  Write docs  ' })),
      message(Message.SubmittedNewTask()),
      model(model => {
        expect(model.newTask).toStrictEqual(
          NewTask.Submitting({ title: '  Write docs  ' }),
        )
      }),
      Command.expectExact(CreateTask({ title: 'Write docs' })),
      Command.resolve(
        CreateTask,
        Message.SucceededCreateTask({ task: docsTask }),
      ),
      model(model => {
        expect(titlesOf(model)).toStrictEqual(['Write docs'])
        expect(model.newTask).toStrictEqual(NewTask.Drafting({ title: '' }))
      }),
    )
  })

  test('a blank title is rejected without calling the API', () => {
    story(
      update,
      given(emptyModel),
      message(Message.UpdatedNewTaskTitle({ value: '   ' })),
      message(Message.SubmittedNewTask()),
      Command.expectNone(),
      model(model => {
        expect(model.maybeError).toStrictEqual(Option.some(INVALID_TITLE_ERROR))
      }),
    )
  })

  test('a task cannot be created before the list has loaded', () => {
    story(
      update,
      given(loadingModel),
      message(Message.FailedLoadTasks({ error: 'Unable to load tasks' })),
      message(Message.UpdatedNewTaskTitle({ value: 'Write docs' })),
      message(Message.SubmittedNewTask()),
      Command.expectNone(),
      model(model => {
        expect(model.newTask).toStrictEqual(
          NewTask.Drafting({ title: 'Write docs' }),
        )
      }),
    )
  })

  test('a failed create keeps the draft and shows the error', () => {
    story(
      update,
      given(emptyModel),
      message(Message.UpdatedNewTaskTitle({ value: 'Write docs' })),
      message(Message.SubmittedNewTask()),
      Command.resolve(
        CreateTask,
        Message.FailedCreateTask({ error: 'Unable to create task' }),
      ),
      model(model => {
        expect(model.newTask).toStrictEqual(
          NewTask.Drafting({ title: 'Write docs' }),
        )
        expect(model.maybeError).toStrictEqual(
          Option.some('Unable to create task'),
        )
      }),
    )
  })
})

describe('completing', () => {
  test('toggling saves through the API and applies the returned task', () => {
    const completedDocs = evo(docsTask, { completed: () => true })

    story(
      update,
      given(loadedModel),
      message(Message.ToggledTask({ id: docsTask.id, isCompleted: true })),
      model(model => {
        expect(rowsOf(model)[1]?.status).toStrictEqual(TaskRow.Status.Saving())
      }),
      Command.expectExact(
        UpdateTask({ id: docsTask.id, title: 'Write docs', completed: true }),
      ),
      Command.resolve(
        UpdateTask,
        Message.SucceededUpdateTask({ task: completedDocs }),
      ),
      model(model => {
        expect(rowsOf(model)[1]).toStrictEqual(TaskRow.fromTask(completedDocs))
      }),
    )
  })

  test('a failed save returns the row to idle and shows the error', () => {
    story(
      update,
      given(loadedModel),
      message(Message.ToggledTask({ id: docsTask.id, isCompleted: true })),
      Command.resolve(
        UpdateTask,
        Message.FailedUpdateTask({
          id: docsTask.id,
          error: 'Unable to update task',
        }),
      ),
      model(model => {
        expect(rowsOf(model)[1]?.status).toStrictEqual(TaskRow.Status.Idle())
        expect(model.maybeError).toStrictEqual(
          Option.some('Unable to update task'),
        )
      }),
    )
  })

  test('a row with a request in flight ignores further toggles', () => {
    story(
      update,
      given(
        evo(loadedModel, {
          tasks: AsyncData.map(rows =>
            Array.map(rows, row =>
              evo(row, { status: () => TaskRow.Status.Deleting() }),
            ),
          ),
        }),
      ),
      message(Message.ToggledTask({ id: docsTask.id, isCompleted: true })),
      Command.expectNone(),
    )
  })
})

describe('editing', () => {
  test('a renamed task is saved and re-sorted', () => {
    const renamedDocs = evo(docsTask, { title: () => 'Archive docs' })

    story(
      update,
      given(loadedModel),
      message(Message.ClickedEditTask({ id: docsTask.id })),
      model(model => {
        expect(model.editing).toStrictEqual(
          Editing.Editing({ id: docsTask.id, title: 'Write docs' }),
        )
      }),
      Command.resolve(FocusEditTitle, Message.CompletedFocusEditTitle()),
      message(Message.UpdatedEditTitle({ value: 'Archive docs ' })),
      message(Message.SubmittedEditTask()),
      Command.expectExact(
        UpdateTask({
          id: docsTask.id,
          title: 'Archive docs',
          completed: false,
        }),
      ),
      Command.resolve(
        UpdateTask,
        Message.SucceededUpdateTask({ task: renamedDocs }),
      ),
      model(model => {
        expect(model.editing).toStrictEqual(Editing.NotEditing())
        expect(titlesOf(model)).toStrictEqual(['Archive docs', 'Plan release'])
      }),
    )
  })

  test('saving an unchanged title closes the editor without a request', () => {
    story(
      update,
      given(loadedModel),
      message(Message.ClickedEditTask({ id: docsTask.id })),
      Command.resolve(FocusEditTitle, Message.CompletedFocusEditTitle()),
      message(Message.SubmittedEditTask()),
      Command.expectNone(),
      model(model => {
        expect(model.editing).toStrictEqual(Editing.NotEditing())
      }),
    )
  })

  test('cancelling discards the draft title', () => {
    story(
      update,
      given(loadedModel),
      message(Message.ClickedEditTask({ id: docsTask.id })),
      Command.resolve(FocusEditTitle, Message.CompletedFocusEditTitle()),
      message(Message.UpdatedEditTitle({ value: 'Something else' })),
      message(Message.ClickedCancelEdit()),
      model(model => {
        expect(model.editing).toStrictEqual(Editing.NotEditing())
        expect(titlesOf(model)).toStrictEqual(['Plan release', 'Write docs'])
      }),
    )
  })
})

describe('deleting', () => {
  test('a deleted task leaves the list', () => {
    story(
      update,
      given(loadedModel),
      message(Message.ClickedDeleteTask({ id: releaseTask.id })),
      model(model => {
        expect(rowsOf(model)[0]?.status).toStrictEqual(
          TaskRow.Status.Deleting(),
        )
      }),
      Command.expectExact(DeleteTask({ id: releaseTask.id })),
      Command.resolve(
        DeleteTask,
        Message.SucceededDeleteTask({ id: releaseTask.id }),
      ),
      model(model => {
        expect(titlesOf(model)).toStrictEqual(['Write docs'])
      }),
    )
  })

  test('a failed delete keeps the task and shows a dismissible error', () => {
    story(
      update,
      given(loadedModel),
      message(Message.ClickedDeleteTask({ id: releaseTask.id })),
      Command.resolve(
        DeleteTask,
        Message.FailedDeleteTask({
          id: releaseTask.id,
          error: 'Unable to delete task',
        }),
      ),
      model(model => {
        expect(rowsOf(model)[0]).toStrictEqual(TaskRow.fromTask(releaseTask))
        expect(model.maybeError).toStrictEqual(
          Option.some('Unable to delete task'),
        )
      }),
      message(Message.ClickedDismissError()),
      model(model => {
        expect(model.maybeError).toStrictEqual(Option.none())
      }),
    )
  })
})
