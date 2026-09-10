import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PublicIpService {
  constructor(private http: HttpClient) {}

  getPublicIp(): Observable<string> {
    return this.http.get('https://api.ipify.org', { responseType: 'text' });
  }

  reverseGeocode(lat: number, lon: number): Observable<string> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    return this.http.get<any>(url).pipe(
      map((res) => {
        if (res.address) {
          const { city, town, village, state, country } = res.address;
          return [city || town || village, state, country].filter(Boolean).join(', ') || res.display_name;
        }
        return res.display_name || 'Unknown location';
      })
    );
  }
}
