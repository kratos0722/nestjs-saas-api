import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './app.module';

/** End-to-end flow exercised over real HTTP: tenant onboarding, auth, and the
 * cross-tenant isolation guarantees that matter most for a B2B SaaS API. */
describe('nestjs-saas-api (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(orgName: string, email: string): Promise<string> {
    const res = await http
      .post('/auth/register')
      .send({ orgName, email, password: 'sup3r-secret' })
      .expect(201);
    return res.body.accessToken as string;
  }

  async function login(email: string, password: string): Promise<string> {
    const res = await http.post('/auth/login').send({ email, password }).expect(200);
    return res.body.accessToken as string;
  }

  it('rejects an invalid registration body with 400', async () => {
    await http
      .post('/auth/register')
      .send({ orgName: 'x', email: 'not-an-email', password: 'short' })
      .expect(400);
  });

  it('requires a bearer token for projects', async () => {
    await http.get('/projects').expect(401);
  });

  it('isolates projects between tenants', async () => {
    const tokenA = await register('Acme', 'owner@acme.test');
    const tokenB = await register('Globex', 'owner@globex.test');

    const created = await http
      .post('/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Acme roadmap', description: 'internal' })
      .expect(201);
    const projectId = created.body.id as string;

    // Owner A sees its project.
    const listA = await http
      .get('/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(listA.body.map((p: { id: string }) => p.id)).toContain(projectId);

    // Tenant B cannot see or fetch it.
    const listB = await http
      .get('/projects')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body).toHaveLength(0);

    await http
      .get(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404);

    await http
      .patch(`/projects/${projectId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'hijacked' })
      .expect(404);
  });

  it('rejects unknown fields on create (400)', async () => {
    const token = await register('Initech', 'owner@initech.test');
    await http
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'ok', role: 'owner' })
      .expect(400);
  });

  it('lets an owner update and delete their own project', async () => {
    const token = await register('Umbrella', 'owner@umbrella.test');
    const created = await http
      .post('/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'first' })
      .expect(201);
    const id = created.body.id as string;

    const patched = await http
      .patch(`/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archived' })
      .expect(200);
    expect(patched.body.status).toBe('archived');

    await http.delete(`/projects/${id}`).set('Authorization', `Bearer ${token}`).expect(204);
    await http.get(`/projects/${id}`).set('Authorization', `Bearer ${token}`).expect(404);
  });

  describe('team member invitations', () => {
    it('lets an owner invite a member who can work but not delete', async () => {
      const ownerToken = await register('Wayne Ent', 'owner@wayne.test');
      const memberEmail = 'member@wayne.test';

      const invited = await http
        .post('/auth/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: memberEmail, password: 'member-secret' })
        .expect(201);
      expect(invited.body.role).toBe('member');

      const memberToken = await login(memberEmail, 'member-secret');

      // The member can create a project in the shared org...
      const created = await http
        .post('/projects')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ name: 'member project' })
        .expect(201);
      const projectId = created.body.id as string;

      // ...the owner sees it (same tenant)...
      const ownerList = await http
        .get('/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(ownerList.body.map((p: { id: string }) => p.id)).toContain(projectId);

      // ...but the member may not delete it (owner-only).
      await http
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);
    });

    it('forbids a member from inviting other members', async () => {
      const ownerToken = await register('Stark Ind', 'owner@stark.test');
      await http
        .post('/auth/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'm@stark.test', password: 'member-secret' })
        .expect(201);
      const memberToken = await login('m@stark.test', 'member-secret');

      await http
        .post('/auth/members')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: 'm2@stark.test', password: 'member-secret' })
        .expect(403);
    });

    it('rejects a duplicate email with 409 and requires auth', async () => {
      const ownerToken = await register('Oscorp', 'owner@oscorp.test');
      await http
        .post('/auth/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'dup@oscorp.test', password: 'member-secret' })
        .expect(201);
      await http
        .post('/auth/members')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'dup@oscorp.test', password: 'member-secret' })
        .expect(409);
      await http
        .post('/auth/members')
        .send({ email: 'x@oscorp.test', password: 'member-secret' })
        .expect(401);
    });
  });
});
