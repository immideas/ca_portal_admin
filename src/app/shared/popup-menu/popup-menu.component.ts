import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { PopupMenuItem } from './popup-menu.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-popup-menu',
  standalone: true, // 👈 FIX — required when 'imports' is used on the component decorator
  imports: [CommonModule],
  templateUrl: './popup-menu.component.html',
  styleUrl: './popup-menu.component.css',
  encapsulation: ViewEncapsulation.None
})
export class PopupMenuComponent {
  @Input() title = '';
  @Input() items: PopupMenuItem[] = [];
  @Input() showAddBtn = false;
  @Input() width = 220;
  @Input() position: { top: number; left: number } | null = null;

  @Output() closeClick = new EventEmitter<void>();
  @Output() addClick = new EventEmitter<void>();
  @Output() itemClick = new EventEmitter<PopupMenuItem>();
  @Output() itemEditClick = new EventEmitter<PopupMenuItem>();
}