<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useSpacesStore } from '~/stores/spaces';
import { roleLabels, type UserRole } from '~/utils/access';
import { spaceAccessEmptyStateCopy, spaceAccessErrorStateCopy } from '~/utils/spacesAccess';

type UserOptionLike = {
  id: string;
  email: string;
  role: UserRole;
};

type UserSelectOption = {
  label: string;
  value: string;
  caption: string;
};

const spacesStore = useSpacesStore();
const { spaces, userOptions, userOptionsBySpace, loading, saving, optionsLoading, error } =
  storeToRefs(spacesStore);

const selectedSpaceId = ref('');
const selectedProjectId = ref('');
const selectedSpaceUserId = ref<string | null>(null);
const selectedProjectUserId = ref<string | null>(null);
const initializing = ref(true);
const validationError = ref<string | null>(null);
const spaceNameError = ref<string | null>(null);
const projectNameError = ref<string | null>(null);
const spaceMemberError = ref<string | null>(null);
const projectMemberError = ref<string | null>(null);

const spaceForm = reactive({
  name: '',
  description: '',
});

const projectForm = reactive({
  name: '',
  description: '',
});

const selectedSpace = computed(
  () => spaces.value.find((space) => space.id === selectedSpaceId.value) ?? null,
);

const selectedSpaceProjects = computed(() => selectedSpace.value?.projects ?? []);

const selectedProject = computed(
  () =>
    selectedSpaceProjects.value.find((project) => project.id === selectedProjectId.value) ?? null,
);

const selectedSpaceMembers = computed(() => selectedSpace.value?.members ?? []);
const selectedProjectMembers = computed(() => selectedProject.value?.members ?? []);

const selectedSpaceMemberIds = computed(
  () => new Set(selectedSpaceMembers.value.map((member) => member.id)),
);

const selectedProjectMemberIds = computed(
  () => new Set(selectedProjectMembers.value.map((member) => member.id)),
);

const noSpacesCopy = spaceAccessEmptyStateCopy.noSpaces;
const noProjectsCopy = spaceAccessEmptyStateCopy.noProjects;
const noSpaceMembersCopy = spaceAccessEmptyStateCopy.noSpaceMembers;
const noProjectMembersCopy = spaceAccessEmptyStateCopy.noProjectMembers;
const noEligibleProjectMembersCopy = spaceAccessEmptyStateCopy.noEligibleProjectMembers;
const projectMemberOutsideSpaceCopy = spaceAccessErrorStateCopy.projectMemberOutsideSpace;
const duplicateProjectNameCopy = spaceAccessErrorStateCopy.duplicateProjectName;
const networkErrorCopy = spaceAccessErrorStateCopy.network;

const pageError = computed(() => validationError.value ?? error.value);
const isProjectMemberOutsideSpaceError = computed(
  () => pageError.value === projectMemberOutsideSpaceCopy.message,
);
const isDuplicateProjectNameError = computed(
  () => pageError.value === duplicateProjectNameCopy.message,
);
const isNetworkError = computed(() => pageError.value === networkErrorCopy.message);
const showNoSpacesEmpty = computed(
  () => !spaces.value.length && !initializing.value && !loading.value && !error.value,
);
const showInitialLoadError = computed(
  () => !spaces.value.length && !initializing.value && Boolean(error.value),
);
const projectNameErrorText = computed(() =>
  isDuplicateProjectNameError.value ? duplicateProjectNameCopy.message : projectNameError.value,
);

const canCreateSpace = computed(
  () => spaceForm.name.trim().length > 0 && !saving.value && !loading.value,
);

const canCreateProject = computed(
  () =>
    Boolean(selectedSpace.value) &&
    projectForm.name.trim().length > 0 &&
    !saving.value &&
    !loading.value,
);

const spaceCandidateOptions = computed(() =>
  userOptions.value
    .filter((user) => !selectedSpaceMemberIds.value.has(user.id))
    .map(toUserSelectOption),
);

const projectScopedUsers = computed<UserOptionLike[]>(() => {
  if (!selectedSpaceId.value) {
    return [];
  }

  return userOptionsBySpace.value[selectedSpaceId.value] ?? selectedSpaceMembers.value;
});

const projectCandidateOptions = computed(() =>
  projectScopedUsers.value
    .filter((user) => !selectedProjectMemberIds.value.has(user.id))
    .map(toUserSelectOption),
);

const canAddProjectMember = computed(
  () =>
    Boolean(selectedProject.value) &&
    Boolean(selectedProjectUserId.value) &&
    projectCandidateOptions.value.some((option) => option.value === selectedProjectUserId.value) &&
    !saving.value &&
    !loading.value &&
    !optionsLoading.value,
);

function toUserSelectOption(user: UserOptionLike): UserSelectOption {
  return {
    label: user.email,
    value: user.id,
    caption: roleLabels[user.role],
  };
}

function clearFieldErrors() {
  spaceNameError.value = null;
  projectNameError.value = null;
  spaceMemberError.value = null;
  projectMemberError.value = null;
}

function clearValidationState() {
  validationError.value = null;
  clearFieldErrors();
}

function showValidationError(
  message: string,
  field?: 'spaceName' | 'projectName' | 'spaceMember' | 'projectMember',
) {
  spacesStore.clearError();
  validationError.value = message;

  if (field === 'spaceName') {
    spaceNameError.value = message;
  } else if (field === 'projectName') {
    projectNameError.value = message;
  } else if (field === 'spaceMember') {
    spaceMemberError.value = message;
  } else if (field === 'projectMember') {
    projectMemberError.value = message;
  }
}

function clearPageError() {
  clearValidationState();
  spacesStore.clearError();
}

function selectSpace(spaceId: string) {
  selectedSpaceId.value = spaceId;
}

function selectProject(projectId: string) {
  selectedProjectId.value = projectId;
}

function ensureSelectedProject() {
  if (selectedSpaceProjects.value.some((project) => project.id === selectedProjectId.value)) {
    return;
  }

  selectedProjectId.value = selectedSpaceProjects.value[0]?.id ?? '';
}

async function refreshSpaceUserOptions(spaceId: string) {
  try {
    await spacesStore.loadUserOptionsBySpace(spaceId);
  } catch {
    // Store keeps the normalized error for the page banner.
  }
}

async function refreshAfterSave(spaceId: string, projectId?: string) {
  const latestSpaces = await spacesStore.loadSpaces();
  const nextSpace = latestSpaces.find((space) => space.id === spaceId) ?? latestSpaces[0] ?? null;

  selectedSpaceId.value = nextSpace?.id ?? '';
  selectedProjectId.value =
    nextSpace?.projects.find((project) => project.id === projectId)?.id ??
    nextSpace?.projects[0]?.id ??
    '';

  if (nextSpace) {
    await refreshSpaceUserOptions(nextSpace.id);
  }
}

async function initializePage() {
  if (loading.value || optionsLoading.value) {
    return;
  }

  initializing.value = true;
  clearValidationState();

  try {
    const [loadedSpaces] = await Promise.all([
      spacesStore.loadSpaces(),
      spacesStore.loadUserOptions(),
    ]);
    selectedSpaceId.value = loadedSpaces[0]?.id ?? '';
  } catch {
    // Store keeps the normalized error for the page banner.
  } finally {
    initializing.value = false;
  }
}

async function createSpace() {
  if (saving.value || loading.value) {
    return;
  }

  const name = spaceForm.name.trim();
  if (!name) {
    showValidationError('Укажите название пространства.', 'spaceName');
    return;
  }

  clearPageError();

  try {
    const space = await spacesStore.createSpace({
      name,
      description: spaceForm.description.trim(),
    });
    spaceForm.name = '';
    spaceForm.description = '';
    await refreshAfterSave(space.id, space.projects[0]?.id);
  } catch {
    // Store keeps the normalized error for the page banner.
  }
}

async function createProject() {
  if (saving.value || loading.value) {
    return;
  }

  const name = projectForm.name.trim();
  if (!selectedSpace.value) {
    showValidationError('Выберите пространство для проекта.', 'projectName');
    return;
  }

  if (!name) {
    showValidationError('Укажите название проекта.', 'projectName');
    return;
  }

  clearPageError();
  const spaceId = selectedSpace.value.id;

  try {
    const project = await spacesStore.createProject(spaceId, {
      name,
      description: projectForm.description.trim(),
    });
    projectForm.name = '';
    projectForm.description = '';
    await refreshAfterSave(spaceId, project.id);
  } catch {
    if (error.value === duplicateProjectNameCopy.message) {
      projectNameError.value = duplicateProjectNameCopy.message;
    }

    // Store keeps the normalized error for the page banner.
  }
}

async function addSpaceMember() {
  if (saving.value || loading.value) {
    return;
  }

  if (!selectedSpace.value || !selectedSpaceUserId.value) {
    showValidationError('Выберите сотрудника для добавления в пространство.', 'spaceMember');
    return;
  }

  clearPageError();
  const spaceId = selectedSpace.value.id;
  const projectId = selectedProject.value?.id;

  try {
    await spacesStore.addSpaceMember(spaceId, selectedSpaceUserId.value);
    selectedSpaceUserId.value = null;
    await refreshAfterSave(spaceId, projectId);
  } catch {
    // Store keeps the normalized error for the page banner.
  }
}

async function removeSpaceMember(userId: string) {
  if (saving.value || loading.value) {
    return;
  }

  if (!selectedSpace.value) {
    return;
  }

  clearPageError();
  const spaceId = selectedSpace.value.id;
  const projectId = selectedProject.value?.id;

  try {
    await spacesStore.removeSpaceMember(spaceId, userId);
    selectedProjectUserId.value = null;
    await refreshAfterSave(spaceId, projectId);
  } catch {
    // Store keeps the normalized error for the page banner.
  }
}

async function addProjectMember() {
  if (saving.value || loading.value) {
    return;
  }

  if (!selectedSpace.value || !selectedProject.value || !selectedProjectUserId.value) {
    showValidationError('Выберите сотрудника из участников пространства.', 'projectMember');
    return;
  }

  if (
    !projectCandidateOptions.value.some((option) => option.value === selectedProjectUserId.value)
  ) {
    selectedProjectUserId.value = null;
    showValidationError('Выберите актуального участника выбранного пространства.', 'projectMember');
    return;
  }

  clearPageError();
  const spaceId = selectedSpace.value.id;
  const projectId = selectedProject.value.id;

  try {
    await spacesStore.addProjectMember(spaceId, projectId, selectedProjectUserId.value);
    selectedProjectUserId.value = null;
    await refreshAfterSave(spaceId, projectId);
  } catch {
    // Store shows "User must be a space member before joining project" in a friendly banner.
  }
}

async function removeProjectMember(userId: string) {
  if (saving.value || loading.value) {
    return;
  }

  if (!selectedSpace.value || !selectedProject.value) {
    return;
  }

  clearPageError();
  const spaceId = selectedSpace.value.id;
  const projectId = selectedProject.value.id;

  try {
    await spacesStore.removeProjectMember(spaceId, projectId, userId);
    await refreshAfterSave(spaceId, projectId);
  } catch {
    // Store keeps the normalized error for the page banner.
  }
}

watch(selectedSpaceId, async (spaceId) => {
  selectedSpaceUserId.value = null;
  selectedProjectUserId.value = null;
  ensureSelectedProject();

  if (spaceId) {
    await refreshSpaceUserOptions(spaceId);
  }
});

watch(selectedSpaceProjects, () => {
  ensureSelectedProject();
});

watch(projectCandidateOptions, (options) => {
  if (
    selectedProjectUserId.value &&
    !options.some((option) => option.value === selectedProjectUserId.value)
  ) {
    selectedProjectUserId.value = null;
  }
});

onMounted(async () => {
  await initializePage();
});
</script>

<template>
  <div class="q-gutter-y-md">
    <div class="row items-start q-col-gutter-md">
      <div class="col">
        <div class="text-h5">Пространства</div>
        <div class="text-body2 text-grey-7">
          Управление пространствами, проектами и доступом сотрудников.
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          outline
          color="primary"
          icon="refresh"
          label="Обновить"
          :loading="loading || optionsLoading"
          :disable="saving || initializing"
          @click="initializePage"
        />
      </div>
    </div>

    <q-banner v-if="pageError" rounded class="bg-red-1 text-red-9" data-test="spaces-error">
      <template v-if="isProjectMemberOutsideSpaceError">
        <strong>{{ projectMemberOutsideSpaceCopy.title }}.</strong>
        {{ projectMemberOutsideSpaceCopy.message }}
      </template>
      <template v-else-if="isDuplicateProjectNameError">
        <strong>{{ duplicateProjectNameCopy.title }}.</strong>
        {{ duplicateProjectNameCopy.message }}
      </template>
      <template v-else-if="isNetworkError">
        <strong>{{ networkErrorCopy.title }}.</strong>
        {{ networkErrorCopy.message }}
      </template>
      <template v-else>
        {{ pageError }}
      </template>
      <template
        v-if="isProjectMemberOutsideSpaceError || isNetworkError || showInitialLoadError"
        #action
      >
        <q-btn
          v-if="isProjectMemberOutsideSpaceError"
          flat
          color="negative"
          label="Обновить участников"
          :loading="optionsLoading"
          :disable="!selectedSpace"
          @click="selectedSpace && refreshSpaceUserOptions(selectedSpace.id)"
        />
        <q-btn
          v-else
          flat
          color="negative"
          label="Повторить"
          :loading="loading || optionsLoading"
          :disable="saving"
          @click="initializePage"
        />
      </template>
    </q-banner>

    <q-banner
      v-if="loading && !initializing"
      rounded
      class="bg-grey-2 text-grey-8"
      data-test="spaces-loading"
    >
      <div class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <span>Обновляю данные вкладки...</span>
      </div>
    </q-banner>

    <q-banner v-if="saving" rounded class="bg-blue-1 text-blue-9" data-test="spaces-saving">
      <div class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <span>Сохраняю изменения...</span>
      </div>
    </q-banner>

    <q-card v-if="initializing" flat bordered>
      <q-card-section class="row items-center q-gutter-sm">
        <q-spinner color="primary" />
        <div>Загружаю пространства...</div>
      </q-card-section>
    </q-card>

    <template v-else>
      <q-card flat bordered>
        <q-card-section>
          <div class="text-subtitle1">Новое пространство</div>
          <div class="row q-col-gutter-sm q-mt-sm">
            <div class="col-12 col-md-4">
              <q-input
                v-model="spaceForm.name"
                dense
                outlined
                label="Название"
                :error="Boolean(spaceNameError)"
                :error-message="spaceNameError || undefined"
                :disable="saving || loading"
                data-test="space-name-input"
                @update:model-value="clearPageError"
                @keyup.enter="createSpace"
              />
            </div>
            <div class="col-12 col-md-5">
              <q-input
                v-model="spaceForm.description"
                dense
                outlined
                label="Описание"
                :disable="saving || loading"
                @keyup.enter="createSpace"
              />
            </div>
            <div class="col-12 col-md-3">
              <q-btn
                unelevated
                class="full-width"
                color="primary"
                icon="add_business"
                label="Создать"
                :loading="saving"
                :disable="!canCreateSpace"
                data-test="create-space-button"
                @click="createSpace"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-banner
        v-if="showNoSpacesEmpty"
        rounded
        class="bg-blue-1 text-blue-9"
        data-test="spaces-empty"
      >
        <strong>{{ noSpacesCopy.title }}.</strong>
        {{ noSpacesCopy.message }}
      </q-banner>

      <div v-else-if="spaces.length" class="row q-col-gutter-md">
        <div class="col-12 col-lg-3">
          <q-card flat bordered class="workspace-panel">
            <q-card-section>
              <div class="text-subtitle1">Дерево пространств</div>
            </q-card-section>
            <q-separator />
            <q-list separator>
              <q-item
                v-for="space in spaces"
                :key="space.id"
                clickable
                :active="space.id === selectedSpaceId"
                :disable="saving"
                active-class="bg-primary text-white"
                data-test="space-item"
                @click="selectSpace(space.id)"
              >
                <q-item-section>
                  <q-item-label>{{ space.name }}</q-item-label>
                  <q-item-label caption>
                    {{ space.projects.length }} проектов · {{ space.members.length }} участников
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>

        <div class="col-12 col-lg-4">
          <q-card flat bordered class="workspace-panel">
            <q-card-section>
              <div class="text-subtitle1">Проекты</div>
              <div class="text-caption text-grey-7">
                {{ selectedSpace?.name }}
              </div>
            </q-card-section>
            <q-separator />
            <q-card-section class="q-gutter-y-sm">
              <q-input
                v-model="projectForm.name"
                dense
                outlined
                label="Название проекта"
                :error="Boolean(projectNameErrorText)"
                :error-message="projectNameErrorText || undefined"
                :disable="!selectedSpace || saving || loading"
                data-test="project-name-input"
                @update:model-value="clearPageError"
                @keyup.enter="createProject"
              />
              <q-input
                v-model="projectForm.description"
                dense
                outlined
                label="Описание"
                :disable="!selectedSpace || saving || loading"
                @keyup.enter="createProject"
              />
              <q-btn
                unelevated
                color="primary"
                icon="create_new_folder"
                label="Создать проект"
                :loading="saving"
                :disable="!canCreateProject"
                data-test="create-project-button"
                @click="createProject"
              />
            </q-card-section>
            <q-separator />
            <q-card-section v-if="!selectedSpaceProjects.length">
              <div class="text-subtitle2">
                {{ noProjectsCopy.title }}
              </div>
              <div class="text-body2 text-grey-7">
                {{ noProjectsCopy.message }}
              </div>
            </q-card-section>
            <q-list v-else separator>
              <q-item
                v-for="project in selectedSpaceProjects"
                :key="project.id"
                clickable
                :active="project.id === selectedProjectId"
                :disable="saving"
                active-class="bg-blue-1 text-primary"
                data-test="project-item"
                @click="selectProject(project.id)"
              >
                <q-item-section>
                  <q-item-label>{{ project.name }}</q-item-label>
                  <q-item-label caption> {{ project.members.length }} участников </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>

        <div class="col-12 col-lg-5">
          <div class="q-gutter-y-md">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle1">Участники пространства</div>
                <div class="text-caption text-grey-7">
                  Эти сотрудники могут быть добавлены в проекты пространства.
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm">
                    <q-select
                      v-model="selectedSpaceUserId"
                      dense
                      outlined
                      emit-value
                      map-options
                      clearable
                      label="Сотрудник"
                      :options="spaceCandidateOptions"
                      :loading="optionsLoading"
                      :error="Boolean(spaceMemberError)"
                      :error-message="spaceMemberError || undefined"
                      :disable="!selectedSpace || saving || loading || optionsLoading"
                      data-test="space-member-select"
                      @update:model-value="clearPageError"
                    />
                  </div>
                  <div class="col-12 col-sm-auto">
                    <q-btn
                      unelevated
                      color="primary"
                      icon="person_add"
                      label="Добавить"
                      :loading="saving"
                      :disable="!selectedSpaceUserId || saving || loading || optionsLoading"
                      data-test="add-space-member-button"
                      @click="addSpaceMember"
                    />
                  </div>
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section v-if="!selectedSpaceMembers.length">
                <div class="text-subtitle2">
                  {{ noSpaceMembersCopy.title }}
                </div>
                <div class="text-body2 text-grey-7">
                  {{ noSpaceMembersCopy.message }}
                </div>
              </q-card-section>
              <q-list v-else separator>
                <q-item v-for="member in selectedSpaceMembers" :key="member.id">
                  <q-item-section>
                    <q-item-label>{{ member.email }}</q-item-label>
                    <q-item-label caption>
                      {{ roleLabels[member.role] }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="person_remove"
                      title="Удалить из пространства"
                      :loading="saving"
                      :disable="saving || loading"
                      @click="removeSpaceMember(member.id)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>

            <q-card flat bordered>
              <q-card-section>
                <div class="text-subtitle1">Участники проекта</div>
                <div class="text-caption text-grey-7">
                  {{ selectedProject?.name ?? 'Выберите проект' }}
                </div>
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm">
                    <q-select
                      v-model="selectedProjectUserId"
                      dense
                      outlined
                      emit-value
                      map-options
                      clearable
                      label="Участник пространства"
                      :options="projectCandidateOptions"
                      :loading="optionsLoading"
                      :error="Boolean(projectMemberError)"
                      :error-message="projectMemberError || undefined"
                      :disable="!selectedProject || saving || loading || optionsLoading"
                      data-test="project-member-select"
                      @update:model-value="clearPageError"
                    />
                  </div>
                  <div class="col-12 col-sm-auto">
                    <q-btn
                      unelevated
                      color="primary"
                      icon="group_add"
                      label="Добавить"
                      :loading="saving"
                      :disable="!canAddProjectMember"
                      data-test="add-project-member-button"
                      @click="addProjectMember"
                    />
                  </div>
                </div>
                <q-banner
                  v-if="selectedProject && !projectCandidateOptions.length"
                  rounded
                  class="bg-grey-2 text-grey-8 q-mt-sm"
                >
                  <strong>{{ noEligibleProjectMembersCopy.title }}.</strong>
                  {{ noEligibleProjectMembersCopy.message }}
                </q-banner>
              </q-card-section>
              <q-separator />
              <q-card-section v-if="!selectedProject">
                <div class="text-body2 text-grey-7">
                  Выберите проект, чтобы управлять его участниками.
                </div>
              </q-card-section>
              <q-card-section v-else-if="!selectedProjectMembers.length">
                <div class="text-subtitle2">
                  {{ noProjectMembersCopy.title }}
                </div>
                <div class="text-body2 text-grey-7">
                  {{ noProjectMembersCopy.message }}
                </div>
              </q-card-section>
              <q-list v-else separator>
                <q-item v-for="member in selectedProjectMembers" :key="member.id">
                  <q-item-section>
                    <q-item-label>{{ member.email }}</q-item-label>
                    <q-item-label caption>
                      {{ roleLabels[member.role] }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      color="negative"
                      icon="person_remove"
                      title="Удалить из проекта"
                      :loading="saving"
                      :disable="saving || loading"
                      @click="removeProjectMember(member.id)"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.workspace-panel {
  min-height: 100%;
}
</style>
