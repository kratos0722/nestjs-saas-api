import { Module } from '@nestjs/common';

import { InMemoryProjectRepository } from '../common/in-memory.repositories';
import { PROJECT_REPOSITORY } from '../common/repositories';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    // Swap for a Postgres adapter to persist across restarts (see README).
    { provide: PROJECT_REPOSITORY, useClass: InMemoryProjectRepository },
  ],
})
export class ProjectsModule {}
