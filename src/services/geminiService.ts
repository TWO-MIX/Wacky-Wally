/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GeneratedPersona {
  name: string;
  color: string;
  speed: number;
  personality: string;
  wackyBehavior: string;
  metrics: {
    activityLevel: number;
    deskFrequency: number;
    coffeeFrequency: number;
    meetingFrequency: number;
  };
}

export const generatePersona = async (role: 'participant' | 'organiser' | 'staff', wackyFactor: number): Promise<GeneratedPersona> => {
  const ai = getAI();
  const roleContext = {
    participant: "a hackathon participant (focused on coding, needs coffee, occasionally joins meetings)",
    organiser: "a hackathon organiser (high energy, moves constantly, checks on everyone, rarely sits at a desk)",
    staff: "co-working space staff (helpful, stays near entrance or coffee, keeps things tidy)"
  }[role];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a wacky office persona for a human traffic simulation. 
    Role: ${roleContext}.
    Wackiness level: ${wackyFactor}/10. 
    Return a JSON object with: 
    - name: string
    - color: hex string
    - speed: number (1.0 to 5.0)
    - personality: string
    - wackyBehavior: string
    - metrics: object with activityLevel (1-10), deskFrequency (0-1), coffeeFrequency (0-1), meetingFrequency (0-1).
    Frequencies should sum to roughly 1.0.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          color: { type: Type.STRING },
          speed: { type: Type.NUMBER },
          personality: { type: Type.STRING },
          wackyBehavior: { type: Type.STRING },
          metrics: {
            type: Type.OBJECT,
            properties: {
              activityLevel: { type: Type.NUMBER },
              deskFrequency: { type: Type.NUMBER },
              coffeeFrequency: { type: Type.NUMBER },
              meetingFrequency: { type: Type.NUMBER },
            },
            required: ["activityLevel", "deskFrequency", "coffeeFrequency", "meetingFrequency"],
          },
        },
        required: ["name", "color", "speed", "personality", "wackyBehavior", "metrics"],
      },
    },
  });
  return JSON.parse(response.text);
};

export interface EnvironmentalFactors {
  weatherVibe: string;
  localContext: string;
  modifiers: {
    coffeeDesire: number; // multiplier
    movementSpeed: number; // multiplier
    socialProbability: number; // multiplier
  };
  locationName: string;
}

export const getEnvironmentalFactors = async (location: string, startTime: string): Promise<EnvironmentalFactors> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the current environment and local context for this location: ${location}. 
      The simulation starts at ${startTime} and runs for 8 hours.
      Consider things like current weather, time of day (starting at ${startTime}), and local culture.
      How would this affect people working in an office?
      
      Return a JSON object with:
      - weatherVibe: a short description of the weather/vibe (e.g., "Rainy and cozy", "Sunny and energetic")
      - localContext: a fun fact or local detail (e.g., "Nearby coffee shops are busy", "It's siesta time")
      - modifiers: object with coffeeDesire (0.5 to 2.0), movementSpeed (0.5 to 1.5), socialProbability (0.5 to 1.5)
      - locationName: the confirmed name of the location.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("Failed to get environmental factors", error);
  }
  
  return {
    weatherVibe: "Neutral",
    localContext: "Standard office day.",
    modifiers: { coffeeDesire: 1, movementSpeed: 1, socialProbability: 1 },
    locationName: location
  };
};

export const analyzeSpace = async (objects: any[], stats: any): Promise<string> => {
  const ai = getAI();
  const { agentCount, usage, totalTravelTime, totalActiveTime, simulatedSeconds } = stats;

  if (!agentCount || agentCount === 0) {
    return "The simulation needs active agents to generate a vibe report. Try spawning some participants first!";
  }

  if (simulatedSeconds < 300) {
    return "The simulation hasn't run long enough to gather meaningful data. Let it run for at least 5 simulated minutes!";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a high-end spatial consultant and data scientist specializing in hackathon logistics. Analyze this office layout and simulation data:
      
      LAYOUT: ${JSON.stringify(objects.map(o => ({ type: o.type, label: o.label, x: o.x, y: o.y })))}
      AGENTS: ${agentCount}
      SIMULATION TIME: ${Math.floor(simulatedSeconds / 60)} minutes
      USAGE DATA (total seconds occupied and visit counts): ${JSON.stringify(usage)}
      TOTAL TRAVEL TIME: ${Math.floor(totalTravelTime)} seconds
      TOTAL ACTIVE TIME (Time spent at objects): ${Math.floor(totalActiveTime)} seconds
      
      Provide a detailed and intelligent diagnosis. Your report must include:
      1. OCCUPANCY ANALYSIS: How well are the objects being utilized? Are some objects over-capacity or under-utilized?
      2. SPATIAL EFFICIENCY: Analyze the ratio of Travel Time to Active Time. If travel time is high, suggests the layout is inefficient.
      3. ACTIONABLE RECOMMENDATIONS: Specific advice on adding or removing objects to optimize flow and occupancy.
      4. BOTTLENECK IDENTIFICATION: Where are people getting stuck or waiting too long?
      
      Keep the tone professional, insightful, and slightly witty. Use Markdown for formatting.`,
    });

    return response.text || "The vibe is... inconclusive.";
  } catch (error) {
    console.error("Spatial Analysis Error:", error);
    return "The vibe is... inconclusive.";
  }
};

export const digitizeLayout = async (base64Image: string): Promise<any[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/png",
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: `Analyze this floor plan sketch or image. 
          Identify office objects and their relative positions. 
          The canvas size is 800x600. 
          Return a JSON array of objects, where each object has:
          - type: one of ['desk', 'coffee', 'meeting', 'entrance', 'printer', 'toilet', 'obstacle1', 'obstacle2', 'pizza', 'atrium', 'pod', 'stage']
          - x: number (0-800)
          - y: number (0-600)
          - label: string (short name)
          
          Important: 
          - 'obstacle1' is a horizontal wall (width 60, height 10).
          - 'obstacle2' is a vertical wall (width 10, height 60).
          - 'entrance' is where people start.
          - 'pizza' is a food station.
          - 'atrium' is a large presentation area.
          - 'pod' is a private work booth (max 1 pax).
          - Try to be as accurate as possible to the sketch.`,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              label: { type: Type.STRING },
            },
            required: ["type", "x", "y", "label"],
          },
        },
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to digitize layout", error);
    return [];
  }
};

export const analyzeHackathonBehavior = async (description: string): Promise<any> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this hackathon behavior description: "${description}".
      How would this impact different personas in the office?
      Personas:
      - participant: Focused on coding, high coffee needs, occasionally social.
      - organiser: High energy, constantly moving, social.
      - staff: Helpful, stays near entrance/coffee.
      
      Return a JSON object where keys are 'participant', 'organiser', 'staff'.
      Each value is an object with multipliers (1.0 is neutral):
      - activityLevel: (0.5 to 3.0)
      - movementSpeed: (0.5 to 2.0)
      - deskPreference: (0.1 to 5.0)
      - meetingPreference: (0.1 to 5.0)
      - podPreference: (0.1 to 5.0)
      - pizzaPreference: (0.1 to 10.0)
      
      Example: If it's "Final 2 hours of hackathon", participants might have very high activityLevel and pizzaPreference, but low deskPreference as they scramble.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            participant: {
              type: Type.OBJECT,
              properties: {
                activityLevel: { type: Type.NUMBER },
                movementSpeed: { type: Type.NUMBER },
                deskPreference: { type: Type.NUMBER },
                meetingPreference: { type: Type.NUMBER },
                podPreference: { type: Type.NUMBER },
                pizzaPreference: { type: Type.NUMBER },
              },
              required: ["activityLevel", "movementSpeed", "deskPreference", "meetingPreference", "podPreference", "pizzaPreference"],
            },
            organiser: {
              type: Type.OBJECT,
              properties: {
                activityLevel: { type: Type.NUMBER },
                movementSpeed: { type: Type.NUMBER },
                deskPreference: { type: Type.NUMBER },
                meetingPreference: { type: Type.NUMBER },
                podPreference: { type: Type.NUMBER },
                pizzaPreference: { type: Type.NUMBER },
              },
              required: ["activityLevel", "movementSpeed", "deskPreference", "meetingPreference", "podPreference", "pizzaPreference"],
            },
            staff: {
              type: Type.OBJECT,
              properties: {
                activityLevel: { type: Type.NUMBER },
                movementSpeed: { type: Type.NUMBER },
                deskPreference: { type: Type.NUMBER },
                meetingPreference: { type: Type.NUMBER },
                podPreference: { type: Type.NUMBER },
                pizzaPreference: { type: Type.NUMBER },
              },
              required: ["activityLevel", "movementSpeed", "deskPreference", "meetingPreference", "podPreference", "pizzaPreference"],
            },
          },
          required: ["participant", "organiser", "staff"],
        },
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to analyze hackathon behavior", error);
    return null;
  }
};
