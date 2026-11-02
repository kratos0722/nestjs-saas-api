import { Organization, Project, User } from './models';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const ORG_REPOSITORY = Symbol('ORG_REPOSITORY');
export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');

export interface OrgRepository {
  create(org: Organization): Promise<Organization>;
}

export interface UserRepository {
  create(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export interface ProjectRepository {
  create(project: Project): Promise<Project>;
  /** List projects for a single tenant. Callers must never pass another org's id. */
  listByOrg(orgId: string): Promise<Project[]>;
  /** Look up a project scoped to a tenant. Returns null for a foreign or missing id. */
  findForOrg(id: string, orgId: string): Promise<Project | null>;
  update(project: Project): Promise<Project>;
  delete(id: string, orgId: string): Promise<boolean>;
}
