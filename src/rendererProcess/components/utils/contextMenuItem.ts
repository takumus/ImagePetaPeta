export interface ContextMenuItem {
  label?: string,
  click?: () => any,
  id?: string,
  separate?: boolean,
  disabled?: boolean,
  skip?: boolean
}