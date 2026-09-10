import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-three-dots-button',
  templateUrl: './three-dots-button.component.html',
  styleUrls: ['./three-dots-button.component.css'],
  standalone: true,
})
export class ThreeDotsButtonComponent {
  @Input() active = false;
  @Output() menuClick = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.menuClick.emit(event);
  }
}
