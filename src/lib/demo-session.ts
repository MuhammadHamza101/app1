export const demoSession = {
  user: {
    id: 'demo-user',
    name: 'Demo User',
    email: 'demo@local',
    role: 'ADMIN',
    firmId: 'demo-firm',
    firm: {
      id: 'demo-firm',
      name: 'Local Firm',
      domain: 'localhost',
    },
  },
}

export type DemoSession = typeof demoSession

export function getDemoSession(): DemoSession {
  return demoSession
}
