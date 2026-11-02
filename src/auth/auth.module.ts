import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import {
  InMemoryOrgRepository,
  InMemoryUserRepository,
} from '../common/in-memory.repositories';
import { ORG_REPOSITORY, USER_REPOSITORY } from '../common/repositories';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWT_SECRET, JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Swap these two bindings for a Postgres adapter to persist across restarts.
    { provide: USER_REPOSITORY, useClass: InMemoryUserRepository },
    { provide: ORG_REPOSITORY, useClass: InMemoryOrgRepository },
  ],
  exports: [USER_REPOSITORY],
})
export class AuthModule {}
