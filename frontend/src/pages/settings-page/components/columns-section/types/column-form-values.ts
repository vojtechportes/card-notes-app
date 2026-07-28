export interface ColumnFormValues {
  allowMultipleLabels: boolean
  isMultiImage: boolean
  labelSourceIds: string[]
  name: string
  title: string
  type: 'text' | 'date' | 'number' | 'image' | 'link' | 'labels'
}
