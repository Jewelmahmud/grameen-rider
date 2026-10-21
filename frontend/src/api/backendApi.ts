import { http } from './http';

export const backendApi = {
  // Health
  health: () => http.get('/health').then((res) => res.data),
  healthDetailed: () => http.get('/health/detailed').then((res) => res.data),

  // User profiles
  me: () => http.get('/user-profiles/me').then((res) => res.data),
  updateFcmToken: (fcmToken: string) =>
    http.put('/user-profiles/fcm-token', { fcmToken }).then((res) => res.data),

  // Trips
  createTrip: (payload: Record<string, unknown>) =>
    http.post('/trips', payload).then((res) => res.data),
  getTrips: () => http.get('/trips').then((res) => res.data),
  getTripById: (tripId: string) => http.get(`/trips/${tripId}`).then((res) => res.data),
  cancelTrip: (tripId: string) => http.put(`/trips/${tripId}/cancel`).then((res) => res.data),
  acceptTrip: (tripId: string) => http.put(`/trips/${tripId}/accept`).then((res) => res.data),

  // Driver
  getDriverMe: () => http.get('/drivers/me').then((res) => res.data),
  updateDriverLocation: (latitude: number, longitude: number) =>
    http.put('/drivers/location', { latitude, longitude }).then((res) => res.data),
  updateDriverAvailability: (isOnline: boolean, isAvailable: boolean) =>
    http.put('/drivers/availability', { isOnline, isAvailable }).then((res) => res.data),

  // Payments
  createPayment: (payload: Record<string, unknown>) =>
    http.post('/payments', payload).then((res) => res.data),
  getPaymentById: (paymentId: string) =>
    http.get(`/payments/${paymentId}`).then((res) => res.data),
  verifyPayment: (paymentId: string, payload: Record<string, unknown>) =>
    http.post(`/payments/${paymentId}/verify`, payload).then((res) => res.data),

  // Notifications
  getNotifications: () => http.get('/notifications').then((res) => res.data),
  markNotificationRead: (notificationId: string) =>
    http.put(`/notifications/${notificationId}/read`).then((res) => res.data),
  sendSms: (phoneNumber: string, message: string) =>
    http.post('/notifications/sms/send', { phoneNumber, message }).then((res) => res.data),

  // Favorite locations
  getFavoriteLocations: () => http.get('/locations/favorites').then((res) => res.data),
  createFavoriteLocation: (payload: Record<string, unknown>) =>
    http.post('/locations/favorites', payload).then((res) => res.data),
};
