import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlanAccessService {

  private get plan(): any {
    try {
      const p = localStorage.getItem('plan');
      return p ? JSON.parse(p) : null;
    } catch {
      return null;
    }
  }

  // 👇 NAYA — features ab yahan se padhenge, top-level se nahi
  private get features(): Record<string, any> {
    return this.plan?.features ?? {};
  }

  get planName():    string  { return this.plan?.plan_name    ?? 'No Plan'; }
  get planPrice():   number  { return this.plan?.plan_price   ?? 0; }
  get isTrialPlan(): boolean { return this.plan?.is_trial     ?? false; }
  get trialDays():   number  { return this.plan?.trial_days   ?? 0; }
  get billingCycle():string  { return this.plan?.billing_cycle ?? ''; }

  get maxUsers():     number | null { return this.getLimit('users'); }
  get maxCustomers(): number | null { return this.getLimit('customers'); }
  get maxProjects():  number | null { return this.getLimit('projects'); }
  get maxTickets():   number | null { return this.getLimit('tickets'); }

  // 👇 FIX — this.plan?.xxx ki jagah this.features?.xxx
  get hasOpenTickets():  boolean { return this.features['open_tickets']           ?? true;  }
  get hasReports():      boolean { return this.features['reports_analytics']      ?? false; }
  get hasSessionTrack(): boolean { return this.features['session_activities']     ?? false; }
  get hasEmailComm():    boolean { return this.features['email_communication']    ?? false; }
  get hasSmsComm():      boolean { return this.features['sms_communication']      ?? false; }
  get hasWhatsApp():     boolean { return this.features['whatsapp_communication'] ?? false; }
  get hasPortal():       boolean { return this.features['customer_portal']        ?? false; }
  get hasE2E():          boolean { return this.features['e2e_encryption']         ?? false; }

  get hasPlan(): boolean { return !!this.plan; }

  // 👇 FIX — feature_code naming se map karo, legacy column se nahi
  private limitFor(type: 'projects' | 'users' | 'customers' | 'tickets'): number | null {
    const featureCodeMap = {
      projects:  'no_of_projects',        // ⚠️ apni actual Feature.feature_code se confirm karo
      users:     'no_of_users',       // ⚠️ jo hum pehle discuss kar chuke hain
      customers: 'no_of_customers',  // ⚠️ jo hum pehle discuss kar chuke hain
      tickets:   'tickets_per_month',
    } as const;

    const raw = this.features[featureCodeMap[type]];
    if (raw === null || raw === undefined) return null;
    if (raw === -1) return null; // unlimited (backend -1 bhejta hai unlimited ke liye)
    return Number(raw);
  }

  getLimit(type: 'projects' | 'users' | 'customers' | 'tickets'): number | null {
    if (!this.plan) return null;
    return this.limitFor(type);
  }

  canCreateMore(type: 'projects' | 'users' | 'customers' | 'tickets', currentCount: number): boolean {
    const limit = this.getLimit(type);
    if (limit === null) return true;
    return currentCount < limit;
  }
}
