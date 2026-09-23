export type SidebarTheme = 'light' | 'dark' | 'high-contrast';

export interface SidebarNavChild {
  label: string;
  icon: string;
  route: string;
  permission?: string;
  activeRoutes?: string[];

}

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  permission?: string;
  alwaysVisible?: boolean;
  isLogout?: boolean;
  exactMatch?: boolean;
  activeRoutes?: string[];
  children?: SidebarNavChild[];

}

export interface SidebarNavSection {
  label?: string;
  items: SidebarNavItem[];
}

export const SUPER_ADMIN_NAV: SidebarNavSection[] = [
  {
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        route: '/dashboard',
        alwaysVisible: true,
        exactMatch: true,
      },
    ],
  },

  {
    items: [
      {
        id: 'user-management',
        label: 'User Management',
        icon: 'bi-people',
        children: [
          {
            label: 'Manage Admin Users',
            icon: '',
            route: '/manage-admins',
          },
          {
            label: 'Manage Features',
            icon: '',
            route:'/manage-features',
          },
          {
            label: 'Manage Plans',
            icon: '',
            route:'/manage-plans',
          }
        ]
      }
    ]
  },
{
  items: [
    {
      id: 'document-management',
      label: 'Document Management',
      icon: 'bi-file-earmark-text',
      children: [
        {
          label: 'Manage Document Types',
          icon: '',
          route: '/document-types',
          activeRoutes: [
            '/document-types',
            '/add-document-type',
            '/edit-document-type',
            '/view-document-type'
          ]
        },
        {
          label: 'Manage Document Groups',
          icon: '',
          route: '/document-groups',
          activeRoutes: [
            '/document-groups',
            '/add-document-group',
            '/edit-document-group',
            '/view-document-group'
          ]
        },
        {
          label: 'Manage Documents',
          icon: '',
          route: '/documents',
          activeRoutes: [
            '/documents',
            '/add-document',
            '/edit-document',
            '/view-document'
          ]
        }
      ]
    }
  ]
},
// ================= SERVICE MANAGEMENT =================
// ================= SERVICE MANAGEMENT =================
{
  items: [
    {
      id: 'service-management',
      label: 'Service Management',
      icon: 'bi-briefcase',
      children: [
        {
          label: 'Manage Service Categories',
          icon: '',
          route: '/service-categories',
          activeRoutes: [
            '/service-categories',
            '/add-service-category',
            '/edit-service-category',
            '/view-service-category'
          ]
        },
        {
          label: 'Manage Services',
          icon: '',
          route: '/services',
          activeRoutes: [
            '/services',
            '/add-service',
            '/edit-service',
            '/view-service'
          ]
        }
      ]
    }
  ]
},
 {
    items: [
      {
        id: 'Configurations',
        label: 'Configurations',
        icon: 'bi-diagram-3',
        children: [
          {
            label: 'Manage SMTP Config',
            icon: '',
            route: '/manage-smtp-config',
          },
          {
            label: 'Manage Themes',
            icon: '',
            route: '/manage-themes',

          },

        ]
      }
    ]
  },

{
  items: [
    {
 id: 'communication',
        label: 'Communication',
        icon: 'bi-envelope',
      children: [
        {
          label: 'Events Communication',
          icon: '',
          route: '/manage-event-trigger',
          activeRoutes: ['/manage-event-trigger']
        },
        {
            label: 'Email Template',
            icon: '',
            route: '/manage-email-templates',
           activeRoutes: ['/manage-email-templates']

          },
           {
            label: 'WhatsApp Template',
            icon: '',
            route: '/manage-whatsapp-templates',
           activeRoutes:['/manage-whatsapp-templates']

          },
           {
            label: 'SMS Template',
            icon: '',
            route: '/manage-sms-templates',
           activeRoutes:['/manage-sms-templates']

          }
      ]
    }
  ]
},
  {
    items: [
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: 'bi-clock-history',
        children: [
          {
            label: 'User Session History',
            icon: '',
            route: '/user-sessions',
          },
          {
            label: 'User Activity History',
            icon: '',
            route: '/activity-details',
          }
        ]
      }
    ]
  },
{
  items: [
    {
      id: 'reports-analysis',
      label: 'Reports & Analysis',
      icon: 'bi-bar-chart-line',

      children: [
        {
          label: 'Dashboard Reports',
          icon: '',
          route: '/super-reports',
          activeRoutes: [
            '/super-reports'
          ]
        },
      ]
    }
  ]
},
  {
    items: [
      {
        id: 'security',
        label: 'Security',
        icon: 'bi-shield-lock',
        children: [
          {
            label: 'Manage Permissions',
            icon: '',
            route: '/manage-permissions',
          },
           {
          label: 'Password Reset Requests',
          icon: '',
          route: '/password-reset-requests',
        }
        ]
      }
    ]
  },

  {
    label: 'Account',
    items: [
      {
        id: 'change-password',
        label: 'Change Password',
        icon: 'bi-lock',
        route: '/change-password',
        alwaysVisible: true,
      },
      {
        id: 'logout',
        label: 'Logout',
        icon: 'bi-box-arrow-right',
        isLogout: true,
      },
    ],
  },
];
export const DEFAULT_SUB_ADMIN_NAV: SidebarNavSection[] = [
  {
    items: [
      {
        id: 'user-dashboard',
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        route: '/user-dashboard',
        alwaysVisible: true,
        exactMatch: true,
      },
    ],
  },
 
  {
    items: [
      {
        id: 'Team-management',
        label: 'Team Management',
        icon: 'bi-people',
        children: [
          {
            label: 'Manage user',
            icon: '',
            route: '/manage-users',
            permission: 'manage_sub_admin_users'
          },
          {
            label: 'Manage Roles',
            icon: '',
            route: '/manage-roles',
            permission: 'manage_role'
          },
          {
          label: 'Password Reset Requests',
          icon: '',
          route: '/password-reset-requests',
          permission: 'manage_sub_admin_users'
        }
        ]
      }
    ]
  },
{
  items: [
    {
      id: 'client-management',
      label: 'Client Management',
      icon: 'bi-person-vcard',
      children: [
        {
          label: 'Manage Client Groups',
          icon: '',
          route: '/manage-client-groups',
          permission: 'client_group_list',
          activeRoutes: [
            '/manage-client-groups',
            '/add-client-group',
            '/edit-client-group',
            '/view-client-group'
          ]
        },
        {
          label: 'Manage Clients',
          icon: '',
          route: '/clients',
          permission: 'client_list',
          activeRoutes: [
            '/clients',
            '/add-client',
            '/edit-client',
            '/view-client'
          ]
        }
      ]
    }
  ]
},
  // {
  //   items: [
  //     {
  //       id: 'product',
  //       label: 'Product',
  //       icon: 'bi-kanban',
  //       children: [
  //         {
  //           label: 'Manage Project',
  //           icon: '',
  //           route: '/manage-projects',
  //           permission: 'manage_project'
  //         },
  //         {
  //           label: 'Manage Categories',
  //           icon: '',
  //           route: '/manage-categories',
  //           permission: 'manage_categories'
  //         },
  //         {
  //           label: 'Manage Sub Category',
  //           icon: '',
  //           route: '/manage-sub-category',
  //           permission: 'manage_subcategory'
  //         }
  //       ]
  //     }
  //   ]
  // },

  // ================= DOCUMENT MANAGEMENT =================

// {
//   items: [
//     {
//       id: 'document-management',
//       label: 'Document Management',
//       icon: 'bi-file-earmark-text',
//       children: [
//         {
//           label: 'Manage Documents',
//           icon: '',
//           route: '/documents',
//           permission: 'manage_documents',
//           activeRoutes: [
//             '/documents',
//             '/add-document',
//             '/edit-document',
//             '/view-document'
//           ]
//         }
//       ]
//     }
//   ]
// },
// ================= DOCUMENT REQUEST MANAGEMENT =================

// ================= SERVICE REQUEST MANAGEMENT =================

{
  items: [
    {
      id: 'service-request-management',
      label: 'Service Request Management',
      icon: 'bi-file-earmark-text',
      children: [
        {
          label: 'Manage Service Requests',
          icon: '',
          route: '/service-requests',
          permission: 'manage_document_requests',
          activeRoutes: [
            '/service-requests',
            '/service-request',
            '/edit-service-request',
            '/view-service-request'
          ]
        }
      ]
    }
  ]
},

  {
    items: [
      {
        id: 'monitoring',
        label: 'Monitoring',
        icon: 'bi-clock-history',
        children: [
          {
            label: 'User Session History',
            icon: '',
            route: '/user-sessions',
            permission: 'manage_user_history',

          },
          {
            label: 'User Activity History',
            icon: '',
            route: '/activity-details',
            permission: 'manage_activity_details',

          }
        ]
      }
    ]
  },

  {
    items: [
      {
        id: 'communication',
        label: 'Communication',
        icon: 'bi-envelope',
        children: [
          {
          label: 'Events Communication',
          icon: '',
          route: '/manage-event-trigger',
          permission: 'manage_events',
          activeRoutes: ['/manage-event-trigger']
        },
          {
            label: 'Email Template',
            icon: '',
            route: '/manage-email-templates',
            permission: 'manage_email_template',
              activeRoutes: ['/manage-email-templates']

          },
          {
            label: 'WhatsApp Template',
            icon: '',
            route: '/manage-whatsapp-templates',
            permission: 'manage_whatsapp_template',
              activeRoutes: ['/manage-whatsapp-templates']

          },
          {
            label: 'SMS Template',
            icon: '',
            route: '/manage-sms-templates',
            permission: 'manage_sms_template',
              activeRoutes: ['/manage-sms-templates']

          }
        ]
      }
    ]
  },
   {
    items: [
      {
        id: 'theme-configuration',
        label: 'Theme Configuration',
        icon: 'bi-palette',
        children: [
          {
label: 'Choose Themes',
icon: '',
route: '/choose-theme',
permission: 'manage_choose_theme'
          },
          {
            label: 'Customize Theme',
            icon: '',
            route: '/customize-theme',
            permission: 'manage_customize_theme'
          },
        ]
      }
    ]
  },
{
  items: [
    {
      id: 'reports-analysis',
      label: 'Reports & Analysis',
      icon: 'bi-bar-chart-line',

      children: [
        {
          label: 'Dashboard Reports',
          icon: '',
          route: '/reports',
             permission: 'dashboard_reports',

          activeRoutes: [
            '/reports'
          ]
        },

      ]
    }
  ]
},
  {
    label: 'Account',
    items: [
      {
        id: 'change-password',
        label: 'Change Password',
        icon: 'bi-lock',
        route: '/password-reset',
        alwaysVisible: true,
      },
      {
        id: 'logout',
        label: 'Logout',
        icon: 'bi-box-arrow-right',
        isLogout: true,
      },
    ],
  },
];
