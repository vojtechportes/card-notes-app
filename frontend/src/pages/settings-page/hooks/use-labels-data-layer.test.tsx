import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import type { PropsWithChildren, ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CreateLabelDto,
  DeleteLabelResultDto,
  LabelDto,
  UpdateLabelDto,
} from '../../../types/api'
import {
  createLabel,
  deleteLabel,
  getLabels,
  updateLabel,
} from '../../../api/settings/requests'
import { notesQueryKeys } from '../../notes-page/constants/notes-query-keys'
import { settingsQueryKeys } from '../constants/settings-query-keys'
import { useCreateLabelMutation } from './use-create-label-mutation'
import { useDeleteLabelMutation } from './use-delete-label-mutation'
import { useLabelsQuery } from './use-labels-query'
import { useUpdateLabelMutation } from './use-update-label-mutation'

vi.mock('../../../api/settings/requests', () => ({
  createLabel: vi.fn(),
  deleteLabel: vi.fn(),
  getLabels: vi.fn(),
  updateLabel: vi.fn(),
}))

const createResponse = <TData,>(data: TData): AxiosResponse<TData> => ({
  config: {} as AxiosResponse<TData>['config'],
  data,
  headers: {},
  status: 200,
  statusText: 'OK',
})

const label: LabelDto = {
  color: '#0070F2',
  createdAt: '2026-07-21T10:00:00.000Z',
  id: 'label-1',
  name: 'priority',
  noteTypeId: null,
  title: 'Priority',
  updatedAt: '2026-07-21T10:00:00.000Z',
}

let queryClient: QueryClient
let wrapper: ({ children }: PropsWithChildren) => ReactElement

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
})

describe('label settings data layer', () => {
  it('loads labels through the labels query key', async () => {
    vi.mocked(getLabels).mockResolvedValue(createResponse([label]))

    const { result } = renderHook(() => useLabelsQuery(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual([label]))
    expect(getLabels).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(queryClient.getQueryData(settingsQueryKeys.labels())).toEqual([
      label,
    ])
  })

  it('creates labels and refreshes labels', async () => {
    const payload: CreateLabelDto = {
      color: label.color,
      name: label.name,
      noteTypeId: null,
      title: label.title,
    }
    vi.mocked(createLabel).mockResolvedValue(createResponse(label))
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useCreateLabelMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(payload)
    })

    expect(createLabel).toHaveBeenCalledWith(payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.labels(),
    })
  })

  it('updates labels and refreshes labels plus rendered notes', async () => {
    const payload: UpdateLabelDto = { title: 'Important' }
    vi.mocked(updateLabel).mockResolvedValue(
      createResponse({ ...label, title: 'Important' })
    )
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useUpdateLabelMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ id: label.id, label: payload })
    })

    expect(updateLabel).toHaveBeenCalledWith(label.id, payload)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.labels(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.all(),
    })
  })

  it('deletes labels and refreshes labels plus affected notes', async () => {
    const resultDto: DeleteLabelResultDto = {
      affectedNoteValuesCount: 3,
      deletedLabelId: label.id,
    }
    vi.mocked(deleteLabel).mockResolvedValue(createResponse(resultDto))
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDeleteLabelMutation(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync(label.id)
    })

    expect(deleteLabel).toHaveBeenCalledWith(label.id)
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: settingsQueryKeys.labels(),
    })
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: notesQueryKeys.all(),
    })
  })
})
