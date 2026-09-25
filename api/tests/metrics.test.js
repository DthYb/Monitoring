import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'

describe('GET /metrics', () => {
  it('expose les métriques au format Prometheus', async () => {
    const app = createApp()
    await request(app).get('/api/tasks') // génère une requête mesurée

    const res = await request(app).get('/metrics')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/plain/)
    expect(res.text).toContain('http_requests_total')
    expect(res.text).toMatch(
      /http_requests_total\{method="GET",route="\/api\/tasks",status_code="200"\} 1/
    )
    expect(res.text).toContain('taskflow_tasks_total')
  })
})
