export type TopBarButtonType = 'primary' | 'secondary' | 'danger';

export interface TopBarButton {
  action: string;
  label: string;
  type?: TopBarButtonType;
 
  icon?: 'save' | string;
  disabled?: boolean;
}
