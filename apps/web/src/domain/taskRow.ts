import { Array, Order, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { Task, TaskId } from '@echo/api/rpcs'

export const Status = defineTaggedUnion({
  Idle: {},
  Saving: {},
  Deleting: {},
})

export type Status = typeof Status.Type

export const TaskRow = Schema.Struct({ task: Task, status: Status })

export type TaskRow = typeof TaskRow.Type

const order: Order.Order<TaskRow> = Order.combine(
  Order.mapInput(Order.String, ({ task }: TaskRow) => task.title),
  Order.mapInput(Order.String, ({ task }: TaskRow) => task.id),
)

export const fromTask = (task: Task): TaskRow => ({
  task,
  status: Status.Idle(),
})

export const isIdle = ({ status }: TaskRow): boolean =>
  Status.guards.Idle(status)

export const hasId =
  (id: TaskId) =>
  ({ task }: TaskRow): boolean =>
    task.id === id

export const fromTasks = (tasks: ReadonlyArray<Task>): ReadonlyArray<TaskRow> =>
  Array.sort(Array.map(tasks, fromTask), order)

export const insert =
  (task: Task) =>
  (rows: ReadonlyArray<TaskRow>): ReadonlyArray<TaskRow> =>
    Array.sort(Array.append(rows, fromTask(task)), order)

export const replace =
  (task: Task) =>
  (rows: ReadonlyArray<TaskRow>): ReadonlyArray<TaskRow> =>
    Array.sort(
      Array.map(rows, row => (hasId(task.id)(row) ? fromTask(task) : row)),
      order,
    )

export const remove =
  (id: TaskId) =>
  (rows: ReadonlyArray<TaskRow>): ReadonlyArray<TaskRow> =>
    Array.filter(rows, row => !hasId(id)(row))

export const setStatus =
  (id: TaskId, status: Status) =>
  (rows: ReadonlyArray<TaskRow>): ReadonlyArray<TaskRow> =>
    Array.map(rows, row =>
      hasId(id)(row) ? evo(row, { status: () => status }) : row,
    )
