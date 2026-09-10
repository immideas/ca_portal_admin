import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MultiHeaderButton { id: string; label: string; variant?: string }

@Component({
  selector: 'app-multi-select-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="multi-select-header" *ngIf="selectedCount > 0">
      <div class="left">{{ selectedCount }} selected</div>
      <div class="right">
        <button *ngFor="let b of buttons" (click)="onClick(b.id)">{{ b.label }}</button>
      </div>
    </div>
  `,
  styles: [`.multi-select-header{display:flex;justify-content:space-between;padding:8px;border-radius:6px;background:#fff}`]
})
export class MultiSelectHeaderComponent {
  @Input() selectedCount = 0;
  @Input() buttons: MultiHeaderButton[] = [];
  @Output() buttonClick = new EventEmitter<string>();

  onClick(id: string) { this.buttonClick.emit(id); }
}
