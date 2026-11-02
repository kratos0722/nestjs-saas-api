import { NotFoundException } from '@nestjs/common';

import { InMemoryProjectRepository } from '../common/in-memory.repositories';
import { ProjectsService } from './projects.service';

const ORG_A = 'org-a';
const ORG_B = 'org-b';

describe('ProjectsService (tenant isolation)', () => {
  let service: ProjectsService;

  beforeEach(() => {
    service = new ProjectsService(new InMemoryProjectRepository());
  });

  it('scopes list results to the calling org', async () => {
    await service.create(ORG_A, { name: 'A-one' });
    await service.create(ORG_A, { name: 'A-two' });
    await service.create(ORG_B, { name: 'B-one' });

    const forA = await service.list(ORG_A);
    const forB = await service.list(ORG_B);

    expect(forA.map((p) => p.name).sort()).toEqual(['A-one', 'A-two']);
    expect(forB.map((p) => p.name)).toEqual(['B-one']);
  });

  it('hides another org\'s project behind a 404 on get', async () => {
    const a = await service.create(ORG_A, { name: 'secret' });
    await expect(service.get(ORG_B, a.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.get(ORG_A, a.id)).id).toBe(a.id);
  });

  it('refuses to update a project owned by another org', async () => {
    const a = await service.create(ORG_A, { name: 'orig' });
    await expect(service.update(ORG_B, a.id, { name: 'hijacked' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect((await service.get(ORG_A, a.id)).name).toBe('orig');
  });

  it('refuses to delete a project owned by another org', async () => {
    const a = await service.create(ORG_A, { name: 'keep' });
    await expect(service.remove(ORG_B, a.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.get(ORG_A, a.id)).id).toBe(a.id);

    await service.remove(ORG_A, a.id);
    await expect(service.get(ORG_A, a.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('defaults new projects to active with timestamps', async () => {
    const p = await service.create(ORG_A, { name: 'new' });
    expect(p.status).toBe('active');
    expect(p.createdAt).toBeTruthy();
    expect(p.updatedAt).toBe(p.createdAt);
  });
});
