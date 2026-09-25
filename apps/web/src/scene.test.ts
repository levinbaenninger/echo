import {
  Command,
  click,
  expect,
  given,
  label,
  role,
  scene,
  submit,
  text,
  type,
} from 'foldkit/scene'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vite-plus/test'

import {
  CreateTask,
  DeleteTask,
  FocusEditTitle,
  LoadTasks,
  UpdateTask,
} from './command'
import { Message } from './message'
import { TaskRows } from './model'
import {
  docsTask,
  emptyModel,
  loadedModel,
  loadingModel,
  releaseTask,
} from './model.fixture'
import { update } from './update'
import { view } from './view'

describe('view', () => {
  test('shows a loading state while tasks load', () => {
    scene(
      { update, view },
      given(loadingModel),
      expect(role('heading', { name: 'Tasks' })).toExist(),
      expect(role('status')).toContainText('Loading tasks…'),
      expect(role('button', { name: 'Add task' })).toBeDisabled(),
    )
  })

  test('a load failure offers a retry', () => {
    scene(
      { update, view },
      given(
        evo(loadingModel, {
          tasks: () => TaskRows.Failure({ error: 'Unable to load tasks' }),
        }),
      ),
      expect(role('alert')).toContainText('Unable to load tasks'),
      click(role('button', { name: 'Try again' })),
      expect(text('Loading tasks…')).toExist(),
      Command.resolve(
        LoadTasks,
        Message.SucceededLoadTasks({ tasks: [docsTask] }),
      ),
      expect(text('Write docs')).toExist(),
    )
  })

  test('an empty list invites the first task', () => {
    scene(
      { update, view },
      given(emptyModel),
      expect(text('No tasks yet. Add one above.')).toExist(),
    )
  })

  test('loaded tasks show their completion state and a summary', () => {
    scene(
      { update, view },
      given(loadedModel),
      expect(role('checkbox', { name: 'Plan release' })).toBeChecked(),
      expect(role('checkbox', { name: 'Write docs' })).not.toBeChecked(),
      expect(role('status')).toContainText('1 of 2 done'),
    )
  })

  test('a task added through the form appears in the list', () => {
    scene(
      { update, view },
      given(emptyModel),
      type(label('New task title'), 'Write docs'),
      submit(role('form', { name: 'New task' })),
      expect(role('button', { name: 'Adding…' })).toBeDisabled(),
      Command.resolve(
        CreateTask,
        Message.SucceededCreateTask({ task: docsTask }),
      ),
      expect(role('checkbox', { name: 'Write docs' })).toExist(),
      expect(label('New task title')).toHaveValue(''),
    )
  })

  test('checking a task marks it done', () => {
    scene(
      { update, view },
      given(loadedModel),
      click(role('checkbox', { name: 'Write docs' })),
      expect(text('Saving…')).toExist(),
      Command.resolve(
        UpdateTask,
        Message.SucceededUpdateTask({
          task: evo(docsTask, { completed: () => true }),
        }),
      ),
      expect(role('checkbox', { name: 'Write docs' })).toBeChecked(),
      expect(role('status')).toContainText('2 of 2 done'),
    )
  })

  test('a task can be renamed in place', () => {
    scene(
      { update, view },
      given(loadedModel),
      click(role('button', { name: 'Edit Write docs' })),
      Command.resolve(FocusEditTitle, Message.CompletedFocusEditTitle()),
      type(label('Task title'), 'Write the docs'),
      submit(role('form', { name: 'Rename task' })),
      Command.resolve(
        UpdateTask,
        Message.SucceededUpdateTask({
          task: evo(docsTask, { title: () => 'Write the docs' }),
        }),
      ),
      expect(role('checkbox', { name: 'Write the docs' })).toExist(),
      expect(label('Task title')).not.toExist(),
    )
  })

  test('a deleted task disappears', () => {
    scene(
      { update, view },
      given(loadedModel),
      click(role('button', { name: 'Delete Plan release' })),
      Command.resolve(
        DeleteTask,
        Message.SucceededDeleteTask({ id: releaseTask.id }),
      ),
      expect(text('Plan release')).not.toExist(),
      expect(role('status')).toContainText('0 of 1 done'),
    )
  })
})
