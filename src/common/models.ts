/** Core domain records. Persistence is abstracted behind the repositories in
 * `common/repositories.ts`; the shipped adapters are in-memory, and a Postgres
 * adapter can be added without touching the services (see README). */

export type Role = 'owner' | 'member';

/** A tenant. Every other record belongs to exactly one organization. */
export interface Organization {
  id: string;
  name: string;
  createdAt: string;
}

export interface User {
  id: string;
  orgId: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id: string;
  orgId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/** The authenticated principal attached to each request by the JWT strategy. */
export interface AuthenticatedUser {
  userId: string;
  orgId: string;
  email: string;
  role: Role;
}
