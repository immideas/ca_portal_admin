import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableRow, TableSection } from '../grant-permissions/grant-permissions.component';

@Component({
  selector: 'app-permissions-table',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckboxModule, MatIconModule, MatTooltipModule],
  templateUrl: './permissions-table.component.html',
  styleUrls: ['./permissions-table.component.css'],
})
export class PermissionsTableComponent {
  @Input() tableSections: TableSection[] = [];
  @Input() selectedUser: any = null;
  @Input() mode: 'edit' | 'view' = 'edit';
  @Input() showFull = true;
  @Output() permChange = new EventEmitter<void>();
  @Output() viewPermClick = new EventEmitter<any>();

  userDetailsPanelOpen = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.others-popup-container')) {
      this.closeAllPopups();
    }
  }

  closeAllPopups(): void {
    this.tableSections.forEach((section) =>
      section.rows.forEach((row: any) => {
        row.showOthersPopup = false;
        row.openUpward = false;
      }),
    );
  }

  isRowFullyChecked(row: TableRow): boolean {
    const std = [row.view, row.create, row.edit, row.delete, row.sidePanel]
      .filter((p) => p && !p.disabled);
    return std.length > 0 && std.every((p) => p.isChecked);
  }

  hasEnabledPermissions(row: TableRow): boolean {
    return [row.full, row.view, row.create, row.edit, row.delete, row.sidePanel, ...(row.others || [])]
      .filter(Boolean)
      .some((perm: any) => perm.disabled !== true);
  }

  onFullChange(row: TableRow): void {
    const checked = row.full?.isChecked ?? false;
    if (row.view && !row.view.disabled) row.view.isChecked = checked;
    if (row.create && !row.create.disabled) row.create.isChecked = checked;
    if (row.edit && !row.edit.disabled) row.edit.isChecked = checked;
    if (row.delete && !row.delete.disabled) row.delete.isChecked = checked;
    if (row.sidePanel && !row.sidePanel.disabled) row.sidePanel.isChecked = checked;
    row.others.forEach((p: any) => {
      if (!p.disabled) p.isChecked = checked;
    });
    this.permChange.emit();
  }

  onVirtualFullChange(row: TableRow, event: any): void {
    const checked = event.checked;
    if (row.view && !row.view.disabled) row.view.isChecked = checked;
    if (row.create && !row.create.disabled) row.create.isChecked = checked;
    if (row.edit && !row.edit.disabled) row.edit.isChecked = checked;
    if (row.delete && !row.delete.disabled) row.delete.isChecked = checked;
    if (row.sidePanel && !row.sidePanel.disabled) row.sidePanel.isChecked = checked;
    row.others.forEach((p: any ) => {
      if (!p.disabled) p.isChecked = checked;
    });
    this.permChange.emit();
  }

  onColumnChange(row: TableRow): void {
    if (!row.full) {
      this.permChange.emit();
      return;
    }
    const std = [row.view, row.create, row.edit, row.delete, row.sidePanel].filter(Boolean);
    row.full.isChecked = std.length > 0 && std.every((p) => p.isChecked);
    this.permChange.emit();
  }

  isRowDisabled(row: TableRow): boolean {
    return [row.full, row.view, row.create, row.edit, row.delete, row.sidePanel, ...(row.others || [])]
      .filter(Boolean)
      .some((perm: any) => perm.disabled === true);
  }

 toggleOthersPopup(row: any, section: any, event: MouseEvent): void {
  event.stopPropagation();
  const wasOpen = row.showOthersPopup;
  this.closeAllPopups();

  if (!wasOpen) {
    const link = (event.currentTarget as HTMLElement);
    const rect = link.getBoundingClientRect();

    const popupEstimatedHeight = (row.others?.length ?? 1) * 36 + 32;
    const spaceBelow = window.innerHeight - rect.bottom;

    if (spaceBelow < popupEstimatedHeight && rect.top > spaceBelow) {
      row.popupStyle = {
        position: 'fixed',
        bottom: (window.innerHeight - rect.top + 4) + 'px',
        left: rect.left + 'px',
        top: 'auto'
      };
    } else {
      row.popupStyle = {
        position: 'fixed',
        top: (rect.bottom + 4) + 'px',
        left: rect.left + 'px',
        bottom: 'auto'
      };
    }

    row.showOthersPopup = true;
  }
}
}
