import { Option } from 'effect'
import { Runtime } from 'foldkit'

import type { ApiClient } from './api'
import { LoadTasks } from './command'
import { Message } from './message'
import { Editing, Model, NewTask, TaskRows } from './model'
import { update } from './update'
import { view } from './view'

// INIT

export const init: Runtime.ApplicationInit<
  Model,
  Message,
  void,
  ApiClient
> = () => ({
  model: {
    tasks: TaskRows.Loading(),
    newTask: NewTask.Drafting({ title: '' }),
    editing: Editing.NotEditing(),
    maybeError: Option.none(),
  },
  commands: [LoadTasks()],
})

export { Message, Model, update, view }
