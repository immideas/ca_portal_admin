import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DocumentRequestService {
  private base = `${environment.apiUrl}/document-requests`;

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  constructor(private http: HttpClient) {}

  create(payload: any): Observable<any> {
    return this.http.post(
      `${this.base}/create`,
      payload,
      { headers: this.getHeaders() }
    );
  }
   update(payload: any): Observable<any> {
    return this.http.post(
      `${this.base}/update`,
      payload,
      {
        headers: this.getHeaders()
      }
    );
  }

  list(payload: any = {}): Observable<any> {
    return this.http.post(
      `${this.base}/list`,
      payload,
      { headers: this.getHeaders() }
    );
  }

  getById(id: number | string): Observable<any> {
    return this.http.post(
      `${this.base}/get`,
      { id },
      { headers: this.getHeaders() }
    );
  }
   getSubmittedDocuments(
    documentRequestId: number | string
  ): Observable<any> {
    return this.http.post(
      `${this.base}/submitted-documents`,
      { documentRequestId },
      { headers: this.getHeaders() }
    );
  }
  getSubmittedDocumentsByService(
  serviceId: number | string
): Observable<any> {
  return this.http.post(
    `${this.base}/submitted-documents-by-service`,
    { serviceId },
    { headers: this.getHeaders() }
  );
}
// =====================================================
// COMPLETE SERVICE REQUEST
// =====================================================

completeServiceRequest(payload: any): Observable<any> {
  return this.http.post(
    `${this.base}/complete`,
    payload,
    {
      headers: this.getHeaders()
    }
  );
}
// =====================================================
// GENERATE INVOICE
// =====================================================

generateInvoice(
  documentRequestId: number | string
): Observable<any> {
  return this.http.post(
    `${this.base}/generate-invoice`,
    { documentRequestId },
    {
      headers: this.getHeaders()
    }
  );
}
    // =====================================================
  // APPROVE SUBMITTED DOCUMENT
  // =====================================================

  approveSubmittedDocument(
    documentId: number | string
  ): Observable<any> {
    return this.http.post(
      `${this.base}/submitted-document/approve`,
      { documentId },
      {
        headers: this.getHeaders()
      }
    );
  }

  // =====================================================
  // REJECT SUBMITTED DOCUMENT
  // =====================================================

  rejectSubmittedDocument(
    documentId: number | string,
    rejectionReason: string
  ): Observable<any> {
    return this.http.post(
      `${this.base}/submitted-document/reject`,
      {
        documentId,
        rejectionReason
      },
      {
        headers: this.getHeaders()
      }
    );
  }
  getAllServiceRequestPayments(): Observable<any> {
  return this.http.post(
    `${this.base}/payments`,
    {},
    {
      headers: this.getHeaders()
    }
  );
}
}