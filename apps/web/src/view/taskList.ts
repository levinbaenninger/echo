import { Array } from 'effect'
import { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Checkbox, Input } from '@foldkit/ui'

import { EDIT_TASK_INPUT_ID } from '../constant'
import { TaskRow } from '../domain'
import { Message } from '../message'
import { Editing } from '../model'
import { ghostButtonClass, inputClass, primaryButtonClass } from './style'

const statusView = (status: TaskRow.Status, h: HtmlBuilder<Message>): Html =>
  TaskRow.Status.match(status, {
    Idle: () => h.empty,
    Saving: () => h.span([h.Class(statusClass)], ['Saving…']),
    Deleting: () => h.span([h.Class(statusClass)], ['Deleting…']),
  })

const taskRowView = (row: TaskRow.TaskRow, h: HtmlBuilder<Message>): Html => {
  const { task, status } = row
  const isBusy = !TaskRow.isIdle(row)

  return h.keyed('li')(
    task.id,
    [
      h.AriaBusy(isBusy),
      h.Class(
        `flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 ${isBusy ? 'opacity-60' : ''}`,
      ),
    ],
    [
      Checkbox.view(
        {
          id: `task-${task.id}`,
          isChecked: task.completed,
          isDisabled: isBusy,
          onToggle: isCompleted =>
            Message.ToggledTask({ id: task.id, isCompleted }),
          toView: attributes =>
            h.div(
              [h.Class('flex flex-1 items-center gap-3')],
              [
                h.div(
                  [
                    ...attributes.checkbox,
                    h.Class(
                      `flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border transition ${
                        task.completed
                          ? 'border-gray-900 bg-gray-900'
                          : 'border-gray-300 bg-white'
                      }`,
                    ),
                  ],
                  task.completed
                    ? [h.span([h.Class('text-xs text-white')], ['✓'])]
                    : [],
                ),
                h.span(
                  [
                    ...attributes.label,
                    h.Class(
                      `flex-1 cursor-pointer ${
                        task.completed
                          ? 'text-gray-400 line-through'
                          : 'text-gray-900'
                      }`,
                    ),
                  ],
                  [task.title],
                ),
              ],
            ),
        },
        h,
      ),
      statusView(status, h),
      Button.view(
        {
          onClick: Message.ClickedEditTask({ id: task.id }),
          isDisabled: isBusy,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel(`Edit ${task.title}`),
                h.Class(ghostButtonClass),
              ],
              ['Edit'],
            ),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.ClickedDeleteTask({ id: task.id }),
          isDisabled: isBusy,
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.AriaLabel(`Delete ${task.title}`),
                h.Class(`${ghostButtonClass} text-red-600`),
              ],
              ['Delete'],
            ),
        },
        h,
      ),
    ],
  )
}

const editingRowView = (
  row: TaskRow.TaskRow,
  title: string,
  h: HtmlBuilder<Message>,
): Html => {
  const isSaving = TaskRow.Status.guards.Saving(row.status)

  return h.keyed('li')(
    row.task.id,
    [h.AriaBusy(isSaving), h.Class('rounded-lg bg-gray-50 px-3 py-2')],
    [
      h.form(
        [
          h.AriaLabel('Rename task'),
          h.Class('flex gap-2'),
          h.OnSubmit(Message.SubmittedEditTask()),
        ],
        [
          Input.view(
            {
              id: EDIT_TASK_INPUT_ID,
              value: title,
              isDisabled: isSaving,
              onInput: value => Message.UpdatedEditTitle({ value }),
              toView: attributes =>
                h.input([
                  ...attributes.input,
                  h.AriaLabel('Task title'),
                  h.Class(`${inputClass} flex-1`),
                ]),
            },
            h,
          ),
          Button.view(
            {
              type: 'submit',
              isDisabled: isSaving,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(primaryButtonClass)],
                  [isSaving ? 'Saving…' : 'Save'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedCancelEdit(),
              isDisabled: isSaving,
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(ghostButtonClass)],
                  ['Cancel'],
                ),
            },
            h,
          ),
        ],
      ),
    ],
  )
}

const rowView =
  (editing: Editing, h: HtmlBuilder<Message>) =>
  (row: TaskRow.TaskRow): Html =>
    Editing.match(editing, {
      NotEditing: () => taskRowView(row, h),
      Editing: ({ id, title }) =>
        id === row.task.id
          ? editingRowView(row, title, h)
          : taskRowView(row, h),
    })

export const taskListView = (
  rows: ReadonlyArray<TaskRow.TaskRow>,
  editing: Editing,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(rows, {
    onEmpty: () =>
      h.p(
        [h.Class('py-8 text-center text-gray-500')],
        ['No tasks yet. Add one above.'],
      ),
    onNonEmpty: nonEmptyRows => {
      const doneCount = Array.length(
        Array.filter(nonEmptyRows, ({ task }) => task.completed),
      )

      return h.div(
        [h.Class('flex flex-col gap-3')],
        [
          h.ul(
            [h.AriaLabel('Tasks'), h.Class('flex flex-col gap-1')],
            Array.map(nonEmptyRows, rowView(editing, h)),
          ),
          h.p(
            [h.Role('status'), h.Class('text-sm text-gray-500')],
            [`${doneCount} of ${Array.length(nonEmptyRows)} done`],
          ),
        ],
      )
    },
  })

// STYLE

const statusClass = 'text-xs text-gray-500'
