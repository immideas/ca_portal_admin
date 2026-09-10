import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css'
})
export class PageHeaderComponent {



  @Input() title = '';
  @Input() subtitle = '';

  @Input() showFilter = false;
  @Input() filterActive = false;
  @Output() filterToggle = new EventEmitter<void>();

  @Input() showReset = false;
  @Output() resetClick = new EventEmitter<void>();
}
