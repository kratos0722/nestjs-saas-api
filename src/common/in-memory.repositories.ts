import { Injectable } from '@nestjs/common';

import { Organization, Project, User } from './models';
import { OrgRepository, ProjectRepository, UserRepository } from './repositories';

/** Default, dependency-free persistence used for tests and local runs.
 * Tenant scoping is enforced here as well as in the services, so a query can
 * never leak across organizations even if a caller forgets to filter. */
@Injectable()
export class InMemoryOrgRepository implements OrgRepository {
  private readonly orgs = new Map<string, Organization>();

  async create(org: Organization): Promise<Organization> {
    this.orgs.set(org.id, org);
    return org;
  }
}

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const needle = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === needle) {
        return user;
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }
}

@Injectable()
export class InMemoryProjectRepository implements ProjectRepository {
  private readonly projects = new Map<string, Project>();

  async create(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    return project;
  }

  async listByOrg(orgId: string): Promise<Project[]> {
    return [...this.projects.values()]
      .filter((project) => project.orgId === orgId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async findForOrg(id: string, orgId: string): Promise<Project | null> {
    const project = this.projects.get(id);
    return project && project.orgId === orgId ? project : null;
  }

  async update(project: Project): Promise<Project> {
    this.projects.set(project.id, project);
    return project;
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    const project = this.projects.get(id);
    if (!project || project.orgId !== orgId) {
      return false;
    }
    return this.projects.delete(id);
  }
}
