import { Option } from 'effect'
import { evo } from 'foldkit/struct'

import { type Task, TaskId } from '@echo/api/rpcs'

import { TaskRow } from './domain'
import { Editing, type Model, NewTask, TaskRows } from './model'

export const docsTask: Task = {
  id: TaskId.make('0f5c3b9e-1d2a-4c3b-8e7f-6a5b4c3d2e1f'),
  title: 'Write docs',
  completed: false,
}

export const releaseTask: Task = {
  id: TaskId.make('a3bcb5e4-4705-45ba-87e1-b398a21b7953'),
  title: 'Plan release',
  completed: true,
}

export const loadingModel: Model = {
  tasks: TaskRows.Loading(),
  newTask: NewTask.Drafting({ title: '' }),
  editing: Editing.NotEditing(),
  maybeError: Option.none(),
}

export const emptyModel: Model = evo(loadingModel, {
  tasks: () => TaskRows.Success({ data: [] }),
})

export const loadedModel: Model = evo(loadingModel, {
  tasks: () =>
    TaskRows.Success({ data: TaskRow.fromTasks([docsTask, releaseTask]) }),
})
