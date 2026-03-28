
//  GET /api/test
//  Health-check endpoint confirms the API is working.
 
export const testHandler = (_req, res) => {
  res.json({
    message:   'API is working',
    timestamp: new Date(),
  })
}
