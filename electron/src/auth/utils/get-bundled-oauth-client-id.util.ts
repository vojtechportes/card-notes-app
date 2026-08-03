const placeholderPattern = /^__NOTESTACK_[A-Z_]+__$/

export const getBundledOAuthClientId = (value: string): string => {
  return placeholderPattern.test(value) ? '' : value
}
