/**
 * Tests de l'API TaskFlow avec supertest.
 * L'application est créée en mémoire : aucun port n'est ouvert.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../src/app.js'

let app

beforeEach(() => {
  app = createApp()
})

describe('GET /health', () => {
  it('répond ok avec version et environnement', async () => {
    const res = await request(app).get('/health')

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body).toHaveProperty('version')
    expect(res.body).toHaveProperty('env')
    expect(typeof res.body.uptime).toBe('number')
  })
})

describe('GET /api/tasks', () => {
  it('retourne une liste vide au démarrage', async () => {
    const res = await request(app).get('/api/tasks')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('retourne les tâches initiales fournies', async () => {
    const seeded = createApp({ initialTasks: [{ id: 'a1', text: 'x', completed: false }] })
    const res = await request(seeded).get('/api/tasks')

    expect(res.body).toHaveLength(1)
    expect(res.body[0].id).toBe('a1')
  })
})

describe('POST /api/tasks', () => {
  it('crée une tâche avec les valeurs par défaut', async () => {
    const res = await request(app).post('/api/tasks').send({ text: '  Réviser PromQL  ' })

    expect(res.status).toBe(201)
    expect(res.body.text).toBe('Réviser PromQL')
    expect(res.body.priority).toBe('medium')
    expect(res.body.completed).toBe(false)
    expect(res.body.id).toBeDefined()
  })

  it('refuse un texte vide', async () => {
    const res = await request(app).post('/api/tasks').send({ text: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/requis/)
  })

  it('refuse une priorité invalide', async () => {
    const res = await request(app).post('/api/tasks').send({ text: 'ok', priority: 'urgent' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Priorité invalide/)
  })
})

describe('PATCH /api/tasks/:id/toggle', () => {
  it('bascule completed', async () => {
    const created = await request(app).post('/api/tasks').send({ text: 'toggle' })
    const res = await request(app).patch(`/api/tasks/${created.body.id}/toggle`)

    expect(res.status).toBe(200)
    expect(res.body.completed).toBe(true)
  })

  it('renvoie 404 pour un id inconnu', async () => {
    const res = await request(app).patch('/api/tasks/inconnu/toggle')

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/tasks/:id', () => {
  it('supprime la tâche', async () => {
    const created = await request(app).post('/api/tasks').send({ text: 'à supprimer' })
    const del = await request(app).delete(`/api/tasks/${created.body.id}`)
    const list = await request(app).get('/api/tasks')

    expect(del.status).toBe(204)
    expect(list.body).toHaveLength(0)
  })

  it('renvoie 404 pour un id inconnu', async () => {
    const res = await request(app).delete('/api/tasks/inconnu')

    expect(res.status).toBe(404)
  })
})

describe('routes diverses', () => {
  it('GET /api/boom renvoie 500 (démo alerting)', async () => {
    const res = await request(app).get('/api/boom')

    expect(res.status).toBe(500)
  })

  it('une route inconnue renvoie 404 JSON', async () => {
    const res = await request(app).get('/nimporte-quoi')

    expect(res.status).toBe(404)
    expect(res.body.error).toBeDefined()
  })
})
