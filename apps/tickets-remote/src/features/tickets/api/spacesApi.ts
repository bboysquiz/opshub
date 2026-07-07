import { http } from './http';

type ProjectDto = {
  id: string;
  spaceId: string;
  name: string;
  archivedAt: string | null;
};

type SpaceDto = {
  id: string;
  name: string;
  projects: ProjectDto[];
};

type SpacesResponse = {
  items: SpaceDto[];
};

export type TicketProjectOption = {
  projectId: string;
  projectName: string;
  spaceId: string;
  spaceName: string;
};

export const spacesApi = {
  async listTicketProjects(): Promise<TicketProjectOption[]> {
    const data = await http<SpacesResponse>('/spaces');

    return data.items.flatMap((space) =>
      space.projects
        .filter((project) => !project.archivedAt)
        .map((project) => ({
          projectId: project.id,
          projectName: project.name,
          spaceId: space.id,
          spaceName: space.name,
        })),
    );
  },
};
