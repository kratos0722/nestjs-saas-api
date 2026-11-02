import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthenticatedUser, Role } from '../common/models';

export interface JwtPayload {
  sub: string;
  orgId: string;
  email: string;
  role: Role;
}

export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  /** Passport calls this with the verified payload; the return value becomes req.user. */
  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
      role: payload.role,
    };
  }
}
