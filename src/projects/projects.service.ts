import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { Project } from '../common/models';
import { PROJECT_REPOSITORY, ProjectRepository } from '../common/repositories';
import { CreateProjectDto, UpdateProjectDto } from './dto';

/** All methods take the caller's orgId and scope every operation to it, so one
 * tenant can never read or mutate another tenant's projects. */
@Injectable()
export class ProjectsService {
  constructor(@Inject(PROJECT_REPOSITORY) private readonly repo: ProjectRepository) {}

  async create(orgId: string, dto: CreateProjectDto): Promise<Project> {
    const now = new Date().toISOString();
    const project: Project = {
      id: uuid(),
      orgId,
      name: dto.name,
      description: dto.description ?? '',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    return this.repo.create(project);
  }

  list(orgId: string): Promise<Project[]> {
    return this.repo.listByOrg(orgId);
  }

  async get(orgId: string, id: string): Promise<Project> {
    const project = await this.repo.findForOrg(id, orgId);
    if (!project) {
      // 404 (not 403) so a foreign id is indistinguishable from a missing one.
      throw new NotFoundException('project not found');
    }
    return project;
  }

  async update(orgId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    const existing = await this.get(orgId, id);
    const updated: Project = {
      ...existing,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description,
      status: dto.status ?? existing.status,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.update(updated);
  }

  async remove(orgId: string, id: string): Promise<void> {
    const deleted = await this.repo.delete(id, orgId);
    if (!deleted) {
      throw new NotFoundException('project not found');
    }
  }
}
