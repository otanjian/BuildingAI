const TENANT_STATUS_LABELS: Record<string, string> = {
  active: "正常",
  suspended: "已停用",
  expired: "已过期",
  pending: "待处理",
  archived: "已归档",
  invited: "已邀请",
  revoked: "已撤销",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  editor: "编辑者",
  member: "成员",
  viewer: "查看者",
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: "正常",
  inactive: "已停用",
  archived: "已归档",
  expired: "已过期",
  suspended: "已暂停",
};

const ACTION_LABELS: Record<string, string> = {
  read: "读取",
  update: "更新",
  execute: "执行",
  export: "导出",
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  agent: "智能体",
  dataset: "知识库",
  project: "项目",
  tenant: "租户",
};

export function translateTenantStatus(status: string | null | undefined): string {
  return (status && TENANT_STATUS_LABELS[status.toLowerCase()]) || "未知";
}

export function translateRole(role: string | null | undefined): string {
  return (role && ROLE_LABELS[role.toLowerCase()]) || "未知角色";
}

export function translateProjectStatus(status: string | null | undefined): string {
  return (status && PROJECT_STATUS_LABELS[status.toLowerCase()]) || "未知";
}

export function translateAction(action: string | null | undefined): string {
  return (action && ACTION_LABELS[action.toLowerCase()]) || "未知操作";
}

export function translateResourceType(resourceType: string | null | undefined): string {
  return (resourceType && RESOURCE_TYPE_LABELS[resourceType.toLowerCase()]) || "资源";
}

export function translateMembershipProject(projectCode?: string | null): string {
  return projectCode ? projectCode : "租户级别";
}
