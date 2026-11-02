import { SetMetadata } from '@nestjs/common';

import { Role } from '../common/models';

export const ROLES_KEY = 'roles';

/** Restrict a route to the given tenant roles; enforced by RolesGuard. */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
