import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PlansService {
  private base = `${environment.apiUrl}/plans`;
private getHeaders(): HttpHeaders {
  const token = localStorage.getItem('token');
  return new HttpHeaders().set('Authorization', `Bearer ${token}`);
}
  constructor(private http: HttpClient) {}

  create(payload: any): Observable<any> {
    return this.http.post(`${this.base}/create`, payload,{ headers: this.getHeaders() });
  }

  list(payload: { search?: string; page?: number; limit?: number; status?: string }): Observable<any> {
    return this.http.post(`${this.base}/list`, payload,{ headers: this.getHeaders() });
  }

  getById(id:number | string): Observable<any> {
    return this.http.post(`${this.base}/${id}`, {},{ headers: this.getHeaders() });
  }

  update(payload: any): Observable<any> {
    return this.http.post(`${this.base}/update`, payload,{ headers: this.getHeaders() });
  }

  delete(id: string): Observable<any> {
    return this.http.post(`${this.base}/delete`, { id },{ headers: this.getHeaders() });
  }
  getPaidPlans(payload: any = {}): Observable<any> {
  return this.http.post(`${this.base}/paid-plans`, payload, { headers: this.getHeaders() });
}

getTrialPlan(): Observable<any> {
  return this.http.post(`${this.base}/trial-plan`, {}, { headers: this.getHeaders() });
}
listUniquePlanGroups(): Observable<any>{
  return this.http.post(`${this.base}/unique-plangroups`, {}, { headers: this.getHeaders() });

}
}
