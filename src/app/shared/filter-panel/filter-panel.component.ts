import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterState {
  selectedAdmin: any;
  selectedRole: any;
  selectedSubAdmin: any;
  selectedRange: string;
  selectedRangeLabel: string;
  customRangeStart: string;
  customRangeEnd: string;
  selectedModel?: string;
  selectedActivityType?: string;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.css'],
})
export class FilterPanelComponent implements OnChanges {

  @Input() isOpen = false;
  @Input() isSuperAdmin = false;
  @Input() adminDropdownDisabled = false;

  @Input() admins: any[] = [];
  @Input() roles: any[] = [];
  @Input() subAdmins: any[] = [];
  @Input() loadingSubAdmins = false;

  @Input() uniqueModels: string[] = [];
  @Input() uniqueActivityTypes: string[] = [];

  @Input() selectedAdmin: any = null;
  @Input() selectedRole: any = null;
  @Input() selectedSubAdmin: any = null;
  @Input() selectedRange = 'all';
  @Input() selectedRangeLabel = 'All';
  @Input() customRangeStart = '';
  @Input() customRangeEnd = '';
  @Input() selectedModel = '';
  @Input() selectedActivityType = '';

  @Output() closed = new EventEmitter<void>();
  @Output() applied = new EventEmitter<FilterState>();
  @Output() cleared = new EventEmitter<void>();

  @Output() adminSelected = new EventEmitter<any>();
  @Output() roleSelected = new EventEmitter<any>();
  @Output() subAdminSelected = new EventEmitter<any>();

  openDropdown: string | null = null;

  rangeOptions = [
    { label: 'All',          value: 'all' },
    { label: 'Today',        value: 'today' },
    { label: 'Yesterday',    value: 'yesterday' },
    { label: 'Last 7 Days',  value: 'last7Days' },
    { label: 'Last 30 Days', value: 'last30Days' },
    { label: 'Custom Range', value: 'custom' },
  ];

  localAdmin: any = null;
  localRole: any = null;
  localSubAdmin: any = null;
  localRange = 'all';
  localRangeLabel = 'All';
  localCustomStart = '';
  localCustomEnd = '';
  localModel = '';
  localActivityType = '';

 
  
ngOnChanges(changes: SimpleChanges): void {

  if (changes['selectedAdmin']) {
    this.localAdmin = this.selectedAdmin;
  }

  if (changes['selectedRole']) {
    this.localRole = this.selectedRole;
  }

  if (changes['selectedSubAdmin']) {
    this.localSubAdmin = this.selectedSubAdmin;
  }

  if (changes['isOpen'] && this.isOpen) {
    this.syncFromInputs();
  }
}

  private syncFromInputs(): void {
    this.localAdmin        = this.selectedAdmin;
    this.localRole         = this.selectedRole;
    this.localSubAdmin     = this.selectedSubAdmin;
    this.localRange        = this.selectedRange;
    this.localRangeLabel   = this.selectedRangeLabel;
    this.localCustomStart  = this.customRangeStart;
    this.localCustomEnd    = this.customRangeEnd;
    this.localModel        = this.selectedModel;
    this.localActivityType = this.selectedActivityType;
  }

  toggleDropdown(name: string): void {
    this.openDropdown = this.openDropdown === name ? null : name;
  }

  closeAllDropdowns(): void {
    this.openDropdown = null;
  }

  onSelectAdmin(admin: any): void {
    this.localAdmin    = admin;
    this.localRole     = null;
    this.localSubAdmin = null;
    this.openDropdown  = null;
    this.adminSelected.emit(admin);
  }

  onSelectRole(role: any): void {
    this.localRole     = role;
    this.localSubAdmin = null;
    this.openDropdown  = null;
      

    this.roleSelected.emit(role);
  }

  onSelectSubAdmin(subAdmin: any): void {
    this.localSubAdmin = subAdmin;
    this.openDropdown  = null;
    this.subAdminSelected.emit(subAdmin);
  }

  onSelectRange(opt: { label: string; value: string }): void {
    this.localRange      = opt.value;
    this.localRangeLabel = opt.label;
    this.openDropdown    = null;
    if (opt.value !== 'custom') {
      this.localCustomStart = '';
      this.localCustomEnd   = '';
    }
  }

  onModelChange(model: string): void {
    this.localModel   = model;
    this.openDropdown = null;
  }

  onActivityTypeChange(type: string): void {
    this.localActivityType = type;
    this.openDropdown      = null;
  }

  formatActivityType(type: string): string {
    return type ? type.replace(/_/g, ' ') : '';
  }

  onApply(): void {
     
   const state: FilterState = {
      selectedAdmin:       this.localAdmin,
      selectedRole:        this.localRole,
      selectedSubAdmin:    this.localSubAdmin,
      selectedRange:       this.localRange,
      selectedRangeLabel:  this.localRangeLabel,
      customRangeStart:    this.localCustomStart,
      customRangeEnd:      this.localCustomEnd,
      selectedModel:       this.localModel,
      selectedActivityType: this.localActivityType,
    };
    this.applied.emit(state);
    this.closed.emit();
  }

  onClear(): void {
    this.cleared.emit();
    this.closed.emit();
  }

  onClose(): void {
    this.closed.emit();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAllDropdowns();
  }
}
