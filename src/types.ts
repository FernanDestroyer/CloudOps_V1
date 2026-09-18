export type Status = 'healthy' | 'review' | 'alert'
export type Proposal = { id?: string; createdAt?: string; name: string; appType: string; description: string; region: string; users: string; availability: string; services: string[]; goal: string }
export type AwsService = { name: string; category: string; description: string; function: string; usage: string; color: string }
