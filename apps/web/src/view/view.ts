import { Option } from 'effect'
import { AsyncData } from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Message } from '../message'
import type { Model } from '../model'
import { newTaskFormView } from './newTaskForm'
import { primaryButtonClass } from './style'
import { taskListView } from './taskList'

const errorBannerView = (
  maybeError: Option.Option<string>,
  h: HtmlBuilder<Message>,
): Html =>
  Option.match(maybeError, {
    onNone: () => h.empty,
    onSome: error =>
      h.div(
        [
          h.Role('alert'),
          h.Class(
            'flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800',
          ),
        ],
        [
          h.p([], [error]),
          Button.view(
            {
              onClick: Message.ClickedDismissError(),
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class('font-medium underline hover:no-underline'),
                  ],
                  ['Dismiss'],
                ),
            },
            h,
          ),
        ],
      ),
  })

const loadingView = (h: HtmlBuilder<Message>): Html =>
  h.p(
    [h.Role('status'), h.Class('py-8 text-center text-gray-500')],
    ['Loading tasks…'],
  )

const loadFailureView = (error: string, h: HtmlBuilder<Message>): Html =>
  h.div(
    [h.Role('alert'), h.Class('flex flex-col items-center gap-3 py-8')],
    [
      h.p([h.Class('text-red-700')], [`Could not load tasks: ${error}`]),
      Button.view(
        {
          onClick: Message.ClickedRetryLoad(),
          toView: attributes =>
            h.button(
              [...attributes.button, h.Class(primaryButtonClass)],
              ['Try again'],
            ),
        },
        h,
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Echo · Tasks',
  body: h.main(
    [h.Class('min-h-screen bg-gray-100 px-4 py-12')],
    [
      h.div(
        [
          h.Class(
            'mx-auto flex max-w-xl flex-col gap-6 rounded-xl bg-white p-6 shadow',
          ),
        ],
        [
          h.h1([h.Class('text-2xl font-semibold text-gray-900')], ['Tasks']),
          errorBannerView(model.maybeError, h),
          newTaskFormView(model.newTask, AsyncData.hasData(model.tasks), h),
          AsyncData.match(model.tasks, {
            onIdle: () => loadingView(h),
            onLoading: () => loadingView(h),
            onFailure: error => loadFailureView(error, h),
            onRefreshing: rows => taskListView(rows, model.editing, h),
            onStale: ({ data }) => taskListView(data, model.editing, h),
            onSuccess: rows => taskListView(rows, model.editing, h),
          }),
        ],
      ),
    ],
  ),
})
