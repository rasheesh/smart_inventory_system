import { UserRole } from './types'

export interface PagePermissions {
  dashboard: boolean
  inventory: boolean
  stockOperations: boolean
  branches: boolean
  notifications: boolean
  reports: boolean
  userManagement: boolean
  auditLogs: boolean
}

export interface FeaturePermissions {
  canTransferStock: boolean
  canViewReportPreview: boolean
  canAccessAllBranches: boolean
  canViewAllUsers: boolean
  canModifyOtherBranches: boolean
}

export const getPagePermissions = (role: UserRole): PagePermissions => {
  const permissions: Record<UserRole, PagePermissions> = {
    admin: {
      dashboard: true,
      inventory: true,
      stockOperations: true,
      branches: true,
      notifications: true,
      reports: true,
      userManagement: true,
      auditLogs: true,
    },
    'branch-manager': {
      dashboard: true,
      inventory: true,
      stockOperations: true,
      branches: false,
      notifications: true,
      reports: true,
      userManagement: false,
      auditLogs: false,
    },
    staff: {
      dashboard: true,
      inventory: true,
      stockOperations: true,
      branches: false,
      notifications: true,
      reports: false,
      userManagement: false,
      auditLogs: false,
    },
  }

  return permissions[role]
}

export const getFeaturePermissions = (role: UserRole): FeaturePermissions => {
  const permissions: Record<UserRole, FeaturePermissions> = {
    admin: {
      canTransferStock: true,
      canViewReportPreview: true,
      canAccessAllBranches: true,
      canViewAllUsers: true,
      canModifyOtherBranches: true,
    },
    'branch-manager': {
      canTransferStock: true,
      canViewReportPreview: false,
      canAccessAllBranches: false,
      canViewAllUsers: false,
      canModifyOtherBranches: false,
    },
    staff: {
      canTransferStock: false,
      canViewReportPreview: false,
      canAccessAllBranches: false,
      canViewAllUsers: false,
      canModifyOtherBranches: false,
    },
  }

  return permissions[role]
}

export const canAccessPage = (role: UserRole, page: keyof PagePermissions): boolean => {
  return getPagePermissions(role)[page]
}

export const canTransferStock = (role: UserRole): boolean => {
  return getFeaturePermissions(role).canTransferStock
}

export const canViewReportPreview = (role: UserRole): boolean => {
  return getFeaturePermissions(role).canViewReportPreview
}

export const canAccessAllBranches = (role: UserRole): boolean => {
  return getFeaturePermissions(role).canAccessAllBranches
}
