import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface DashboardSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  closedTickets: number;
  totalProjects: number;
   activeProjects: number;
  inactiveProjects: number;
  totalAdmins: number;
  slaMetPercentage: number;
  avgCustomerRating: number;
  avgResolutionTime: number;
}

export interface ChartItem {
  name: string;
  value: number;
}

export interface MonthlyTrendItem {
  name: string;
  value: number;
}

export interface AdminPerformanceItem {
  id: number;
  name: string;
  email: string;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
}

export interface SuperAdminDashboardData {
  summary: DashboardSummary;
  priorityChart: ChartItem[];
  statusChart: ChartItem[];
  escalationChart: ChartItem[];
  modeChart: ChartItem[];
  monthlyTrend: MonthlyTrendItem[];
  adminPerformance: AdminPerformanceItem[];
  projectList: { id: number; name: string }[];
}

export interface AdminAcquisitionItem {
  month: string; 
  count: number;
}

export interface UserSessionItem {
  id: number;
  session_created: string;
  session_ended: string | null;
  User: {
    id: number;
    name: string;
    email: string;
    createdBy: number;
    Role: { name: string };
  };
}

export interface UserActivityItem {
  id: number;

  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    createdBy: number | null;
  };

  activityType: string;
  pageVisited: string | null;
  recordCreated: string | null;
  recordId: number | null;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemTicket {
  id: number;
  ticketId: string;
  project: string;
  priority: string;
  status: string;
  assignee: string;
  recorder: string;
  createdAt: string;
}

export interface AdminPerformanceFull {
  adminId: number;
  adminName: string;
  adminEmail: string;
  totalProjects: number;
  totalTickets: number;
  resolvedTickets: number;
  resolutionRate: number;
  avgCustomerRating: number;
  avgResolutionTimeHours: number;
}

export type RangeType = 'today' | 'last_7_days' | 'last_30_days' | 'custom' | 'all';


@Injectable({ providedIn: 'root' })
export class SuperAdminDashboardService {
  private readonly base = `${environment.apiUrl}/super-admin`;

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getDashboard(
    rangeType: RangeType = 'all',
    startDate?: string,
    endDate?: string
  ): Observable<SuperAdminDashboardData> {
    const body: any = { range_type: rangeType };
    if (rangeType === 'custom' && startDate && endDate) {
      body.startDate = startDate;
      body.endDate = endDate;
    }
    return this.http
      .post<{ success: boolean; data: SuperAdminDashboardData }>(
        `${this.base}/dashboard`,
        body,
        { headers: this.headers() }
      )
      .pipe(map((r) => r.data));
  }

  getAdminAcquisition(): Observable<AdminAcquisitionItem[]> {
    return this.http
      .post<{ success: boolean; data: AdminAcquisitionItem[] }>(
        `${this.base}/admin-acquisition`,
        {},
        { headers: this.headers() }
      )
      .pipe(map((r) => r.data));
  }

  getUserSessions(adminId?: number): Observable<UserSessionItem[]> {
    const url = adminId
      ? `${this.base}/user-sessions?adminId=${adminId}`
      : `${this.base}/user-sessions`;
    return this.http
      .post<{ success: boolean; data: UserSessionItem[] }>(
        url,
        {},
        { headers: this.headers() }
      )
      .pipe(map((r) => r.data));
  }


getUserActivity(): Observable<UserActivityItem[]> {
  return this.http
    .post<{
      success: boolean;
      data: UserActivityItem[];
    }>(
      `${this.base}/user-activity`,
      {},
      {
        headers: this.headers(),
      }
    )
    .pipe(
      map((r) => r.data)
    );
}

  getAdminPerformance(): Observable<AdminPerformanceFull[]> {
    return this.http
      .post<{ success: boolean; data: AdminPerformanceFull[] }>(
        `${this.base}/admin-performance`,
        {},
        { headers: this.headers() }
      )
      .pipe(map((r) => r.data));
  }

  getAllTickets(
    page = 1,
    limit = 50,
    filters: { status?: number; priority?: number; projectId?: number } = {}
  ): Observable<{ data: SystemTicket[]; pagination: any }> {
    return this.http.post<any>(
      `${this.base}/all-tickets`,
      { page, limit, ...filters },
      { headers: this.headers() }
    );
  }

  loadAll(
    rangeType: RangeType = 'all',
    startDate?: string,
    endDate?: string
  ): Observable<{
    dashboard: SuperAdminDashboardData;
    acquisition: AdminAcquisitionItem[];
  }> {
    return forkJoin({
      dashboard: this.getDashboard(rangeType, startDate, endDate),
      acquisition: this.getAdminAcquisition(),
    });
  }
}
