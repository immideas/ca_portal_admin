import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';


export interface ReportSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  closedTickets: number;
  totalProjects: number;
  totalAdmins: number;
  slaMetPercentage: number;
  slaBreached: number;
  avgCustomerRating: number;
  avgResolutionHours: number;
}

export interface ChartPoint {
  name?: string;
  label?: string;
  month?: string;
  value?: number;
  count?: number;
}

export interface ReportCharts {
  priority:    ChartPoint[];
  status:      ChartPoint[];
  escalation:  ChartPoint[];
  mode:        ChartPoint[];
  monthlyTrend: ChartPoint[];
  ticketAging:  ChartPoint[];
}

export interface AdminPerformanceReport {
  adminId:          number;
  adminName:        string;
  adminEmail:       string;
  totalProjects:    number;
  totalTickets:     number;
  resolvedTickets:  number;
  resolutionRate:   number;
  avgRating:        number;
  avgResolutionHrs: number;
}

export interface ReportData {
  summary:          ReportSummary;
  charts:           ReportCharts;
  adminPerformance: AdminPerformanceReport[];
}

export type RangeType = 'today' | 'last_7_days' | 'last_30_days' | 'custom' | 'all';


@Injectable({ providedIn: 'root' })
export class ReportSuperService {
  private readonly base = `${environment.apiUrl}/super-reports`;
  private readonly api = `${environment.apiUrl}/super-admin`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private buildBody(
    range: RangeType,
    startDate?: string,
    endDate?: string,
    selectedCharts?: string[]
  ): any {
    const body: any = { range_type: range };
    if (range === 'custom' && startDate && endDate) {
      body.startDate = startDate;
      body.endDate   = endDate;
    }
    if (selectedCharts && selectedCharts.length > 0) {
      body.selectedCharts = selectedCharts;
    }
    return body;
  }

  getOverviewSummary(
    range: RangeType = 'all',
    startDate?: string,
    endDate?: string
  ): Observable<ReportData> {
    return this.http
      .post<{ success: boolean; data: ReportData }>(
        `${this.base}/overview-summary`,
        this.buildBody(range, startDate, endDate),
        { headers: this.headers() }
      )
      .pipe(map(r => r.data));
  }

  exportPDF(
    range: RangeType = 'all',
    startDate?: string,
    endDate?: string,
    selectedCharts?: string[]
  ): void {
    this.http
      .post(
        `${this.base}/export-pdf`,
        this.buildBody(range, startDate, endDate, selectedCharts),
        { headers: this.headers(), responseType: 'blob' }
      )
      .subscribe(blob => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `super-admin-report-${Date.now()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      });
  }

 exportExcel(
  range: RangeType = 'all',
  startDate?: string,
  endDate?: string,
  selectedCharts?: string[]
): void {
  this.http
    .post(
      `${this.base}/export-excel`,
      this.buildBody(range, startDate, endDate, selectedCharts),
      { headers: this.headers(), responseType: 'blob' }
    )
    .subscribe(blob => {
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `super-admin-report-${Date.now()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    });
}
}
