import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { TopBarButton } from './page-top-bar.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-top-bar',
    standalone: true,
  imports: [CommonModule],
  templateUrl: './page-top-bar.component.html',
  styleUrls: [

  './page-top-bar.component.scss',


]

})
export class PageTopBarComponent implements OnChanges {
  @Input() showBack = true;  

  @Input() title = '';
  @Input() subtitle = '';
  @Input() buttons: TopBarButton[] = [];
  @Input() titleEditable = false;
  @Input() titlePlaceholder = 'Enter title…';

  @Output() backClick = new EventEmitter<void>();
  @Output() buttonClick = new EventEmitter<string>();
  @Output() titleChange = new EventEmitter<string>();

  @ViewChild('titleInput') titleInputRef?: ElementRef<HTMLInputElement>;

  _isEditingTitle = false;
  _editingValue = '';
  private _prevTitle = '';

  ngOnChanges(changes: SimpleChanges): void {
   
    if (changes['title'] && !this._isEditingTitle) {
      this._editingValue = this.title;
    }
  }

  startTitleEdit(): void {
    if (!this.titleEditable) return;
    this._prevTitle = this.title;
    this._editingValue = this.title;
    this._isEditingTitle = true;
    setTimeout(() => {
      const el = this.titleInputRef?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  }

  onTitleInput(value: string): void {
    this._editingValue = value;
  }

  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const trimmed = this._editingValue.trim();
      if (trimmed) this._prevTitle = trimmed; 
      this._closeTitleEdit();
    } else if (event.key === 'Escape') {
      this._closeTitleEdit(); 
    }
  }

 
  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (!this._isEditingTitle) return;
    const target = event.target as Node;
    if (this.titleInputRef?.nativeElement.contains(target)) return;
    const trimmed = this._editingValue.trim();
    if (trimmed) this._prevTitle = trimmed;
    this._closeTitleEdit();
  }

  private _closeTitleEdit(): void {
    this._isEditingTitle = false;
    this._editingValue = this._prevTitle;
    this.titleChange.emit(this._prevTitle);
  }

  onBack(): void {
    this.backClick.emit();
  }

  onButtonClick(action: string): void {
    console.log('PageTopBar button clicked:', action);
    this.buttonClick.emit(action);
  }
}
