export type Point = { x: number; y: number };

export type ObjectType = 'desk' | 'coffee' | 'meeting' | 'entrance' | 'printer' | 'toilet' | 'obstacle1' | 'obstacle2' | 'pizza' | 'atrium' | 'pod' | 'obstacle' | 'stage';

export interface SpaceObject {
  id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

export type AgentRole = 'participant' | 'organiser' | 'staff';

export enum PersonaType {
  PARTICIPANT = "PARTICIPANT",
  ORGANISER = "ORGANISER",
  STAFF = "STAFF",
}

export interface AgentMetrics {
  activityLevel: number;
  deskFrequency: number;
  coffeeFrequency: number;
  meetingFrequency: number;
  speed?: number;
  socialFrequency?: number;
  coffeeDesire?: number;
  focusLevel?: number;
  deskPreference?: number;
  meetingPreference?: number;
  podPreference?: number;
  pizzaPreference?: number;
  movementSpeed?: number;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  speed: number;
  personality: string;
  wackyBehavior: string;
  metrics: AgentMetrics;
  status: 'idle' | 'moving' | 'working' | 'socializing' | 'walking';
  currentGoalId: string | null;
  waitTime: number;
  travelTime: number;
}

export interface ScenarioReport {
  name: string;
  timestamp: number;
  totalAgents: number;
  activeTime: number;
  objectCount: number;
  objectUsage: Record<string, { totalTime: number; visitCount: number }>;
  travelMetrics: Record<AgentRole, number>;
  objects: SpaceObject[];
}

export interface HackathonBehavior {
  description: string;
  modifiers: {
    participant: AgentMetrics;
    organiser: AgentMetrics;
    staff: AgentMetrics;
  };
}

export interface SimulationState {
  objects: SpaceObject[];
  agents: Agent[];
  vibe: string;
  vibeMultipliers: {
    speed: number;
    social: number;
    coffee: number;
  };
  isRunning: boolean;
  time: number;
  showHeatmap: boolean;
  savedScenarios: any[];
}
