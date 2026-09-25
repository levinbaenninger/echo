import { Schema } from 'effect'
import { AsyncData } from 'foldkit'
import { defineTaggedUnion } from 'foldkit/schema'

import { TaskId } from '@echo/api/rpcs'

import { TaskRow } from './domain'

export const TaskRows = AsyncData.Schema(
  Schema.Array(TaskRow.TaskRow),
  Schema.String,
)

export const NewTask = defineTaggedUnion({
  Drafting: { title: Schema.String },
  Submitting: { title: Schema.String },
})

export type NewTask = typeof NewTask.Type

export const Editing = defineTaggedUnion({
  NotEditing: {},
  Editing: { id: TaskId, title: Schema.String },
})

export type Editing = typeof Editing.Type

export const Model = Schema.Struct({
  tasks: TaskRows.schema,
  newTask: NewTask,
  editing: Editing,
  maybeError: Schema.Option(Schema.String),
})

export type Model = typeof Model.Type
