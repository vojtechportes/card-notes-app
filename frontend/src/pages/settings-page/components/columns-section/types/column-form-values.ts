export interface ColumnFormValues {
  allowMultipleLabels: boolean
  isHidden: boolean
  isMultiImage: boolean
  labelSourceIds: string[]
  name: string
  title: string
  type: 'text' | 'date' | 'number' | 'image' | 'link' | 'labels'
}
