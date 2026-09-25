import { Array, Option, Schema, String, pipe } from 'effect'
import { AsyncData, type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { type Task, type TaskId, TaskTitle } from '@echo/api/rpcs'

import type { ApiClient } from './api'
import {
  CreateTask,
  DeleteTask,
  FocusEditTitle,
  LoadTasks,
  UpdateTask,
} from './command'
import { INVALID_TITLE_ERROR } from './constant'
import { TaskRow } from './domain'
import { Message } from './message'
import { Editing, type Model, NewTask, TaskRows } from './model'

type UpdateReturn = Update.Return<Model, Message, ApiClient>

const findIdleRow = (
  model: Model,
  id: TaskId,
): Option.Option<TaskRow.TaskRow> =>
  pipe(
    AsyncData.getData(model.tasks),
    Option.flatMap(Array.findFirst(TaskRow.hasId(id))),
    Option.filter(TaskRow.isIdle),
  )

const parseTitle = (raw: string): Option.Option<string> =>
  Schema.decodeOption(TaskTitle)(String.trim(raw))

const withError = (model: Model, error: string): Model =>
  evo(model, { maybeError: () => Option.some(error) })

const closeEditorFor =
  (id: TaskId) =>
  (editing: Editing): Editing =>
    Editing.match(editing, {
      NotEditing: () => editing,
      Editing: editor => (editor.id === id ? Editing.NotEditing() : editing),
    })

const saveTask = (
  model: Model,
  task: Task,
  title: string,
  isCompleted: boolean,
): UpdateReturn => ({
  model: evo(model, {
    tasks: AsyncData.map(TaskRow.setStatus(task.id, TaskRow.Status.Saving())),
    maybeError: () => Option.none(),
  }),
  commands: [UpdateTask({ id: task.id, title, completed: isCompleted })],
})

const saveEditedTitle =
  (model: Model) =>
  ({ id, title }: typeof Editing.Editing.Type): UpdateReturn =>
    Option.match(findIdleRow(model, id), {
      onNone: () => ({ model }),
      onSome: ({ task }) =>
        Option.match(parseTitle(title), {
          onNone: () => ({ model: withError(model, INVALID_TITLE_ERROR) }),
          onSome: validTitle =>
            validTitle === task.title
              ? { model: evo(model, { editing: () => Editing.NotEditing() }) }
              : saveTask(model, task, validTitle, task.completed),
        }),
    })

const submitDraft =
  (model: Model) =>
  ({ title }: typeof NewTask.Drafting.Type): UpdateReturn =>
    Option.match(parseTitle(title), {
      onNone: () => ({ model: withError(model, INVALID_TITLE_ERROR) }),
      onSome: validTitle => ({
        model: evo(model, {
          newTask: () => NewTask.Submitting({ title }),
          maybeError: () => Option.none(),
        }),
        commands: [CreateTask({ title: validTitle })],
      }),
    })

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SucceededLoadTasks: ({ tasks }) => ({
      model: evo(model, {
        tasks: () => TaskRows.Success({ data: TaskRow.fromTasks(tasks) }),
      }),
    }),

    FailedLoadTasks: ({ error }) => ({
      model: evo(model, { tasks: () => TaskRows.Failure({ error }) }),
    }),

    ClickedRetryLoad: () => ({
      model: evo(model, { tasks: () => TaskRows.Loading() }),
      commands: [LoadTasks()],
    }),

    UpdatedNewTaskTitle: ({ value }) => ({
      model: evo(model, {
        newTask: NewTask.match<NewTask>({
          Drafting: () => NewTask.Drafting({ title: value }),
          Submitting: submitting => submitting,
        }),
      }),
    }),

    SubmittedNewTask: () =>
      AsyncData.hasData(model.tasks)
        ? NewTask.match<UpdateReturn>(model.newTask, {
            Submitting: () => ({ model }),
            Drafting: submitDraft(model),
          })
        : { model },

    SucceededCreateTask: ({ task }) => ({
      model: evo(model, {
        tasks: AsyncData.map(TaskRow.insert(task)),
        newTask: () => NewTask.Drafting({ title: '' }),
      }),
    }),

    FailedCreateTask: ({ error }) => ({
      model: withError(
        evo(model, {
          newTask: ({ title }) => NewTask.Drafting({ title }),
        }),
        error,
      ),
    }),

    ToggledTask: ({ id, isCompleted }) =>
      Option.match(findIdleRow(model, id), {
        onNone: () => ({ model }),
        onSome: ({ task }) =>
          Option.match(parseTitle(task.title), {
            onNone: () => ({ model: withError(model, INVALID_TITLE_ERROR) }),
            onSome: title => saveTask(model, task, title, isCompleted),
          }),
      }),

    ClickedEditTask: ({ id }) =>
      Option.match(findIdleRow(model, id), {
        onNone: () => ({ model }),
        onSome: ({ task }) => ({
          model: evo(model, {
            editing: () => Editing.Editing({ id, title: task.title }),
          }),
          commands: [FocusEditTitle()],
        }),
      }),

    UpdatedEditTitle: ({ value }) => ({
      model: evo(model, {
        editing: Editing.match<Editing>({
          NotEditing: notEditing => notEditing,
          Editing: ({ id }) => Editing.Editing({ id, title: value }),
        }),
      }),
    }),

    SubmittedEditTask: () =>
      Editing.match<UpdateReturn>(model.editing, {
        NotEditing: () => ({ model }),
        Editing: saveEditedTitle(model),
      }),

    ClickedCancelEdit: () => ({
      model: evo(model, { editing: () => Editing.NotEditing() }),
    }),

    CompletedFocusEditTitle: () => ({ model }),

    SucceededUpdateTask: ({ task }) => ({
      model: evo(model, {
        tasks: AsyncData.map(TaskRow.replace(task)),
        editing: closeEditorFor(task.id),
      }),
    }),

    FailedUpdateTask: ({ id, error }) => ({
      model: withError(
        evo(model, {
          tasks: AsyncData.map(TaskRow.setStatus(id, TaskRow.Status.Idle())),
        }),
        error,
      ),
    }),

    ClickedDeleteTask: ({ id }) =>
      Option.match(findIdleRow(model, id), {
        onNone: () => ({ model }),
        onSome: () => ({
          model: evo(model, {
            tasks: AsyncData.map(
              TaskRow.setStatus(id, TaskRow.Status.Deleting()),
            ),
            maybeError: () => Option.none(),
          }),
          commands: [DeleteTask({ id })],
        }),
      }),

    SucceededDeleteTask: ({ id }) => ({
      model: evo(model, {
        tasks: AsyncData.map(TaskRow.remove(id)),
        editing: closeEditorFor(id),
      }),
    }),

    FailedDeleteTask: ({ id, error }) => ({
      model: withError(
        evo(model, {
          tasks: AsyncData.map(TaskRow.setStatus(id, TaskRow.Status.Idle())),
        }),
        error,
      ),
    }),

    ClickedDismissError: () => ({
      model: evo(model, { maybeError: () => Option.none() }),
    }),
  })
