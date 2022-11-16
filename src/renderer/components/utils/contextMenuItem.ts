export interface ContextMenuItem {
  label?: string;
  click?: () => void;
  id?: string;
  separate?: boolean;
  disabled?: boolean;
  skip?: boolean;
}
