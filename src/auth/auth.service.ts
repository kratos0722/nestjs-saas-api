import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

import { Organization, User } from '../common/models';
import {
  ORG_REPOSITORY,
  OrgRepository,
  USER_REPOSITORY,
  UserRepository,
} from '../common/repositories';
import { LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './jwt.strategy';

export interface AuthResult {
  accessToken: string;
  orgId: string;
  userId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ORG_REPOSITORY) private readonly orgs: OrgRepository,
    private readonly jwt: JwtService,
  ) {}

  /** Register a new tenant and its first user, who becomes the org owner. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('a user with this email already exists');
    }

    const now = new Date().toISOString();
    const org: Organization = { id: uuid(), name: dto.orgName, createdAt: now };
    await this.orgs.create(org);

    const user: User = {
      id: uuid(),
      orgId: org.id,
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      role: 'owner',
      createdAt: now,
    };
    await this.users.create(user);

    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      // Same error for unknown email and bad password: don't reveal which.
      throw new UnauthorizedException('invalid credentials');
    }
    return this.issue(user);
  }

  private issue(user: User): AuthResult {
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.orgId,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign(payload),
      orgId: user.orgId,
      userId: user.id,
    };
  }
}
