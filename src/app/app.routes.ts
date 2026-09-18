import { Routes } from "@angular/router";

// ================= AUTH / CORE =================
import {
  AuthGuard,
  SuperAdminAuthGuard,
  AdminAuthGuard,
  LoginAuthGuard,
} from "./auth.guard";
import { ForcePasswordChangeGuard } from "./guards/force-password-change.guard";

import { CanDeactivateGuard } from "./can-deactivate.guard";
import { SubAdminPermissionGuard } from "./sub-admin-permission.guard";

import { LayoutComponent } from "./layout/layout.component";
import { LoginComponent } from "./login/login.component";
import { ActiveSessionsComponent } from "./active-sessions/active-sessions.component";
import { ForceChangePasswordComponent } from "./login/force-change-password/force-change-password.component";

// ================= SUPER ADMIN =================
import { DashboardComponent } from "./super-admin/dashboard/dashboard.component";

import { ManageSuperAdminAdminsComponent } from "./super-admin/manage-superadmin-admins/manage-superadmin-admins.component";
import { AddAdminComponent } from "./super-admin/add-admin/add-admin.component";

import { ManageRolesComponent } from "./super-admin/manage-roles/manage-roles.component";
import { AddRolesComponent } from "./super-admin/add-roles/add-roles.component";

import { ManagePermissionsComponent } from "./super-admin/manage-permissions/manage-permissions.component";
import { ManageDefaultPermissionsComponent } from "./super-admin/manage-default-permissions/manage-default-permissions.component";
import { AddPermissionsComponent } from "./super-admin/add-permissions/add-permissions.component";

import { ManageAdminPermissionsComponent } from "./super-admin/manage-admin-permissions/manage-admin-permissions.component";

import { UsersHistoryComponent } from "./super-admin/users-history/users-history.component";
import { LoginDetailsComponent } from "./super-admin/login-details/login-details.component";

import { ActivityDetailsComponent } from "./super-admin/activity-details/activity-details.component";
import { ActivityLineComponent } from "./super-admin/activity-line/activity-line.component";

// ================= ADMIN =================
import { AdminDashboardComponent } from "./admin/admin-dashboard/admin-dashboard.component";

import { AddSubAdminComponent } from "./admin/add-sub-admin/add-sub-admin.component";
import { ManageAdminUsersComponent } from "./admin/manage-admin-users/manage-admin-users.component";

import { ManageSubadminPermissionsComponent } from "./admin/manage-subadmin-permissions/manage-subadmin-permissions.component";

import { ForgotPasswordComponent } from "./admin/forgot-password/forgot-password.component";

import { AddClientGroupComponent } from "./admin/client-group/add-client-group/add-client-group.component";
import { ClientGroupListComponent } from "./admin/client-group/client-group-list/client-group-list.component";

import { AddClientComponent } from "./admin/client/add-client/add-client.component";
import { ClientListComponent } from "./admin/client/client-list/client-list.component";
import { ClientKycComponent } from "./admin/client/client-kyc/client-kyc.component";
import { AddClientServicesComponent } from "./admin/client/add-client-services/add-client-services.component";
// ================= DOCUMENT =================
import { DocumentListComponent } from "./admin/document/document-list/document-list.component";
import { AddDocumentComponent } from "./admin/document/add-document/add-document.component";
// ================= DOCUMENT TYPE =================
import { DocumentTypeListComponent } from "./super-admin/document-type/document-type-list/document-type-list.component";
import { AddDocumentTypeComponent } from "./super-admin/document-type/add-document-type/add-document-type.component";
// ================= SERVICE CATEGORY =================
import { ManageServiceCategoryComponent } from "./super-admin/services/manage-service-category/manage-service-category.component";
import { AddServiceCategoryComponent } from "./super-admin/services/add-service-category/add-service-category.component";
// ================= SERVICE =================
import { ManageServiceComponent } from "./super-admin/services/manage-service/manage-service.component";
import { AddServiceComponent } from "./super-admin/services/add-service/add-service.component";
// ================= CATEGORY =================

import { ManageCategoryComponent } from "./product/category/manage-category/manage-category.component";
import { AddCategoryComponent } from "./product/category/add-category/add-category.component";

// ================= SUB CATEGORY =================
import { ManageSubCategoryComponent } from "./product/sub-category/manage-sub-category/manage-sub-category.component";
import { AddSubCategoryComponent } from "./product/sub-category/add-sub-category/add-sub-category.component";

// ================= PROJECT =================
import { ManageProjectsComponent } from "./product/projects/manage-projects/manage-projects.component";
import { AddProjectsComponent } from "./product/projects/add-projects/add-projects.component";

// ================= EMAIL TEMPLATE =================
import { ManageEmailTemplateComponent } from "./communications/email-template/manage-email-template/manage-email-template.component";
import { AddEmailTemplateComponent } from "./communications/email-template/add-email-template/add-email-template.component";

// ================= CUSTOMER =================
import { ManageCustomerComponent } from "./customer/customer-user/manage-customer/manage-customer.component";
import { AddCustomerComponent } from "./customer/customer-user/add-customer/add-customer.component";
// ================= PLANS =================
import { ManagePlansComponent } from "./plans/manage-plans/manage-plans.component";
import { AddPlansComponent } from "./plans/add-plans/add-plans.component";
import { PlanPaymentHistoryComponent } from "./plans/plan-payment-history/plan-payment-history.component";
import { PlanPaymentComponent } from "./plans/plan-payment/plan-payment.component";
import { PaymentConfirmationComponent } from "./checkout/payment-confirmation/payment-confirmation.component";

// ================= PLANS/LOADING?CHECKOUT_PAGE =================
import { LoadingPageComponent } from "./checkout/loading-page/loading-page.component";
import { CheckoutPageComponent } from "./checkout/checkout-page/checkout-page.component";
import { paymentStatusGuard } from "./payment-status.guard";
import { SubscriptionExpiredComponent } from "./checkout/subscription-expired/subscription-expired.component";

// ================= EVENT TRIGGER =================
import { ManageEventTriggerComponent } from "./communications/events-trigger/manage-event-trigger/manage-event-trigger.component";
import { AddEventTriggerComponent } from "./communications/events-trigger/add-event-trigger/add-event-trigger.component";

// ================= WHATSAPP =================
import { ManageWhatsappTemplateComponent } from "./communications/whatsapp-template/manage-whatsapp-template/manage-whatsapp-template.component";
import { AddWhatsappTemplateComponent } from "./communications/whatsapp-template/add-whatsapp-template/add-whatsapp-template.component";

// ================= SMS MESSAGE TEMPLATE =================
import { ManageSmsTemplateComponent } from "./communications/sms-template/manage-sms-template/manage-sms-template.component";
import { AddSmsTemplateComponent } from "./communications/sms-template/add-sms-template/add-sms-template.component";
import { AddSmtpConfigComponent } from "./super-admin/smtp-config/add-smtp-config/add-smtp-config.component";
import { ManageSmtpConfigComponent } from "./super-admin/smtp-config/manage-smtp-config/manage-smtp-config.component";

import { RequestPasswordResetComponent } from "./login/request-password-reset/request-password-reset.component";
import { PasswordResetRequestsComponent } from "./login/password-reset-requests/password-reset-requests.component";

import { ManageFeaturesComponent } from "./plans/manage-features/manage-features.component";
import { AddFeaturesComponent } from "./plans/add-features/add-features.component";
// ================= THEME CONFIGURATION =================
import { ManageThemesComponent } from "./super-admin/ThemeConfiguration/manage-themes/manage-themes.component";
import { AddThemeComponent } from "./super-admin/ThemeConfiguration/add-theme/add-theme.component";
// ================= CHANGE USER THEME =================
import { ChangeUserThemeComponent } from "./super-admin/ThemeConfiguration/change-user-theme/change-user-theme.component";
export const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [LoginAuthGuard] },
  { path: "password-reset", component: RequestPasswordResetComponent }, // public — no guard
  {
    path: "set-password",
    component: ForceChangePasswordComponent,
    canActivate: [AuthGuard],
  },

  { path: "loading-redirect", component: LoadingPageComponent },
  { path: "checkout", component: CheckoutPageComponent },
  { path: "payment-confirmation", component: PaymentConfirmationComponent },
  { path: "payment-confirmation/:id", component: PaymentConfirmationComponent },
  { path: "subscription-expired", component: SubscriptionExpiredComponent },

  { path: "active-sessions", component: ActiveSessionsComponent },

  {
    path: "",
    component: LayoutComponent,
    canActivateChild: [ForcePasswordChangeGuard],
    children: [
      // =====================================================================
      // SECTION 1 — SUPER ADMIN ONLY (role-gated, no fine-grained permission)
      // =====================================================================
      {
        path: "dashboard",
        component: DashboardComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "manage-admins",
        component: ManageSuperAdminAdminsComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-admin",
        component: AddAdminComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "edit-admin/:id",
        component: AddAdminComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "view-admin/:id",
        component: AddAdminComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "manage-permissions",
        component: ManagePermissionsComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-permission",
        component: AddPermissionsComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-permission/:id",
        component: AddPermissionsComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "manage-admin-permissions",
        component: ManageAdminPermissionsComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "super-reports",
        loadComponent: () =>
          import("./super-admin/reports-dashboard/reports-dashboard.component").then(
            (m) => m.ReportsDashboardComponent,
          ),
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "manage-plans",
        component: ManagePlansComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-plans",
        component: AddPlansComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-plans/:id",
        component: AddPlansComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "manage-features",
        component: ManageFeaturesComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-features",
        component: AddFeaturesComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-features/:id",
        component: AddFeaturesComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "manage-smtp-config",
        component: ManageSmtpConfigComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-smtp-config",
        component: AddSmtpConfigComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-smtp-config/:id",
        component: AddSmtpConfigComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      // ---- Theme Configuration (Super Admin) ----
      {
        path: "manage-themes",
        component: ManageThemesComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-theme",
        component: AddThemeComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "add-theme/:id",
        component: AddThemeComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      {
        path: "change-user-theme/:adminId",
        component: ChangeUserThemeComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      // =====================================================================
      // SECTION 2 — ADMIN GENERAL (logged-in admin/sub-admin entry points,
      // no fine-grained permission check needed — everyone with this role
      // should be able to reach these)
      // =====================================================================
      {
        path: "user-dashboard",
        component: AdminDashboardComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      {
        path: "forgot-password",
        component: ForgotPasswordComponent,
        canActivate: [AdminAuthGuard],
      },

      // FIX: exact single permission — this is conceptually part of role management
      {
        path: "manage-default-permissions",
        component: ManageDefaultPermissionsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "edit_role" },
      },

      // ---- Customer ----
      // NOTE: 'add_customer' and 'view_customer' do NOT exist in the permissions DB
      // (only 'manage_customer' and 'edit_customer' rows exist). Until those are
      // added on the backend, list + create routes must stay on 'manage_customer'.
      {
        path: "manage-customer",
        component: ManageCustomerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_customer" },
      },
      {
        path: "manage-customer/:projectId",
        component: ManageCustomerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_customer" },
      },
      {
        path: "add-customer",
        component: AddCustomerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_customer" },
      },
      {
        path: "add-customer/:id",
        component: AddCustomerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "edit_customer" },
      },

      {
        path: "import-customer",
        loadComponent: () =>
          import("./customer/customer-user/import-customer/import-customer.component").then(
            (m) => m.ImportCustomerComponent,
          ),
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "plan-payment-history",
        component: PlanPaymentHistoryComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      {
        path: "payment-details/:id",
        component: PlanPaymentComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      // =====================================================================
      // SECTION 3 — SUB-ADMIN PERMISSION-GATED
      // Every route now requires exactly ONE specific permission string.
      // Having a parent 'manage_X' permission no longer unlocks add/edit/view
      // sub-routes automatically — each action needs its own explicit grant.
      // =====================================================================
      // ---- Client Group Management ----

      {
        path: "manage-client-groups",
        component: ClientGroupListComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "add-client-group",
        component: AddClientGroupComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "edit-client-group/:id",
        component: AddClientGroupComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "view-client-group/:id",
        component: AddClientGroupComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      // ---- Client Management ----

      {
        path: "clients",
        component: ClientListComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "add-client",
        component: AddClientComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "edit-client/:id",
        component: AddClientComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "view-client/:id",
        component: AddClientComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      {
        path: "client-kyc/:id",
        component: ClientKycComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      {
        path: "add-client-services/:clientId",
        component: AddClientServicesComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },

      {
        path: "view-client-services/:id",
        component: AddClientServicesComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      // ---- User Management ----
      {
        path: "manage-users",
        component: ManageAdminUsersComponent,
        canActivate: [AdminAuthGuard, paymentStatusGuard],
      },
      // ---- Service Category Management (Super Admin Only) ----

      {
        path: "service-categories",
        component: ManageServiceCategoryComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "add-service-category",
        component: AddServiceCategoryComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "edit-service-category/:id",
        component: AddServiceCategoryComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "view-service-category/:id",
        component: AddServiceCategoryComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      // ---- Service Management (Super Admin Only) ----

      {
        path: "services",
        component: ManageServiceComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "add-service",
        component: AddServiceComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "edit-service/:id",
        component: AddServiceComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "view-service/:id",
        component: AddServiceComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      // ---- Document Type Management (Super Admin Only) ----

      {
        path: "document-types",
        component: DocumentTypeListComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "add-document-type",
        component: AddDocumentTypeComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "edit-document-type/:id",
        component: AddDocumentTypeComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "view-document-type/:id",
        component: AddDocumentTypeComponent,
        canActivate: [SuperAdminAuthGuard],
      },
      // ---- Document Management (Super Admin Only) ----

      {
        path: "documents",
        component: DocumentListComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "add-document",
        component: AddDocumentComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "edit-document/:id",
        component: AddDocumentComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "view-document/:id",
        component: AddDocumentComponent,
        canActivate: [SuperAdminAuthGuard],
      },

      {
        path: "add-users",
        component: AddSubAdminComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_sub_admin_users" },
      },

      {
        path: "edit-users/:id",
        component: AddSubAdminComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "edit_sub_admin_users" },
      },

      {
        path: "view-users/:id",
        component: AddSubAdminComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_sub_admin_users" },
      },

      {
        path: "password-reset-requests",
        component: PasswordResetRequestsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_sub_admin_users", allowSuperAdmin: true },
      },

      // ---- Roles ----
      {
        path: "manage-roles",
        component: ManageRolesComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_role" },
      },

      {
        path: "add-roles",
        component: AddRolesComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_role" },
      },

      {
        path: "add-roles/:id",
        component: AddRolesComponent,
        canDeactivate: [CanDeactivateGuard],
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_role" },
      },

      {
        path: "manage-user-permissions",
        component: ManageSubadminPermissionsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_subadmin_permisiions" },
      },

      // ---- Project Management ----
      {
        path: "manage-projects",
        component: ManageProjectsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_project" },
      },
      {
        path: "add-project",
        component: AddProjectsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_project" },
      },
      {
        path: "project-detail/:id",
        component: AddProjectsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_project" },
      },

      // ---- Category ----
      {
        path: "manage-categories",
        component: ManageCategoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_category" },
      },
      {
        path: "add-category",
        component: AddCategoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_category" },
      },
      {
        path: "category-detail/:id",
        component: AddCategoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_category" },
      },

      // ---- Sub Category ----
      {
        path: "manage-sub-category",
        component: ManageSubCategoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_subcategory" },
      },
      {
        path: "add-sub-category",
        component: AddSubCategoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_subcategory" },
      },
      {
        path: "sub-category-detail/:id",
        component: AddSubCategoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_subcategory" },
      },

      // ---- Monitoring (already single-permission, unchanged) ----
      {
        path: "user-sessions",
        component: UsersHistoryComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_user_history", allowSuperAdmin: true },
      },
      {
        path: "login-details/:sessionId",
        component: LoginDetailsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_user_history", allowSuperAdmin: true },
      },
      {
        path: "activity-details",
        component: ActivityDetailsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_activity_details", allowSuperAdmin: true },
      },
      {
        path: "activity-details/:sessionId",
        component: ActivityDetailsComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_activity_details", allowSuperAdmin: true },
      },
      {
        path: "activity-line/:id",
        component: ActivityLineComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_activity_details", allowSuperAdmin: true },
      },

      // ---- Communication ----
      {
        path: "manage-event-trigger",
        component: ManageEventTriggerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_event", allowSuperAdmin: true },
      },
      {
        path: "add-event-trigger",
        component: AddEventTriggerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_event", allowSuperAdmin: true },
      },
      {
        path: "event-trigger-detail/:id",
        component: AddEventTriggerComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_event", allowSuperAdmin: true },
      },

      {
        path: "manage-email-templates",
        component: ManageEmailTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_email_template", allowSuperAdmin: true },
      },
      {
        path: "add-email-template",
        component: AddEmailTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_email_template", allowSuperAdmin: true },
      },
      {
        path: "email-template-detail/:id",
        component: AddEmailTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_email_template", allowSuperAdmin: true },
      },

      {
        path: "manage-sms-templates",
        component: ManageSmsTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_sms", allowSuperAdmin: true },
      },
      {
        path: "add-sms-template",
        component: AddSmsTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_sms", allowSuperAdmin: true },
      },
      {
        path: "sms-template-detail/:id",
        component: AddSmsTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_sms", allowSuperAdmin: true },
      },

      {
        path: "manage-whatsapp-templates",
        component: ManageWhatsappTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_whatsapp_template", allowSuperAdmin: true },
      },
      {
        path: "add-whatsapp-template",
        component: AddWhatsappTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "add_whatsapp_template", allowSuperAdmin: true },
      },
      {
        path: "whatsapp-template-detail/:id",
        component: AddWhatsappTemplateComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "view_whatsapp_template", allowSuperAdmin: true },
      },

      // ---- Theme Configuration (Admin self-service) ----
      {
        path: "choose-theme",
        component: ChangeUserThemeComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_choose_theme" },
      },
      {
        path: "customize-theme",
        component: ChangeUserThemeComponent,
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "manage_customize_theme" },
      },

      // ---- Reports & Analysis (already single-permission, unchanged) ----
      {
        path: "reports",
        loadComponent: () =>
          import("./admin/reports-analysis/reports-analysis.component").then(
            (m) => m.ReportsAnalysisComponent,
          ),
        canActivate: [
          AdminAuthGuard,
          paymentStatusGuard,
          SubAdminPermissionGuard,
        ],
        data: { permission: "dashboard_reports" },
      },
    ],
  },
  { path: "", redirectTo: "/login", pathMatch: "full" },
  { path: "**", redirectTo: "/login" },
];
