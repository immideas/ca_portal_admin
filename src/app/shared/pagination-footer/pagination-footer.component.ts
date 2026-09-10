import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule as NgCommonModule } from '@angular/common';
export interface PageChangeEvent {
  page: number;      
  pageSize: number;
}

@Component({
  selector: 'app-pagination-footer',
  standalone: true, 
  imports: [NgCommonModule], 
  templateUrl: './pagination-footer.component.html',
  styleUrls: ['./pagination-footer.component.css'],
})
export class PaginationFooterComponent implements OnChanges {
  @Input() totalItems = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 1;  
  @Input() itemLabel = 'items';
  @Output() pageChange = new EventEmitter<PageChangeEvent>();

  totalPages = 1;

  ngOnChanges(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
  }

  get showingFrom(): number {
    if (this.totalItems === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get pages(): number[] {
    const total = this.totalPages;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const start = Math.max(1, this.currentPage - 3);
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goTo(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.emit(page);
  }

  goFirst(): void {
    if (this.currentPage !== 1) this.emit(1);
  }

  goPrev(): void {
    if (this.currentPage > 1) this.emit(this.currentPage - 1);
  }

  goNext(): void {
    if (this.currentPage < this.totalPages) this.emit(this.currentPage + 1);
  }

  goLast(): void {
    if (this.currentPage !== this.totalPages) this.emit(this.totalPages);
  }

  private emit(page: number): void {
    this.pageChange.emit({ page, pageSize: this.pageSize });
  }
}
