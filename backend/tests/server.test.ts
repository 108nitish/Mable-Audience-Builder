import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import http from 'http'
import { app } from '../src/server'

describe('server', () => {
  let server: http.Server
  let port: number

  beforeAll((done) => {
    server = app.listen(0, () => {
      port = (server.address() as any).port
      done()
    })
  })

  afterAll((done) => {
    server.close(done)
  })

  it('health endpoint returns status ok', async () => {
    const response = await fetch(`http://localhost:${port}/health`)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({ status: 'ok' })
  })
})
