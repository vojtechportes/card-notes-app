import { HttpException, HttpStatus } from '@nestjs/common'

interface RuntimeHttpErrorResponse {
  body: object | string
  status: number
}

interface StructuralHttpError {
  message: string
  statusCode: number
}

const isStructuralHttpError = (
  error: unknown
): error is StructuralHttpError => {
  if (!error || typeof error !== 'object') {
    return false
  }

  const candidate = error as Partial<StructuralHttpError>

  return (
    typeof candidate.message === 'string' &&
    typeof candidate.statusCode === 'number' &&
    Number.isInteger(candidate.statusCode) &&
    candidate.statusCode >= 400 &&
    candidate.statusCode <= 599
  )
}

export const getRuntimeHttpErrorResponse = (
  error: unknown
): RuntimeHttpErrorResponse => {
  if (error instanceof HttpException) {
    const status = error.getStatus()
    const response = error.getResponse()

    if (typeof response === 'string') {
      return {
        body: {
          message: response,
          statusCode: status,
        },
        status,
      }
    }

    return {
      body: response,
      status,
    }
  }

  if (isStructuralHttpError(error)) {
    return {
      body: {
        message: error.message,
        statusCode: error.statusCode,
      },
      status: error.statusCode,
    }
  }

  return {
    body: {
      message: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    },
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  }
}
