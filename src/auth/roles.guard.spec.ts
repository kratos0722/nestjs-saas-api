import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedUser, Role } from '../common/models';
import { RolesGuard } from './roles.guard';

function contextFor(role: Role): ExecutionContext {
  const user: AuthenticatedUser = { userId: 'u', orgId: 'o', email: 'e@x.io', role };
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows any role when no roles are required', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor('member'))).toBe(true);
  });

  it('allows a user whose role is required', () => {
    const reflector = { getAllAndOverride: () => ['owner'] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(contextFor('owner'))).toBe(true);
  });

  it('forbids a user whose role is not required', () => {
    const reflector = { getAllAndOverride: () => ['owner'] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(contextFor('member'))).toThrow(
      ForbiddenException,
    );
  });
});
