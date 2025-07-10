/**
 * A2A Agent Registry
 * 
 * Manages connected agents with cybernetic governance
 * Implements PSRLV pattern for agent lifecycle management
 */

import * as winston from 'winston';
import type { A2AAgentCard, IA2AAgentRegistry } from '@cyreal/core';

interface RegisteredAgent {
  agentCard: A2AAgentCard;
  token: string;
  registeredAt: Date;
  lastHeartbeat: Date;
  connectionCount: number;
}

export class AgentRegistry implements IA2AAgentRegistry {
  private agents: Map<string, RegisteredAgent> = new Map();
  private logger: winston.Logger;
  private agentTimeout: number;

  constructor(logger: winston.Logger, agentTimeout: number = 120000) {
    this.logger = logger;
    this.agentTimeout = agentTimeout;
  }

  /**
   * Register a new agent
   */
  public async registerAgent(agentCard: A2AAgentCard, token: string): Promise<void> {
    const existingAgent = this.agents.get(agentCard.agentId);
    
    if (existingAgent) {
      // Update existing agent
      existingAgent.agentCard = agentCard;
      existingAgent.token = token;
      existingAgent.lastHeartbeat = new Date();
      existingAgent.connectionCount++;
      
      this.logger.info('Agent re-registered', {
        agentId: agentCard.agentId,
        name: agentCard.name,
        connectionCount: existingAgent.connectionCount
      });
    } else {
      // Register new agent
      const registeredAgent: RegisteredAgent = {
        agentCard,
        token,
        registeredAt: new Date(),
        lastHeartbeat: new Date(),
        connectionCount: 1
      };
      
      this.agents.set(agentCard.agentId, registeredAgent);
      
      this.logger.info('New agent registered', {
        agentId: agentCard.agentId,
        name: agentCard.name,
        capabilities: agentCard.capabilities.length,
        endpoints: agentCard.endpoints.length
      });
    }
  }

  /**
   * Unregister an agent
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.logger.info('Agent unregistered', {
        agentId,
        name: agent.agentCard.name,
        sessionDuration: Date.now() - agent.registeredAt.getTime()
      });
    }
  }

  /**
   * Get all registered agents
   */
  public async getAgents(): Promise<A2AAgentCard[]> {
    return Array.from(this.agents.values()).map(agent => agent.agentCard);
  }

  /**
   * Find agents by capability
   */
  public async findAgentsByCapability(capability: string): Promise<A2AAgentCard[]> {
    const matchingAgents: A2AAgentCard[] = [];
    
    for (const registeredAgent of this.agents.values()) {
      const hasCapability = registeredAgent.agentCard.capabilities.some(
        cap => cap.id === capability || cap.name.toLowerCase().includes(capability.toLowerCase())
      );
      
      if (hasCapability) {
        matchingAgents.push(registeredAgent.agentCard);
      }
    }
    
    this.logger.debug('Capability search completed', {
      capability,
      matchingAgents: matchingAgents.length,
      totalAgents: this.agents.size
    });
    
    return matchingAgents;
  }

  /**
   * Get agent by ID
   */
  public async getAgent(agentId: string): Promise<A2AAgentCard | null> {
    const agent = this.agents.get(agentId);
    return agent ? agent.agentCard : null;
  }

  /**
   * Update agent heartbeat
   */
  public async updateHeartbeat(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = new Date();
      agent.agentCard.lastSeen = new Date();
    }
  }

  /**
   * Cleanup expired agents (cybernetic governance - Validate phase)
   */
  public async cleanupExpiredAgents(): Promise<string[]> {
    const expiredAgents: string[] = [];
    const now = Date.now();
    
    for (const [agentId, agent] of this.agents.entries()) {
      const timeSinceHeartbeat = now - agent.lastHeartbeat.getTime();
      
      if (timeSinceHeartbeat > this.agentTimeout) {
        expiredAgents.push(agentId);
        this.agents.delete(agentId);
        
        this.logger.warn('Agent expired due to timeout', {
          agentId,
          name: agent.agentCard.name,
          timeoutMs: timeSinceHeartbeat,
          maxTimeoutMs: this.agentTimeout
        });
      }
    }
    
    if (expiredAgents.length > 0) {
      this.logger.info('Agent cleanup completed', {
        expiredCount: expiredAgents.length,
        activeCount: this.agents.size
      });
    }
    
    return expiredAgents;
  }

  /**
   * Get registry statistics for governance
   */
  public getStatistics(): {
    totalAgents: number;
    averageSessionDuration: number;
    capabilityDistribution: Record<string, number>;
    connectionHealth: number;
  } {
    const now = Date.now();
    const agents = Array.from(this.agents.values());
    
    // Calculate average session duration
    const averageSessionDuration = agents.length > 0 
      ? agents.reduce((sum, agent) => sum + (now - agent.registeredAt.getTime()), 0) / agents.length
      : 0;
    
    // Calculate capability distribution
    const capabilityDistribution: Record<string, number> = {};
    agents.forEach(agent => {
      agent.agentCard.capabilities.forEach(cap => {
        capabilityDistribution[cap.category] = (capabilityDistribution[cap.category] || 0) + 1;
      });
    });
    
    // Calculate connection health (percentage of agents with recent heartbeats)
    const healthyAgents = agents.filter(agent => 
      (now - agent.lastHeartbeat.getTime()) < (this.agentTimeout / 2)
    ).length;
    const connectionHealth = agents.length > 0 ? (healthyAgents / agents.length) * 100 : 100;
    
    return {
      totalAgents: agents.length,
      averageSessionDuration,
      capabilityDistribution,
      connectionHealth
    };
  }

  /**
   * Get agent by token (for authentication)
   */
  public async getAgentByToken(token: string): Promise<A2AAgentCard | null> {
    for (const agent of this.agents.values()) {
      if (agent.token === token) {
        return agent.agentCard;
      }
    }
    return null;
  }

  /**
   * Validate agent token
   */
  public async validateToken(agentId: string, token: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    return agent ? agent.token === token : false;
  }

  /**
   * Get agents sorted by reliability score
   */
  public async getAgentsByReliability(): Promise<A2AAgentCard[]> {
    const agents = Array.from(this.agents.values());
    
    // Sort by connection count and session duration (higher = more reliable)
    agents.sort((a, b) => {
      const scoreA = a.connectionCount + (Date.now() - a.registeredAt.getTime()) / 1000;
      const scoreB = b.connectionCount + (Date.now() - b.registeredAt.getTime()) / 1000;
      return scoreB - scoreA;
    });
    
    return agents.map(agent => agent.agentCard);
  }
}