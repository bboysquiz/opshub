import type { UserRole } from './access';

export type SpaceAccessOperation =
  | 'viewAllSpaces'
  | 'viewMemberSpaces'
  | 'createSpace'
  | 'editSpace'
  | 'deleteSpace'
  | 'manageSpaceMembers'
  | 'createProject'
  | 'editProject'
  | 'deleteProject'
  | 'manageProjectMembers'
  | 'viewProjectTickets';

export type SpaceAccessRolePolicy = {
  label: string;
  operations: readonly SpaceAccessOperation[];
  notes: readonly string[];
};

// `Record` фиксирует контракт для каждой роли: при добавлении новой роли TypeScript потребует явно описать ее поведение.
export const spaceAccessRolePolicies: Record<UserRole, SpaceAccessRolePolicy> = {
  admin: {
    label: 'Администратор',
    operations: [
      'viewAllSpaces',
      'createSpace',
      'editSpace',
      'deleteSpace',
      'manageSpaceMembers',
      'createProject',
      'editProject',
      'deleteProject',
      'manageProjectMembers',
      'viewProjectTickets',
    ],
    notes: ['Видит все пространства и управляет любым пространством без membership-ограничения.'],
  },
  agent: {
    label: 'Агент',
    operations: [
      'viewMemberSpaces',
      'createSpace',
      'editSpace',
      'deleteSpace',
      'manageSpaceMembers',
      'createProject',
      'editProject',
      'deleteProject',
      'manageProjectMembers',
      'viewProjectTickets',
    ],
    notes: ['Управляет только пространствами, участником которых является.'],
  },
  employee: {
    label: 'Сотрудник',
    operations: ['viewMemberSpaces', 'viewProjectTickets'],
    notes: [
      'Не управляет пространствами и проектами; видит только доступные ему проекты и тикеты.',
    ],
  },
};

export const spaceAccessConstraints = [
  {
    id: 'space_contains_projects_and_members',
    title: 'Пространство содержит проекты и участников',
    description:
      'Проект всегда создается внутри конкретного пространства, а участники пространства задают пул пользователей для проектов.',
  },
  {
    id: 'project_members_must_be_space_members',
    title: 'Участник проекта обязан быть участником пространства',
    description:
      'Участника можно добавить в проект только после добавления в родительское пространство.',
  },
  {
    id: 'tickets_must_have_project',
    title: 'Тикет всегда принадлежит проекту',
    description:
      'Создание и редактирование тикета должно сохранять projectId, чтобы доступ к задачам наследовался от проекта.',
  },
] as const;

export type SpaceAccessEmptyState =
  | 'noSpaces'
  | 'noProjects'
  | 'noSpaceMembers'
  | 'noProjectMembers'
  | 'noEligibleProjectMembers';

export type SpaceAccessStateCopy = {
  title: string;
  message: string;
};

// `Record` гарантирует, что будущая вкладка управления получит текст для каждого пустого состояния.
export const spaceAccessEmptyStateCopy: Record<SpaceAccessEmptyState, SpaceAccessStateCopy> = {
  noSpaces: {
    title: 'Пространств пока нет',
    message: 'Создайте первое пространство, чтобы затем добавить проекты и участников.',
  },
  noProjects: {
    title: 'В пространстве нет проектов',
    message: 'Создайте проект внутри пространства, чтобы закреплять за ним тикеты.',
  },
  noSpaceMembers: {
    title: 'В пространстве нет участников',
    message: 'Добавьте сотрудников в пространство перед назначением их на проекты.',
  },
  noProjectMembers: {
    title: 'В проекте нет участников',
    message: 'Добавьте участников проекта из списка пользователей пространства.',
  },
  noEligibleProjectMembers: {
    title: 'Нет доступных участников для проекта',
    message: 'Сначала добавьте пользователя в пространство или выберите другого сотрудника.',
  },
};

export type SpaceAccessErrorState =
  | 'loadSpacesFailed'
  | 'network'
  | 'saveSpaceFailed'
  | 'saveProjectFailed'
  | 'forbidden'
  | 'duplicateProjectName'
  | 'projectMemberOutsideSpace'
  | 'deleteSpaceBlocked'
  | 'deleteProjectBlocked';

// `Record` делает обработку ошибок полной: UI не сможет забыть отдельный backend/product case.
export const spaceAccessErrorStateCopy: Record<SpaceAccessErrorState, SpaceAccessStateCopy> = {
  loadSpacesFailed: {
    title: 'Не удалось загрузить пространства',
    message: 'Повторите загрузку или проверьте подключение к API.',
  },
  network: {
    title: 'Нет соединения с API',
    message: 'Проверьте подключение и повторите действие. Данные на экране не будут сброшены.',
  },
  saveSpaceFailed: {
    title: 'Не удалось сохранить пространство',
    message: 'Проверьте название и попробуйте снова.',
  },
  saveProjectFailed: {
    title: 'Не удалось сохранить проект',
    message: 'Проверьте название проекта и выбранное пространство.',
  },
  forbidden: {
    title: 'Недостаточно прав',
    message: 'У текущей роли нет доступа к управлению этим пространством.',
  },
  duplicateProjectName: {
    title: 'Проект с таким названием уже есть',
    message: 'В одном пространстве названия проектов должны быть уникальными.',
  },
  projectMemberOutsideSpace: {
    title: 'Пользователь не входит в пространство',
    message: 'Перед добавлением в проект пользователь должен быть участником пространства.',
  },
  deleteSpaceBlocked: {
    title: 'Пространство содержит задачи',
    message:
      'Пространство нельзя удалить, пока в его проектах есть задачи. Сначала перенесите или удалите задачи.',
  },
  deleteProjectBlocked: {
    title: 'Проект содержит задачи',
    message:
      'Проект нельзя удалить, пока в нем есть задачи. Сначала перенесите или удалите задачи.',
  },
};

export function canPerformSpaceAccessOperation(
  role: UserRole | null | undefined,
  operation: SpaceAccessOperation,
): boolean {
  if (!role) {
    return false;
  }

  return spaceAccessRolePolicies[role].operations.includes(operation);
}
