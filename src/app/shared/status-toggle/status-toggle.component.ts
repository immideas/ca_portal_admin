import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-status-toggle',
  standalone: true,
  imports: [CommonModule,MatSlideToggleModule ],
  templateUrl: './status-toggle.component.html',
  styleUrls: ['./status-toggle.component.css'],
})
export class StatusToggleComponent {
  @Input() checked = false;
  @Input() disabled = false;
  @Output() toggled = new EventEmitter<boolean>();

  onChange(event: MatSlideToggleChange): void {
    this.toggled.emit(event.checked);
  }
}
