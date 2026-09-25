import { Html, HtmlBuilder } from 'foldkit/html'

import { Button, Input } from '@foldkit/ui'

import { NEW_TASK_INPUT_ID } from '../constant'
import { Message } from '../message'
import { NewTask } from '../model'
import { inputClass, primaryButtonClass } from './style'

export const newTaskFormView = (
  newTask: NewTask,
  isListLoaded: boolean,
  h: HtmlBuilder<Message>,
): Html => {
  const isSubmitting = NewTask.guards.Submitting(newTask)
  const isDisabled = isSubmitting || !isListLoaded

  return h.form(
    [
      h.AriaLabel('New task'),
      h.Class('flex gap-3'),
      h.OnSubmit(Message.SubmittedNewTask()),
    ],
    [
      Input.view(
        {
          id: NEW_TASK_INPUT_ID,
          value: newTask.title,
          placeholder: 'What needs doing?',
          isDisabled,
          onInput: value => Message.UpdatedNewTaskTitle({ value }),
          toView: attributes =>
            h.input([
              ...attributes.input,
              h.AriaLabel('New task title'),
              h.Class(`${inputClass} flex-1`),
            ]),
        },
        h,
      ),
      Button.view(
        {
          type: 'submit',
          isDisabled,
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class(primaryButtonClass)],
              [isSubmitting ? 'Adding…' : 'Add task'],
            ),
        },
        h,
      ),
    ],
  )
}
