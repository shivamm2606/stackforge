// GET /api/test

export const testHandler = (_req, res) => {
  res.json({
    message:   'API is working',
    timestamp: new Date(),
  })
}
