/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';
import { 
  Users, 
  Settings2, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Coffee, 
  Briefcase, 
  Monitor, 
  DoorOpen,
  Sparkles,
  BrainCircuit,
  MessageSquareQuote,
  Loader2,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Bath,
  MapPin,
  CloudSun,
  Minus,
  MoreVertical,
  Image as ImageIcon,
  Upload,
  Pizza,
  Mic,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Box
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Agent, SpaceObject, ObjectType, AgentRole, AgentMetrics, ScenarioReport, HackathonBehavior } from './types';
import { generatePersona, analyzeSpace, getEnvironmentalFactors, EnvironmentalFactors, digitizeLayout, analyzeHackathonBehavior } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_OBJECTS: SpaceObject[] = [
  { id: 'ent-1', type: 'entrance', x: 50, y: 50, width: 60, height: 40, label: 'Entrance', color: '#10b981' },
  { id: 'desk-1', type: 'desk', x: 200, y: 150, width: 80, height: 50, label: 'Desk A', color: '#3b82f6' },
  { id: 'desk-2', type: 'desk', x: 200, y: 250, width: 80, height: 50, label: 'Desk B', color: '#3b82f6' },
  { id: 'coffee-1', type: 'coffee', x: 500, y: 50, width: 60, height: 60, label: 'Coffee', color: '#f59e0b' },
  { id: 'meeting-1', type: 'meeting', x: 450, y: 300, width: 150, height: 100, label: 'Meeting Room', color: '#8b5cf6' },
];

export default function App() {
  const [objects, setObjects] = useState<SpaceObject[]>(INITIAL_OBJECTS);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [wackyFactor, setWackyFactor] = useState(5);
  const [timeDilation, setTimeDilation] = useState(20);
  const [simulatedSeconds, setSimulatedSeconds] = useState(0); // Total simulated seconds
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isGenerating, setIsGenerating] = useState<AgentRole | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [scenarioA, setScenarioA] = useState<ScenarioReport | null>(null);
  const [scenarioB, setScenarioB] = useState<ScenarioReport | null>(null);
  const [heatmapMax, setHeatmapMax] = useState(1);
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [objectUsage, setObjectUsage] = useState<Record<string, { totalTime: number; visitCount: number }>>({});
  const [location, setLocation] = useState("San Francisco, CA");
  const [startTime, setStartTime] = useState("08:00");
  const [envFactors, setEnvFactors] = useState<EnvironmentalFactors | null>(null);
  const [isUpdatingEnv, setIsUpdatingEnv] = useState(false);
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [hackathonBehavior, setHackathonBehavior] = useState<HackathonBehavior | null>(null);
  const [isAnalyzingBehavior, setIsAnalyzingBehavior] = useState(false);
  const [behaviorInput, setBehaviorInput] = useState("");
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize heatmap grid
  useEffect(() => {
    const rows = Math.ceil(dimensions.height / 20);
    const cols = Math.ceil(dimensions.width / 20);
    setHeatmapData(prev => {
      if (prev.length === rows && prev[0]?.length === cols) return prev;
      return Array(rows).fill(0).map(() => Array(cols).fill(0));
    });
  }, [dimensions]);

  // Handle responsive canvas size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Clear analysis when objects change to prevent stale insights
  useEffect(() => {
    setAnalysis(null);
  }, [objects]);

  const updateEnvironment = async () => {
    setIsUpdatingEnv(true);
    try {
      const factors = await getEnvironmentalFactors(location, startTime);
      setEnvFactors(factors);
    } catch (error) {
      console.error("Failed to update environment", error);
    } finally {
      setIsUpdatingEnv(false);
    }
  };

  useEffect(() => {
    updateEnvironment();
  }, []);

  // Simulation Loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // Increment simulated time based on dilation
      // 16ms real time = (16 * timeDilation / 1000) simulated seconds
      const simSecondsPerFrame = (16 * timeDilation) / 1000;
      
      setSimulatedSeconds(prev => {
        const next = prev + simSecondsPerFrame;
        if (next >= 28800) { // 8 hours limit
          setIsRunning(false);
          return 28800;
        }
        return next;
      });

      // Update Heatmap and Usage
      setHeatmapData(prev => {
        const newData = [...prev.map(row => [...row])];
        let currentMax = heatmapMax;
        agents.forEach(agent => {
          const col = Math.floor(agent.x / 20);
          const row = Math.floor(agent.y / 20);
          if (row >= 0 && row < newData.length && col >= 0 && col < newData[0].length) {
            newData[row][col] += 1;
            if (newData[row][col] > currentMax) currentMax = newData[row][col];
          }
        });
        setHeatmapMax(currentMax);
        return newData;
      });

      setObjectUsage(prev => {
        const next = { ...prev };
        agents.forEach(agent => {
          if (agent.status === 'working' && agent.currentGoalId) {
            const current = next[agent.currentGoalId] || { totalTime: 0, visitCount: 0 };
            next[agent.currentGoalId] = {
              ...current,
              totalTime: current.totalTime + simSecondsPerFrame
            };
          }
        });
        return next;
      });

      setAgents(prev => prev.map(agent => {
        // 1. If waiting, decrement wait time
        if (agent.waitTime > 0) {
          return { ...agent, waitTime: agent.waitTime - (timeDilation / 20), status: 'working' };
        }

        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 2. Reached target - start working/waiting
        if (distance < 5 && agent.status === 'walking') {
          // Activity level determines how long they stay (higher activity = shorter stay)
          const activityMultiplier = hackathonBehavior?.modifiers[agent.role]?.activityLevel || 1;
          const baseWait = 100 + (10 - Math.min(10, agent.metrics.activityLevel * activityMultiplier)) * 50;
          const waitTime = Math.floor(baseWait * (0.5 + Math.random()));
          
          if (agent.currentGoalId) {
            setObjectUsage(prev => ({
              ...prev,
              [agent.currentGoalId!]: {
                totalTime: (prev[agent.currentGoalId!]?.totalTime || 0),
                visitCount: (prev[agent.currentGoalId!]?.visitCount || 0) + 1
              }
            }));
          }
          
          return { ...agent, waitTime, status: 'working' };
        }

        // 3. Finished working - pick next target
        if (distance < 5 && agent.status === 'working') {
          const rand = Math.random();
          let targetType: ObjectType = 'desk';
          
          const behaviorMods = hackathonBehavior?.modifiers[agent.role];
          const deskWeight = agent.metrics.deskFrequency * (behaviorMods?.deskPreference || 1);
          const coffeeWeight = agent.metrics.coffeeFrequency * (envFactors?.modifiers.coffeeDesire || 1);
          const socialWeight = agent.metrics.meetingFrequency * (envFactors?.modifiers.socialProbability || 1) * (behaviorMods?.meetingPreference || 1);
          const pizzaWeight = 0.1 * (behaviorMods?.pizzaPreference || 1);
          const podWeight = 0.1 * (behaviorMods?.podPreference || 1);
          const atriumWeight = socialWeight * 0.3; // Atrium is a special social spot
          
          const totalWeight = deskWeight + coffeeWeight + socialWeight + pizzaWeight + atriumWeight + podWeight;
          const normalizedRoll = rand * totalWeight;

          if (normalizedRoll < 0.05) targetType = 'toilet'; 
          else if (normalizedRoll < 0.1) targetType = 'pod';
          else if (normalizedRoll < deskWeight) targetType = 'desk';
          else if (normalizedRoll < deskWeight + coffeeWeight) targetType = 'coffee';
          else if (normalizedRoll < deskWeight + coffeeWeight + pizzaWeight) targetType = 'pizza';
          else if (normalizedRoll < deskWeight + coffeeWeight + pizzaWeight + socialWeight) targetType = 'meeting';
          else if (normalizedRoll < deskWeight + coffeeWeight + pizzaWeight + socialWeight + atriumWeight) targetType = 'atrium';
          else targetType = 'entrance';

          // Check if target type exists, fallback to random if not
          const getAvailableTarget = (type: ObjectType) => {
            const possibleTargets = objects.filter(o => o.type === type);
            if (possibleTargets.length === 0) return null;

            // Filter by capacity if applicable
            const availableTargets = possibleTargets.filter(obj => {
              if (obj.type !== 'desk' && obj.type !== 'meeting' && obj.type !== 'toilet' && obj.type !== 'pod') return true;
              let capacity = 1;
              if (obj.type === 'desk') capacity = 4;
              else if (obj.type === 'meeting') capacity = 8;
              else if (obj.type === 'toilet') capacity = 1;
              else if (obj.type === 'pod') capacity = 1;
              
              const currentOccupants = agents.filter(a => a.currentGoalId === obj.id && a.status === 'working').length;
              return currentOccupants < capacity;
            });

            if (availableTargets.length > 0) {
              return availableTargets[Math.floor(Math.random() * availableTargets.length)];
            }
            return null;
          };

          let nextObj = getAvailableTarget(targetType);
          
          // If preferred target is full or doesn't exist, try other types in order of priority
          if (!nextObj) {
            const fallbackTypes: ObjectType[] = ['desk', 'coffee', 'meeting', 'atrium', 'entrance'];
            for (const fallback of fallbackTypes) {
              nextObj = getAvailableTarget(fallback);
              if (nextObj) break;
            }
          }

          // Ultimate fallback to any object if still nothing found
          if (!nextObj) {
            nextObj = objects[Math.floor(Math.random() * objects.length)];
          }

          return {
            ...agent,
            targetX: nextObj.x + nextObj.width / 2,
            targetY: nextObj.height / 2 + nextObj.y,
            currentGoalId: nextObj.id,
            status: 'walking'
          };
        }

        // 4. Movement logic
        const behaviorMods = hackathonBehavior?.modifiers[agent.role];
        const speedMultiplier = (timeDilation / 20) * (envFactors?.modifiers.movementSpeed || 1) * (behaviorMods?.movementSpeed || 1);
        const vx = (dx / distance) * agent.speed * speedMultiplier;
        const vy = (dy / distance) * agent.speed * speedMultiplier;

        // Wacky Jitter
        let jitterX = 0;
        let jitterY = 0;
        if (wackyFactor > 5 && Math.random() < (wackyFactor / 100)) {
          jitterX = (Math.random() - 0.5) * wackyFactor * 2;
          jitterY = (Math.random() - 0.5) * wackyFactor * 2;
        }

        // Collision detection with obstacles
        const isColliding = (x: number, y: number) => {
          return objects.some(obj => {
            if (obj.type !== 'obstacle1' && obj.type !== 'obstacle2' && obj.type !== 'obstacle') return false;
            // Simple rect-circle check (using agent radius 10)
            const radius = 10;
            return x + radius > obj.x && x - radius < obj.x + obj.width &&
                   y + radius > obj.y && y - radius < obj.y + obj.height;
          });
        };

        let nextX = agent.x + vx + jitterX;
        let nextY = agent.y + vy + jitterY;

        if (isColliding(nextX, nextY)) {
          // Try sliding along X
          if (!isColliding(nextX, agent.y)) {
            nextY = agent.y;
          } 
          // Try sliding along Y
          else if (!isColliding(agent.x, nextY)) {
            nextX = agent.x;
          }
          // Both blocked, don't move
          else {
            nextX = agent.x;
            nextY = agent.y;
          }
        }

        return {
          ...agent,
          x: nextX,
          y: nextY,
          status: 'walking',
          travelTime: (agent.travelTime || 0) + simSecondsPerFrame
        };
      }));
    }, 16);

    return () => clearInterval(interval);
  }, [isRunning, objects, wackyFactor, timeDilation, agents, heatmapMax, envFactors]);

  const spawnAgent = async (role: AgentRole, isAI = false) => {
    const entrance = objects.find(o => o.type === 'entrance') || objects[0];
    if (!entrance) return;

    let persona = {
      name: `${role.charAt(0).toUpperCase() + role.slice(1)} ${agents.length + 1}`,
      color: role === 'participant' ? '#3b82f6' : role === 'organiser' ? '#ef4444' : '#10b981',
      speed: 1.5 + Math.random(),
      personality: 'Standard',
      wackyBehavior: 'Just doing their job.',
      metrics: {
        activityLevel: role === 'organiser' ? 8 : role === 'staff' ? 5 : 3,
        deskFrequency: role === 'participant' ? 0.7 : 0.2,
        coffeeFrequency: role === 'staff' ? 0.4 : 0.2,
        meetingFrequency: role === 'organiser' ? 0.5 : 0.1,
      }
    };

    if (isAI) {
      setIsGenerating(role);
      try {
        const generated = await generatePersona(role, wackyFactor);
        persona = {
          name: generated.name,
          color: generated.color,
          speed: generated.speed,
          personality: generated.personality,
          wackyBehavior: generated.wackyBehavior,
          metrics: generated.metrics
        };
      } catch (error) {
        console.error("Failed to generate persona", error);
      } finally {
        setIsGenerating(null);
      }
    }

    const newAgent: Agent = {
      id: Math.random().toString(36).substr(2, 9),
      role,
      ...persona,
      x: entrance.x + entrance.width / 2,
      y: entrance.y + entrance.height / 2,
      targetX: entrance.x + entrance.width / 2,
      targetY: entrance.y + entrance.height / 2,
      currentGoalId: entrance.id,
      status: 'walking',
      waitTime: 0,
      travelTime: 0
    };
    setAgents(prev => [...prev, newAgent]);
  };

  const addObject = (type: ObjectType) => {
    const config = {
      desk: { width: 80, height: 50, color: '#3b82f6', label: 'Desk' },
      coffee: { width: 60, height: 60, color: '#f59e0b', label: 'Coffee' },
      meeting: { width: 150, height: 100, color: '#8b5cf6', label: 'Meeting' },
      entrance: { width: 60, height: 40, color: '#10b981', label: 'Entrance' },
      printer: { width: 40, height: 40, color: '#64748b', label: 'Printer' },
      obstacle1: { width: 100, height: 20, color: '#ef4444', label: 'Wall-H' },
      obstacle2: { width: 20, height: 100, color: '#ef4444', label: 'Wall-V' },
      toilet: { width: 50, height: 50, color: '#06b6d4', label: 'Toilet' },
      pizza: { width: 60, height: 60, color: '#f97316', label: 'Pizza' },
      atrium: { width: 250, height: 150, color: '#ec4899', label: 'Atrium' },
      pod: { width: 50, height: 50, color: '#6366f1', label: 'Pod' },
    }[type];

    const newObj: SpaceObject = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      ...config
    };
    setObjects(prev => [...prev, newObj]);
  };

  const deleteObject = (id: string) => {
    setObjects(prev => prev.filter(o => o.id !== id));
  };

  const formatSimTime = (totalSeconds: number) => {
    const [startH, startM] = startTime.split(':').map(Number);
    const startTotalSeconds = (startH * 3600) + (startM * 60);
    const currentTotalSeconds = (startTotalSeconds + totalSeconds) % (24 * 3600);
    
    const h = Math.floor(currentTotalSeconds / 3600);
    const m = Math.floor((currentTotalSeconds % 3600) / 60);
    const s = Math.floor(currentTotalSeconds % 60);
    
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    
    return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} ${ampm}`;
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setAgents([]);
    setSimulatedSeconds(0);
    setAnalysis(null);
    setObjectUsage({});
    setHeatmapMax(1);
    const rows = Math.ceil(dimensions.height / 20);
    const cols = Math.ceil(dimensions.width / 20);
    setHeatmapData(Array(rows).fill(0).map(() => Array(cols).fill(0)));
  };

  const runVibeCheck = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSpace(objects, agents.length, objectUsage);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBehavior = async () => {
    if (!behaviorInput.trim()) return;
    setIsAnalyzingBehavior(true);
    try {
      const modifiers = await analyzeHackathonBehavior(behaviorInput);
      setHackathonBehavior({
        description: behaviorInput,
        modifiers
      });
    } catch (error) {
      console.error("Failed to analyze behavior", error);
    } finally {
      setIsAnalyzingBehavior(false);
    }
  };

  const saveAsScenario = (slot: 'A' | 'B') => {
    const travelMetrics: Record<AgentRole, number> = {
      participant: 0,
      organiser: 0,
      staff: 0
    };
    agents.forEach(a => {
      travelMetrics[a.role] += a.travelTime;
    });

    const report: ScenarioReport = {
      name: `Scenario ${slot}`,
      timestamp: Date.now(),
      totalAgents: agents.length,
      activeTime: simulatedSeconds,
      objectCount: objects.length,
      objectUsage: { ...objectUsage },
      travelMetrics,
      objects: [...objects]
    };
    if (slot === 'A') setScenarioA(report);
    else setScenarioB(report);
  };

  const handleDigitize = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDigitizing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const detectedObjects = await digitizeLayout(base64);
        
        const newObjects: SpaceObject[] = detectedObjects.map((obj: any, index: number) => {
          const type = obj.type as ObjectType;
          let width = 60, height = 50;
          let color = '#3b82f6';

          switch (type) {
            case 'desk': width = 80; height = 50; color = '#3b82f6'; break;
            case 'coffee': width = 60; height = 60; color = '#f59e0b'; break;
            case 'meeting': width = 150; height = 100; color = '#8b5cf6'; break;
            case 'entrance': width = 60; height = 40; color = '#10b981'; break;
            case 'printer': width = 50; height = 50; color = '#64748b'; break;
            case 'toilet': width = 60; height = 60; color = '#ec4899'; break;
            case 'pizza': width = 60; height = 60; color = '#f97316'; break;
            case 'atrium': width = 250; height = 150; color = '#ec4899'; break;
            case 'pod': width = 50; height = 50; color = '#6366f1'; break;
            case 'obstacle1': width = 60; height = 10; color = '#141414'; break;
            case 'obstacle2': width = 10; height = 60; color = '#141414'; break;
          }

          return {
            id: `digitized-${index}-${Date.now()}`,
            type,
            x: obj.x,
            y: obj.y,
            width,
            height,
            label: obj.label || type.charAt(0).toUpperCase() + type.slice(1),
            color
          };
        });

        if (newObjects.length > 0) {
          setObjects(newObjects);
          setSimulatedSeconds(0);
          setObjectUsage({});
          setAgents([]);
          setIsRunning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Digitization failed", error);
    } finally {
      setIsDigitizing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    // Update mouse position for the UI card (relative to viewport)
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setMousePos({
        x: containerRect.left + pointerPos.x,
        y: containerRect.top + pointerPos.y
      });
    }

    // Find agent under mouse
    const hovered = agents.find(agent => {
      const dx = agent.x - pointerPos.x;
      const dy = agent.y - pointerPos.y;
      return Math.sqrt(dx * dx + dy * dy) < 15; // Detection radius
    });

    setHoveredAgentId(hovered?.id || null);
  };

  const hoveredAgent = agents.find(a => a.id === hoveredAgentId);

  return (
    <div className="flex h-screen w-full bg-[#E4E3E0] text-[#141414] font-sans">
      {/* Detailed Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#141414]/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#E4E3E0] w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[#141414]/10">
            <div className="p-6 border-b border-[#141414]/10 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-serif italic text-2xl">Space Utilization Report</h3>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Generated at {new Date().toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={() => setShowReport(false)}
                className="p-2 hover:bg-stone-100 rounded-full transition-all"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-[#141414]/5">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">Total Agents</p>
                  <p className="text-2xl font-serif">{agents.length}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#141414]/5">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">Active Time</p>
                  <p className="text-2xl font-serif">{(simulatedSeconds / 60).toFixed(1)}m</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-[#141414]/5">
                  <p className="text-[10px] uppercase font-bold opacity-40 mb-1">Space Objects</p>
                  <p className="text-2xl font-serif">{objects.length}</p>
                </div>
              </div>

              {/* AI Diagnosis */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40">AI Diagnosis & Recommendations</h4>
                </div>
                <div className="p-5 bg-[#141414] text-white rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles className="w-12 h-12" />
                  </div>
                  {analysis ? (
                    <p className="text-sm leading-relaxed italic font-medium relative z-10">
                      "{analysis}"
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-4 opacity-50">
                      <p className="text-xs">No analysis generated yet.</p>
                      <button 
                        onClick={runVibeCheck}
                        disabled={isAnalyzing}
                        className="px-4 py-2 bg-white text-[#141414] rounded-lg text-[10px] font-bold uppercase flex items-center gap-2"
                      >
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquareQuote className="w-3 h-3" />}
                        Generate Analysis
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* A/B Test Scenarios */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40">A/B Testing Scenarios</h4>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(
                    "p-4 rounded-xl border transition-all",
                    scenarioA ? "bg-blue-50 border-blue-200" : "bg-white border-[#141414]/5"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] uppercase font-bold opacity-40">Scenario A</p>
                      {scenarioA && <span className="text-[8px] opacity-40">{new Date(scenarioA.timestamp).toLocaleTimeString()}</span>}
                    </div>
                    {scenarioA ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{scenarioA.totalAgents} Agents • {(scenarioA.activeTime / 60).toFixed(1)}m</p>
                        <button 
                          onClick={() => saveAsScenario('A')}
                          className="text-[9px] font-bold uppercase text-blue-600 hover:underline"
                        >
                          Overwrite Current
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => saveAsScenario('A')}
                        className="w-full py-2 border-2 border-dashed border-[#141414]/10 rounded-lg text-[9px] font-bold uppercase opacity-40 hover:opacity-100 hover:border-[#141414]/20 transition-all"
                      >
                        Save Current as A
                      </button>
                    )}
                  </div>

                  <div className={cn(
                    "p-4 rounded-xl border transition-all",
                    scenarioB ? "bg-purple-50 border-purple-200" : "bg-white border-[#141414]/5"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[10px] uppercase font-bold opacity-40">Scenario B</p>
                      {scenarioB && <span className="text-[8px] opacity-40">{new Date(scenarioB.timestamp).toLocaleTimeString()}</span>}
                    </div>
                    {scenarioB ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold">{scenarioB.totalAgents} Agents • {(scenarioB.activeTime / 60).toFixed(1)}m</p>
                        <button 
                          onClick={() => saveAsScenario('B')}
                          className="text-[9px] font-bold uppercase text-purple-600 hover:underline"
                        >
                          Overwrite Current
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => saveAsScenario('B')}
                        className="w-full py-2 border-2 border-dashed border-[#141414]/10 rounded-lg text-[9px] font-bold uppercase opacity-40 hover:opacity-100 hover:border-[#141414]/20 transition-all"
                      >
                        Save Current as B
                      </button>
                    )}
                  </div>
                </div>

                {scenarioA && scenarioB && (
                  <div className="p-4 bg-stone-100 rounded-xl border border-[#141414]/10 space-y-4">
                    <div className="flex items-center gap-2">
                      <Scale className="w-3 h-3" />
                      <p className="text-[10px] uppercase font-bold tracking-widest">Comparison Delta (A → B)</p>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Agents', valA: scenarioA.totalAgents, valB: scenarioB.totalAgents },
                        { label: 'Time', valA: scenarioA.activeTime, valB: scenarioB.activeTime },
                        { label: 'Objects', valA: scenarioA.objectCount, valB: scenarioB.objectCount },
                        { label: 'Travel', 
                          valA: Object.values(scenarioA.travelMetrics || {}).reduce((a: number, b: number) => a + b, 0) / (scenarioA.totalAgents || 1), 
                          valB: Object.values(scenarioB.travelMetrics || {}).reduce((a: number, b: number) => a + b, 0) / (scenarioB.totalAgents || 1) 
                        },
                      ].map(stat => {
                        const delta = stat.valA === 0 ? 0 : ((stat.valB - stat.valA) / stat.valA) * 100;
                        const isPositive = delta > 0;
                        const isZero = delta === 0;
                        return (
                          <div key={stat.label}>
                            <p className="text-[9px] uppercase font-bold opacity-40 mb-1">{stat.label}</p>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-mono font-bold">{delta.toFixed(1)}%</span>
                              {!isZero && (
                                isPositive 
                                  ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> 
                                  : <ArrowDownRight className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Metrics Table */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40">Travel Time by Persona</h4>
                <div className="grid grid-cols-3 gap-4">
                  {['participant', 'organiser', 'staff'].map(role => {
                    const roleAgents = agents.filter(a => a.role === role);
                    const totalTravel = roleAgents.reduce((acc, a) => acc + a.travelTime, 0);
                    const avgTravel = roleAgents.length > 0 ? totalTravel / roleAgents.length : 0;
                    return (
                      <div key={role} className="p-4 bg-white rounded-xl border border-[#141414]/5">
                        <p className="text-[9px] uppercase font-bold opacity-40 mb-1">{role}</p>
                        <p className="text-lg font-serif">{(avgTravel / 60).toFixed(1)}m <span className="text-[10px] opacity-40 font-sans italic">avg</span></p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Metrics Table */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold tracking-widest opacity-40">Space Usage Metrics</h4>
                <div className="bg-white rounded-xl border border-[#141414]/5 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-50 border-bottom border-[#141414]/5">
                        <th className="p-3 font-bold uppercase tracking-tighter opacity-40">Space</th>
                        <th className="p-3 font-bold uppercase tracking-tighter opacity-40">Total Occupancy</th>
                        <th className="p-3 font-bold uppercase tracking-tighter opacity-40">Visits</th>
                        <th className="p-3 font-bold uppercase tracking-tighter opacity-40">Avg. Time/Person</th>
                      </tr>
                    </thead>
                    <tbody>
                      {objects.filter(o => !['entrance', 'obstacle', 'obstacle1', 'obstacle2'].includes(o.type)).map(obj => {
                        const usage = objectUsage[obj.id] || { totalTime: 0, visitCount: 0 };
                        const avgTime = usage.visitCount > 0 
                          ? (usage.totalTime / usage.visitCount).toFixed(1)
                          : "0.0";
                        return (
                          <tr key={obj.id} className="border-t border-[#141414]/5 hover:bg-stone-50 transition-colors">
                            <td className="p-3 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: obj.color }} />
                              <span className="font-bold uppercase tracking-tighter">{obj.label}</span>
                            </td>
                            <td className="p-3 font-mono">{(usage.totalTime / 60).toFixed(1)}m</td>
                            <td className="p-3 font-mono">{usage.visitCount}</td>
                            <td className="p-3 font-mono">{avgTime}s</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-white border-t border-[#141414]/10 text-right">
              <button 
                onClick={() => setShowReport(false)}
                className="px-6 py-2 bg-[#141414] text-white rounded-lg font-bold text-xs uppercase hover:bg-black transition-all"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-80 border-r border-[#141414] bg-white flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-[#141414]">
          <h1 className="text-2xl font-serif italic font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            VibeSpace
          </h1>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 mt-1 font-bold">Hackathon Traffic Sim</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Controls */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Simulation Controls</h2>
              <div className="text-right">
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Current Time ({timeDilation}x)</p>
                <p className="text-xl font-mono font-bold tabular-nums">{formatSimTime(simulatedSeconds)}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsRunning(!isRunning)}
                disabled={simulatedSeconds >= 28800}
                className={cn(
                  "flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all font-bold text-sm",
                  isRunning ? "bg-red-50 text-red-600 border border-red-200" : "bg-emerald-50 text-emerald-600 border border-emerald-200",
                  simulatedSeconds >= 28800 && "opacity-50 cursor-not-allowed"
                )}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isRunning ? "Stop" : simulatedSeconds >= 28800 ? "Finished" : "Start"}
              </button>
              <button 
                onClick={resetSimulation}
                className="px-4 bg-white border border-[#141414] rounded-xl hover:bg-red-500 hover:text-white transition-all"
                title="Reset Simulation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </section>
            
          {/* Persona Spawning */}
          <section className="space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Add Personas</h2>
            <div className="space-y-2">
              {/* Participant */}
              <div className="flex gap-2">
                <button 
                  onClick={() => spawnAgent('participant', false)}
                  className="flex-1 py-2 border border-[#141414] rounded-lg flex items-center justify-center gap-2 hover:bg-stone-100 transition-all font-bold text-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Participant
                </button>
                <button 
                  onClick={() => spawnAgent('participant', true)}
                  disabled={!!isGenerating}
                  className="px-3 bg-[#141414] text-white rounded-lg flex items-center justify-center hover:bg-blue-500 transition-all disabled:opacity-50"
                  title="AI Participant"
                >
                  {isGenerating === 'participant' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Organiser */}
              <div className="flex gap-2">
                <button 
                  onClick={() => spawnAgent('organiser', false)}
                  className="flex-1 py-2 border border-[#141414] rounded-lg flex items-center justify-center gap-2 hover:bg-stone-100 transition-all font-bold text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Organiser
                </button>
                <button 
                  onClick={() => spawnAgent('organiser', true)}
                  disabled={!!isGenerating}
                  className="px-3 bg-[#141414] text-white rounded-lg flex items-center justify-center hover:bg-red-500 transition-all disabled:opacity-50"
                  title="AI Organiser"
                >
                  {isGenerating === 'organiser' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Staff */}
              <div className="flex gap-2">
                <button 
                  onClick={() => spawnAgent('staff', false)}
                  className="flex-1 py-2 border border-[#141414] rounded-lg flex items-center justify-center gap-2 hover:bg-stone-100 transition-all font-bold text-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Space Staff
                </button>
                <button 
                  onClick={() => spawnAgent('staff', true)}
                  disabled={!!isGenerating}
                  className="px-3 bg-[#141414] text-white rounded-lg flex items-center justify-center hover:bg-emerald-500 transition-all disabled:opacity-50"
                  title="AI Staff"
                >
                  {isGenerating === 'staff' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </section>

          {/* Location & Environment */}
          <section className="space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Location & Time</h2>
            <div className="space-y-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40" />
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Enter location..."
                  className="w-full pl-8 pr-3 py-2 bg-stone-100 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-[#141414]/20"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Play className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 rotate-90" />
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-stone-100 border-none rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-[#141414]/20"
                  />
                </div>
                <button 
                  onClick={updateEnvironment}
                  disabled={isUpdatingEnv}
                  className="px-4 bg-[#141414] text-white rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center"
                >
                  {isUpdatingEnv ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudSun className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {envFactors && (
              <div className="p-3 bg-stone-100 rounded-xl space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[8px] opacity-40 uppercase font-bold tracking-tighter">Current Vibe</p>
                    <p className="text-[10px] font-bold">{envFactors.weatherVibe}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] opacity-40 uppercase font-bold tracking-tighter">Location</p>
                    <p className="text-[10px] font-bold truncate max-w-[80px]">{envFactors.locationName}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-[#141414]/5">
                  <p className="text-[9px] italic leading-tight opacity-70">"{envFactors.localContext}"</p>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-2">
                  {[
                    { label: 'Coffee', val: envFactors.modifiers.coffeeDesire },
                    { label: 'Speed', val: envFactors.modifiers.movementSpeed },
                    { label: 'Social', val: envFactors.modifiers.socialProbability },
                  ].map(mod => (
                    <div key={mod.label} className="text-center p-1 bg-white rounded-md border border-[#141414]/5">
                      <p className="text-[7px] opacity-40 uppercase font-bold">{mod.label}</p>
                      <p className={cn(
                        "text-[9px] font-mono font-bold",
                        mod.val > 1 ? "text-emerald-600" : mod.val < 1 ? "text-amber-600" : "text-stone-400"
                      )}>
                        {mod.val > 1 ? '+' : ''}{((mod.val - 1) * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Simulation Speed */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Time Dilation</h2>
              <span className="font-mono text-sm font-bold">{timeDilation}x</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="480" 
              value={timeDilation}
              onChange={(e) => setTimeDilation(parseInt(e.target.value))}
              className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#141414]"
            />
            <p className="text-[9px] opacity-50 italic">
              {timeDilation === 480 ? "8 hours in 1 minute" : `${timeDilation}x real-time speed`}
            </p>
          </section>

          {/* Wacky Factor */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Wacky Factor</h2>
              <span className="font-mono text-sm font-bold">{wackyFactor}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={wackyFactor}
              onChange={(e) => setWackyFactor(parseInt(e.target.value))}
              className="w-full h-1 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-[#141414]"
            />
          </section>

          {/* Hackathon Behavior */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Hackathon Behavior</h2>
              <BrainCircuit className="w-3 h-3 opacity-40" />
            </div>
            <div className="space-y-2">
              <textarea
                value={behaviorInput}
                onChange={(e) => setBehaviorInput(e.target.value)}
                placeholder="Describe the hackathon vibe... (e.g., 'Final 2 hours, everyone is rushing for pizza and desks are full of energy')"
                className="w-full h-24 p-3 bg-white border border-[#141414]/10 rounded-xl text-xs focus:outline-none focus:border-[#141414] transition-all resize-none"
              />
              <p className="text-[9px] opacity-50 italic leading-tight">
                Prompt: How active are the participants? Is there a higher preference for desks, meeting rooms, or pods?
              </p>
              <button
                onClick={handleApplyBehavior}
                disabled={isAnalyzingBehavior || !behaviorInput.trim()}
                className="w-full py-2 bg-[#141414] text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#141414]/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAnalyzingBehavior ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Apply AI Behavior
              </button>
            </div>
            {hackathonBehavior && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                  <span className="text-[9px] font-bold text-indigo-900 uppercase tracking-tight">AI Modifiers Active</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(hackathonBehavior.modifiers.participant).slice(0, 4).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span className="text-[8px] opacity-60 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={cn(
                        "text-[8px] font-mono font-bold",
                        val > 1 ? "text-emerald-600" : val < 1 ? "text-rose-600" : "text-stone-400"
                      )}>
                        {val > 1 ? '+' : ''}{((val - 1) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Vibe Check */}
          <section className="space-y-4">
            <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">AI Insights</h2>
            <button 
              onClick={runVibeCheck}
              disabled={isAnalyzing}
              className="w-full py-3 border-2 border-dashed border-[#141414]/20 rounded-xl flex items-center justify-center gap-2 hover:border-[#141414] hover:bg-stone-50 transition-all font-bold text-sm disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareQuote className="w-4 h-4" />}
              Run Vibe Check
            </button>
            
            {analysis && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs italic leading-relaxed text-amber-900 animate-in fade-in slide-in-from-top-2">
                "{analysis}"
              </div>
            )}
          </section>

          {/* Analytics */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Analytics</h2>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowReport(true)}
                  className="px-2 py-1 rounded-md bg-stone-200 text-[#141414]/40 hover:text-[#141414] transition-all text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1"
                >
                  <Briefcase className="w-3 h-3" />
                  Full Report
                </button>
                <button 
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  className={cn(
                    "px-2 py-1 rounded-md transition-all text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1",
                    showHeatmap ? "bg-[#141414] text-white" : "bg-stone-200 text-[#141414]/40 hover:text-[#141414]"
                  )}
                >
                  <Sparkles className="w-3 h-3" />
                  Heatmap
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
              {objects.filter(o => !['entrance', 'obstacle', 'obstacle1', 'obstacle2'].includes(o.type)).map(obj => {
                const usage = objectUsage[obj.id] || { totalTime: 0, visitCount: 0 };
                const avgAgents = simulatedSeconds > 0 
                  ? (usage.totalTime / simulatedSeconds).toFixed(2)
                  : "0.00";
                return (
                  <div key={obj.id} className="flex justify-between items-center p-2 bg-white/50 rounded-lg border border-[#141414]/5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: obj.color }} />
                      <span className="text-[9px] font-bold uppercase truncate max-w-[80px]">{obj.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] opacity-40 uppercase font-bold leading-none mb-0.5">Avg. Agents</p>
                      <p className="font-mono text-[10px] font-bold leading-none" title="Average number of agents present at this location over the simulation duration">{avgAgents}</p>
                    </div>
                  </div>
                );
              })}
              {objects.filter(o => !['entrance', 'obstacle', 'obstacle1', 'obstacle2'].includes(o.type)).length === 0 && (
                <p className="text-[9px] opacity-40 italic text-center py-4">No interactive objects placed yet.</p>
              )}
            </div>
          </section>

          {/* Object Palette */}
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Space Palette</h2>
              <label className={cn(
                "cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-md transition-all text-[9px] font-bold uppercase tracking-tighter",
                isDigitizing ? "bg-stone-100 text-stone-400" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              )}>
                {isDigitizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Digitize Sketch
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleDigitize}
                  disabled={isDigitizing}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'desk', icon: Monitor, label: 'Desk' },
                { type: 'coffee', icon: Coffee, label: 'Coffee' },
                { type: 'meeting', icon: Users, label: 'Meeting' },
                { type: 'entrance', icon: DoorOpen, label: 'Entrance' },
                { type: 'printer', icon: Settings2, label: 'Printer' },
                { type: 'toilet', icon: Bath, label: 'Toilet' },
                { type: 'pod', icon: Box, label: 'Pod' },
                { type: 'pizza', icon: Pizza, label: 'Pizza' },
                { type: 'atrium', icon: Mic, label: 'Atrium' },
                { type: 'obstacle1', icon: Minus, label: 'Wall-H' },
                { type: 'obstacle2', icon: MoreVertical, label: 'Wall-V' },

              ].map((item) => (
                <button 
                  key={item.type}
                  onClick={() => addObject(item.type as ObjectType)}
                  className="p-3 border border-[#141414]/10 rounded-xl flex flex-col items-center gap-2 hover:bg-[#141414] hover:text-white transition-all group"
                >
                  <item.icon className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="p-6 border-t border-[#141414]/10 bg-stone-50">
          <div className="flex items-center justify-between text-xs">
            <span className="opacity-50 font-bold uppercase tracking-tighter">Active Agents</span>
            <span className="font-mono font-bold bg-[#141414] text-white px-2 py-0.5 rounded">{agents.length}</span>
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 relative overflow-hidden" ref={containerRef}>
        <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-xl border border-[#141414]/10 px-6 py-3 rounded-2xl shadow-xl">
          <p className="text-xs font-bold flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            LIVE SIMULATION ENVIRONMENT
          </p>
        </div>

        <div className="absolute bottom-6 right-6 z-10 bg-white/80 backdrop-blur-md border border-[#141414]/10 px-4 py-2 rounded-lg text-[10px] font-bold opacity-50">
          DRAG OBJECTS TO PLAN SPACE • DBL CLICK TO DELETE
        </div>

        {/* Persona Hover Card */}
        {hoveredAgent && (
          <div 
            className="fixed z-50 pointer-events-none transition-all duration-200"
            style={{ 
              left: mousePos.x + 20, 
              top: mousePos.y - 40,
            }}
          >
            <div className="bg-[#141414] text-white p-4 rounded-lg shadow-2xl border border-white/20 w-64 backdrop-blur-md">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-serif italic text-lg leading-tight">{hoveredAgent.name}</h4>
                  <p className="text-[10px] uppercase tracking-wider opacity-60 font-bold">{hoveredAgent.role}</p>
                </div>
                <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-mono">
                  ID: {hoveredAgent.id.slice(0, 4)}
                </div>
              </div>
              
              <p className="text-[11px] leading-relaxed opacity-80 mb-2 font-medium">
                {hoveredAgent.personality}
              </p>
              
              <p className="text-[10px] leading-relaxed opacity-60 mb-4 italic border-l-2 border-white/20 pl-2">
                "{hoveredAgent.wackyBehavior}"
              </p>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-50 uppercase tracking-tighter">Movement Speed</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-1 rounded-full ${i < (hoveredAgent.speed / 5) * 5 ? 'bg-emerald-400' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-50 uppercase tracking-tighter">Social Drive</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-1 rounded-full ${i < (hoveredAgent.metrics.meetingFrequency) * 5 ? 'bg-blue-400' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="opacity-50 uppercase tracking-tighter">Caffeine Dependency</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={`w-2 h-1 rounded-full ${i < (hoveredAgent.metrics.coffeeFrequency) * 5 ? 'bg-orange-400' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${hoveredAgent.status === 'working' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <span className="text-[9px] uppercase font-bold tracking-widest opacity-70">
                  Status: {hoveredAgent.status}
                </span>
              </div>
            </div>
          </div>
        )}

        <Stage 
          width={dimensions.width} 
          height={dimensions.height}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={() => setHoveredAgentId(null)}
        >
          <Layer>
            {/* Grid Lines (Subtle) */}
            {Array.from({ length: Math.ceil(dimensions.width / 50) }).map((_, i) => (
              <Rect key={`v-${i}`} x={i * 50} y={0} width={1} height={dimensions.height} fill="#141414" opacity={0.03} />
            ))}
            {Array.from({ length: Math.ceil(dimensions.height / 50) }).map((_, i) => (
              <Rect key={`h-${i}`} x={0} y={i * 50} width={dimensions.width} height={1} fill="#141414" opacity={0.03} />
            ))}

            {/* Heatmap Layer */}
            {showHeatmap && heatmapData.map((row, i) => 
              row.map((val, j) => {
                if (val === 0) return null;
                const opacity = (val / heatmapMax) * 0.7;
                return (
                  <Rect
                    key={`h-${i}-${j}`}
                    x={j * 20}
                    y={i * 20}
                    width={20}
                    height={20}
                    fill="#ef4444"
                    opacity={opacity}
                    listening={false}
                  />
                );
              })
            )}

            {/* Space Objects */}
            {objects.map((obj) => (
              <Group 
                key={obj.id} 
                x={obj.x} 
                y={obj.y}
                draggable
                onDragEnd={(e) => {
                  setObjects(prev => prev.map(o => o.id === obj.id ? { ...o, x: e.target.x(), y: e.target.y() } : o));
                }}
                onDblClick={() => deleteObject(obj.id)}
              >
                <Rect
                  width={obj.width}
                  height={obj.height}
                  fill={obj.color}
                  stroke="#141414"
                  strokeWidth={2}
                  cornerRadius={12}
                  shadowBlur={isRunning ? 0 : 10}
                  shadowOpacity={0.05}
                />
                <Text
                  text={obj.label}
                  width={obj.width}
                  height={obj.height}
                  align="center"
                  verticalAlign="middle"
                  fontSize={10}
                  fontStyle="bold"
                  fill="#fff"
                  letterSpacing={0.5}
                />
                {(obj.type === 'desk' || obj.type === 'meeting' || obj.type === 'toilet' || obj.type === 'pod') && (
                  <Group x={obj.width - 25} y={-10}>
                    <Rect
                      width={30}
                      height={15}
                      fill="#141414"
                      cornerRadius={4}
                    />
                    <Text
                      text={`${agents.filter(a => a.currentGoalId === obj.id && a.status === 'working').length}/${obj.type === 'desk' ? 4 : obj.type === 'meeting' ? 8 : 1}`}
                      width={30}
                      height={15}
                      align="center"
                      verticalAlign="middle"
                      fontSize={8}
                      fontStyle="bold"
                      fill="#fff"
                    />
                  </Group>
                )}
              </Group>
            ))}

            {/* Agents */}
            {agents.map((agent) => (
              <Group key={agent.id} x={agent.x} y={agent.y}>
                <Circle
                  radius={10}
                  fill={agent.color}
                  stroke="#141414"
                  strokeWidth={2}
                  shadowBlur={5}
                  shadowOpacity={0.1}
                />
                {/* Role Indicator */}
                <Text
                  text={agent.role === 'participant' ? 'P' : agent.role === 'organiser' ? 'O' : 'S'}
                  x={-4}
                  y={-4}
                  fontSize={8}
                  fontStyle="bold"
                  fill="white"
                />
                {/* Status Indicator */}
                {agent.status === 'working' && (
                  <Circle
                    radius={3}
                    fill="#10b981"
                    x={8}
                    y={-8}
                    stroke="white"
                    strokeWidth={1}
                  />
                )}
              </Group>
            ))}
          </Layer>
        </Stage>
      </main>
    </div>
  );
}
