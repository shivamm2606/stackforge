import axios from 'axios'

const api = axios.create({
  baseURL:         '/api',
  withCredentials: true,
})

// Authorization header from localStorage when set
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = 'Bearer ' + token
  return config
})

export default api
