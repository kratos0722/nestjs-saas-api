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
});
