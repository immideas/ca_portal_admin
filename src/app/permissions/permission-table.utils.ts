export interface TableRow {
  rowName: string;
  groupCode: string;
  full: any | null;
  view: any | null;
  create: any | null;
  edit: any | null;
  delete: any | null;
  sidePanel: any | null;
  others: any[];
  showOthersPopup: boolean;
}

export interface TableSection {
  sectionName: string;
  rows: TableRow[];
}

export type PermissionColumn =
  | 'full' | 'view' | 'create' | 'edit' | 'delete' | 'sidepanel' | 'other';

/**
 * Permission ka naam dekh ke decide karta hai ki woh table ke kis
 * column (Full/View/Create/Edit/Delete/Side Panel/Others) mein jaayegi.
 */
export function getColumnKey(permName: string): PermissionColumn {
  const n = (permName || '').toLowerCase().trim();

  if (n === 'full') return 'full';

  // 'Manage X' permissions -> Side Panel column
  // (sidebar-nav.model.ts mein sidebar icon visibility isi permission se
  // control hoti hai — manage_project, manage_ticket, manage_categories, etc.)
  // Yeh check sabse pehle hai taaki 'Manage Activity Details' jaisa naam
  // 'detail' keyword ki wajah se galti se View column mein na chala jaaye.
  if (n.startsWith('manage')) return 'sidepanel';

  if (n.includes('delete') || n.includes('remove')) return 'delete';
  if (n.includes('create') || n.includes('add') || n.includes('import')) return 'create';
  if (n.includes('edit')   || n.includes('update')) return 'edit';
  if (n.includes('view')   || n.includes('list') || n.includes('detail') || n.includes('export')) return 'view';
  if (n.includes('side panel') || n.includes('sidepanel') ||
      n.includes('side bar')   || n.includes('sidebar') || n === 'side') return 'sidepanel';

  return 'other';
}

/**
 * Permission object se section ka naam nikalta hai
 * (jis section header ke neeche row group hoga).
 */
export function getSectionName(perm: any): string {
  return (
    (perm?.section_name || perm?.section || perm?.category ||
      perm?.module || perm?.parent_name || perm?.parent_groupName ||
      perm?.group_category || '').toString().trim()
  ) || 'General';
}

export interface GroupedPermission {
  groupName: string;
  permissions: any[];
  isChecked: boolean;
}

/**
 * Grouped permissions (group_name ke hisaab se already grouped) ko
 * TableSection[] mein badalta hai — har group ek row banti hai,
 * jiske andar Full/View/Create/Edit/Delete/SidePanel/Others columns
 * getColumnKey() se decide hote hain.
 */
export function buildTableSections(groupedPermissions: GroupedPermission[]): TableSection[] {
  const sectionMap: Record<string, TableRow[]> = {};

  groupedPermissions.forEach((group) => {
    const sectionName = getSectionName(group.permissions[0]);

    const row: TableRow = {
      rowName: group.groupName,
      groupCode: group.permissions[0]?.groupCode || group.permissions[0]?.group_code || '',
      full: null, view: null, create: null,
      edit: null, delete: null, sidePanel: null,
      others: [], showOthersPopup: false,
    };

    group.permissions.forEach((p: any) => {
      const col = getColumnKey(p.name);
      if      (col === 'full')      row.full = p;
      else if (col === 'view')      row.view = p;
      else if (col === 'create')    row.create = p;
      else if (col === 'edit')      row.edit = p;
      else if (col === 'delete')    row.delete = p;
      else if (col === 'sidepanel') row.sidePanel = p;
      else                          row.others.push(p);
    });

    if (!sectionMap[sectionName]) sectionMap[sectionName] = [];
    sectionMap[sectionName].push(row);
  });

  return Object.entries(sectionMap).map(([sectionName, rows]) => ({ sectionName, rows }));
}