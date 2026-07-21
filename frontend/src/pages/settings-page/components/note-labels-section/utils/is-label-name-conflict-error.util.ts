import axios from 'axios'

export const isLabelNameConflictError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 409
}
