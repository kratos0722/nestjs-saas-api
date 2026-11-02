import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthenticatedUser } from '../common/models';
import { AuthResult, AuthService, MemberSummary } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { InviteMemberDto, LoginDto, RegisterDto } from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResult> {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @Post('members')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @HttpCode(HttpStatus.CREATED)
  inviteMember(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ): Promise<MemberSummary> {
    return this.auth.inviteMember(user.orgId, dto);
  }
}
