export interface PopupMenuItem {
  id: any;
  label: string;
  dotColor?: string;           
  icon?: 'edit' | 'delete' | 'view' | 'copy' | 'check2-circle' | 'plus' | 'eye' | 'eye-slash' | 'lock' | 'unlock' | 'download' | 'upload'; 
  showEditIcon?: boolean;      
  selected?: boolean;         
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

export interface PopupMenuConfig {
  title: string;
  items: PopupMenuItem[];
  showAddBtn?: boolean;
  width?: number;
  position: { top: number; left: number } | null;
}
