import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { ReportService } from '../../services/report.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { saveAs } from 'file-saver';

export interface ExportSection {
  key: string;
  label: string;
  icon: string;
  selected: boolean;
}

@Component({
  selector: 'app-reports-analysis',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterModule, NgxChartsModule],
  templateUrl: './reports-analysis.component.html',
  styleUrl: './reports-analysis.component.css'
})
export class ReportsAnalysisComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();
  private refreshTimer: any;
  private countdownTimer: any;

  selectedTab: 'overview' | 'performance' | 'sla' | 'customer' | 'project' = 'overview';
  isLoading = false;
  lastUpdated: Date | null = null;

  autoRefresh = true;
  refreshSec = 30;
  countdown = 30;
  readonly INTERVALS = [15, 30, 60, 120];

    range_type: 'all' | 'today' | 'last_7_days' | 'last_30_days' | 'custom' = 'all';

  dateFrom = '';
  dateTo = '';
  todayDate: string = new Date().toISOString().split('T')[0];
  selectedProjectId: string | number = '';
  isFiltered = false;
  isFilterPending = false;
  rangeError: string | null = null;
  allProjectsList: { id: any; name: string }[] = [];

  totalTickets = 0;
  pendingTickets = 0;
  inProgressTickets = 0;
  completedTickets = 0;
  reopenedTickets = 0;
  trendData: any[] = [];
  priorityStatusChart: any[] = [];
  modeOfComplaintChart: any[] = [];
  escalationChart: any[] = [];

  userSolvedData: any[] = [];
  userSolvedStackedData: any[] = [];
  selectedUserMetric: 'total' | 'project' = 'total';

  slaPercentage = 0;
  slaBreached = 0;

  avgRating = 0;
  totalRated = 0;
  ratingChart: any[] = [];

  projectChart: any[] = [];
  projectMonthlyChart: any[] = [];

  barScheme: Color = {
    name: 'bar', selectable: true, group: ScaleType.Ordinal,
    domain: ['#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
  };
  stackedScheme: Color = {
    name: 'stacked', selectable: true, group: ScaleType.Ordinal,
    domain: ['#10b981', '#f59e0b', '#7c3aed', '#ef4444', '#06b6d4']
  };
  ratingScheme: Color = {
    name: 'rating', selectable: true, group: ScaleType.Ordinal,
    domain: ['#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444']
  };

  yFmt = (val: number): string => Number.isInteger(val) ? val.toString() : '';
  pctFmt = (val: number): string => `${val}%`;

  showExportModal = false;
  exportType: 'excel' | 'pdf' = 'excel';
  isExporting = false;

  exportSections: ExportSection[] = [
    { key: 'summary',     label: 'Summary Overview',      icon: 'bi-grid-1x2-fill',        selected: true },
    { key: 'performance', label: 'Developer Performance',  icon: 'bi-person-lines-fill',     selected: true },
    { key: 'sla',         label: 'SLA Details',            icon: 'bi-shield-check',          selected: true },
    { key: 'ratings',     label: 'Customer Ratings',       icon: 'bi-star-half',             selected: true },
    { key: 'tickets',     label: 'All Tickets Table',      icon: 'bi-table',                 selected: true },
  ];

  get selectedSectionKeys(): string[] {
    return this.exportSections.filter(s => s.selected).map(s => s.key);
  }

  get allSectionsSelected(): boolean {
    return this.exportSections.every(s => s.selected);
  }

  toggleAllSections(): void {
    const next = !this.allSectionsSelected;
    this.exportSections.forEach(s => s.selected = next);
  }

  openExportModal(type: 'excel' | 'pdf'): void {
    this.exportType = type;
    this.exportSections.forEach(s => s.selected = true);
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  confirmExport(): void {
    const keys = this.selectedSectionKeys;
    if (!keys.length) return;

    this.showExportModal = false;
    const payload = { ...this.getPayload(), selectedSections: keys };

    if (this.exportType === 'excel') {
      this.isExporting = true;
      this.cdr.markForCheck();
      this.reportService.downloadExcelReport(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (blob: Blob) => {
          saveAs(blob, `Report_${new Date().toISOString().split('T')[0]}.xlsx`);
          this.isExporting = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isExporting = false; this.cdr.markForCheck(); }
      });
    } else {
      this.isExporting = true;
      this.cdr.markForCheck();
      this.reportService.downloadPDFReport(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (blob: Blob) => {
          saveAs(blob, `Report_${new Date().toISOString().split('T')[0]}.pdf`);
          this.isExporting = false;
          this.cdr.markForCheck();
        },
        error: () => { this.isExporting = false; this.cdr.markForCheck(); }
      });
    }
  }

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchReport();
    this.startTimers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearTimers();
  }

  private startTimers(): void {
    this.clearTimers();
    this.countdown = this.refreshSec;
    this.countdownTimer = setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
      this.cdr.markForCheck();
    }, 1000);
    if (this.autoRefresh) {
      this.refreshTimer = setInterval(() => {
        this.fetchReport();
        this.countdown = this.refreshSec;
      }, this.refreshSec * 1000);
    }
  }

  private clearTimers(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    if (this.refreshTimer)   clearInterval(this.refreshTimer);
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    this.startTimers();
  }

  setRefreshInterval(sec: number): void {
    this.refreshSec = sec;
    this.startTimers();
  }

  get countdownDash(): number {
    return 87.96 * (1 - (this.countdown / this.refreshSec));
  }

  onRangeTypeChange(): void {
    this.rangeError = null;
    this.isFilterPending = true;
    if (this.range_type !== 'custom') { this.dateFrom = ''; this.dateTo = ''; }
    if (this.range_type !== 'all') this.isFiltered = true;
  }

  onProjectChange(): void {
    this.isFilterPending = true;
    if (this.selectedProjectId) this.isFiltered = true;
  }

  onDateChange(): void {
    this.isFilterPending = true;
    if (this.dateFrom || this.dateTo) this.isFiltered = true;
  }

  applyFilter(): void {
    this.rangeError = null;
    if (this.range_type === 'custom') {
      if (!this.dateFrom || !this.dateTo) {
        this.rangeError = 'Please select both From and To date'; return;
      }
      if (new Date(this.dateFrom) > new Date(this.dateTo)) {
        this.rangeError = 'From date cannot be greater than To date'; return;
      }
    }
    this.isFilterPending = false;
    this.isFiltered = true;
    this.fetchReport();
  }

  clearFilter(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.range_type = 'last_30_days';
    this.selectedProjectId = '';
    this.rangeError = null;
    this.isFilterPending = false;
    this.isFiltered = false;
    this.fetchReport();
  }

  changeTab(tab: any): void { this.selectedTab = tab; }
  onUserMetricChange(m: 'total' | 'project'): void { this.selectedUserMetric = m; }

  fetchReport(): void {
    this.isLoading = true;
    this.lastUpdated = null;
    this.reportService.getDashboard(this.getPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res?.success) { this.mapData(res.data); this.lastUpdated = new Date(); }
          this.cdr.markForCheck();
        },
        error: () => { this.isLoading = false; this.cdr.markForCheck(); }
      });
  }

  private mapData(data: any): void {
    this.totalTickets      = data.totalTickets || 0;
    this.pendingTickets    = data.pendingTickets || 0;
    this.inProgressTickets = data.inProgressTickets || 0;
    this.completedTickets  = data.completedTickets || 0;
    this.reopenedTickets   = data.reopenedTickets || 0;
    this.trendData            = data.trends?.month?.total || [];
    this.priorityStatusChart  = data.priorityStatusChart || [];
    this.modeOfComplaintChart = data.modeOfComplaintChart || [];
    this.escalationChart      = data.escalationChart || [];
    this.slaPercentage = data.slaPercentage || 0;
    this.slaBreached   = data.slaBreached || 0;
    this.avgRating  = data.avgRating || 0;
    this.totalRated = data.totalRated || 0;
    this.ratingChart = [5, 4, 3, 2, 1].map(star => ({
      name: `${star} ★`,
      value: data.ratingChart?.find((r: any) => +r.name === star)?.value || 0
    }));
    this.userSolvedData        = data.userSolvedTrend?.total || [];
    this.userSolvedStackedData = data.userSolvedTrend?.byProject || [];
    this.projectChart        = data.projectChart || [];
    this.projectMonthlyChart = data.projectMonthlyChart || [];
    this.allProjectsList     = data.totalProjectsList || [];
  }

  getPct(val: number): number {
    return this.totalTickets ? Math.round((val / this.totalTickets) * 100) : 0;
  }

  get slaColor(): string {
    if (this.slaPercentage >= 80) return '#10b981';
    if (this.slaPercentage >= 50) return '#f59e0b';
    return '#ef4444';
  }

  getStarIcons(rating: number): string[] {
    return Array.from({ length: 5 }, (_, i) => {
      if (i + 1 <= Math.floor(rating)) return 'bi-star-fill';
      if (i + 1 - rating < 1)          return 'bi-star-half';
      return 'bi-star';
    });
  }

  formatTime(): string {
    return this.lastUpdated
      ? this.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  }

  get totalResolved(): number {
    return this.userSolvedData.reduce((s, d) => s + (d.value || 0), 0);
  }

  get avgTicketsPerUser(): string {
    if (!this.userSolvedData.length) return '0';
    return (this.totalResolved / this.userSolvedData.length).toFixed(1);
  }

  private getPayload(): any {
    const p: any = {
      range_type: this.range_type || 'last_30_days',
      projectId: this.selectedProjectId || null
    };
    if (this.range_type === 'custom') {
      p.startDate = this.dateFrom;
      p.endDate   = this.dateTo;
    }
    return p;
  }

  downloadExcel(): void { this.openExportModal('excel'); }
  downloadPDF(): void   { this.openExportModal('pdf');   }
}
