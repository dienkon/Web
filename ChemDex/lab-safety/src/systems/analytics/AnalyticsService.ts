
export class AnalyticsService {
  static logEvent(eventName: string, data: any) {
    const record = { event: eventName, data, timestamp: Date.now() };
    const history = JSON.parse(localStorage.getItem('lab_analytics') || '[]');
    history.push(record);
    localStorage.setItem('lab_analytics', JSON.stringify(history));
  }
}
