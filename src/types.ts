/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ObjectType = 'desk' | 'coffee' | 'meeting' | 'printer' | 'entrance' | 'obstacle' | 'obstacle1' | 'obstacle2' | 'toilet' | 'pizza' | 'atrium' | 'pod';
export type AgentRole = 'participant' | 'organiser' | 'staff';

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

export interface AgentMetrics {
  activityLevel: number; // 1-10 (how often they move)
  deskFrequency: number; // 0-1 (probability weight)
  coffeeFrequency: number; // 0-1
  meetingFrequency: number; // 0-1
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  personality: string;
  wackyBehavior: string;
  status: 'walking' | 'working' | 'queueing' | 'socializing';
  metrics: AgentMetrics;
  currentGoalId?: string;
  waitTime: number; // frames to wait at a location
  travelTime: number; // total time spent walking
}

export interface SimulationConfig {
  agentCount: number;
  wackyFactor: number;
  isRunning: boolean;
}

export interface HackathonModifiers {
  activityLevel: number; // Multiplier
  movementSpeed: number; // Multiplier
  deskPreference: number; // Multiplier
  meetingPreference: number; // Multiplier
  podPreference: number; // Multiplier
  pizzaPreference: number; // Multiplier
}

export interface HackathonBehavior {
  description: string;
  modifiers: Record<AgentRole, HackathonModifiers>;
}

export interface ScenarioReport {
  name: string;
  timestamp: number;
  totalAgents: number;
  activeTime: number;
  objectCount: number;
  objectUsage: Record<string, { totalTime: number; visitCount: number }>;
  travelMetrics?: Record<AgentRole, number>;
  objects: SpaceObject[];
}
