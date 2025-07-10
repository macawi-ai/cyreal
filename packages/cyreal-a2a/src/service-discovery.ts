/**
 * A2A Service Discovery Implementation
 * 
 * Implements agent discovery and announcement using cybernetic principles
 * Integrates with the agent registry for centralized management
 */

import * as winston from 'winston';
import { EventEmitter } from 'events';
import type { A2AAgentCard, IA2AServiceDiscovery, IA2AAgentRegistry } from '@cyreal/core';
import { AgentRegistry } from './agent-registry';

interface DiscoveryConfig {
  broadcastInterval: number;
  agentTimeout: number;
  maxRetries: number;
}

export class ServiceDiscovery extends EventEmitter implements IA2AServiceDiscovery {
  private logger: winston.Logger;
  private registry: IA2AAgentRegistry;
  private config: DiscoveryConfig;
  private isRunning = false;
  private broadcastTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private discoveredAgents: Map<string, { agent: A2AAgentCard; lastSeen: Date }> = new Map();
  private callbacks = {
    discovered: new Set<(agent: A2AAgentCard) => void>(),
    lost: new Set<(agentId: string) => void>()
  };

  constructor(
    logger: winston.Logger, 
    registry: IA2AAgentRegistry,
    config: Partial<DiscoveryConfig> = {}
  ) {
    super();
    this.logger = logger;
    this.registry = registry;
    this.config = {
      broadcastInterval: 30000, // 30 seconds
      agentTimeout: 120000,     // 2 minutes  
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Start service discovery with cybernetic governance
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Service discovery already running');
      return;
    }

    this.logger.info('Starting A2A service discovery', {
      broadcastInterval: this.config.broadcastInterval,
      agentTimeout: this.config.agentTimeout,
      cybernetic: 'PSRLV discovery pattern enabled'
    });

    this.isRunning = true;

    // Start periodic announcement (Probe phase)
    this.broadcastTimer = setInterval(async () => {
      try {
        await this.announce();
      } catch (error) {
        this.logger.error('Error in service announcement:', error);
      }
    }, this.config.broadcastInterval);

    // Start agent cleanup task (Validate phase)
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupLostAgents();
      } catch (error) {
        this.logger.error('Error in agent cleanup:', error);
      }
    }, this.config.agentTimeout / 2);

    // Initial discovery
    try {
      await this.discover();
    } catch (error) {
      this.logger.error('Error in initial discovery:', error);
    }

    this.logger.info('Service discovery started successfully');
  }

  /**
   * Stop service discovery
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping service discovery...');

    this.isRunning = false;

    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.discoveredAgents.clear();
    this.callbacks.discovered.clear();
    this.callbacks.lost.clear();

    this.logger.info('Service discovery stopped');
  }

  /**
   * Announce this agent's capabilities (Probe phase)
   */
  public async announce(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Get our registered agents to announce
      const agents = await this.registry.getAgents();
      
      this.logger.debug('Announcing agent capabilities', {
        agentCount: agents.length,
        phase: 'probe'
      });

      // In a real implementation, this would broadcast to network
      // For now, we'll emit an event for other components to handle
      agents.forEach(agent => {
        this.emit('announcement', {
          type: 'agent.announce',
          agent,
          timestamp: new Date()
        });
      });

    } catch (error) {
      this.logger.error('Error announcing services:', error);
    }
  }

  /**
   * Discover available agents (Sense phase)
   */
  public async discover(): Promise<A2AAgentCard[]> {
    if (!this.isRunning) {
      return [];
    }

    this.logger.debug('Discovering available agents', { phase: 'sense' });

    try {
      // In a real implementation, this would query network for agents
      // For now, return agents from our registry
      const agents = await this.registry.getAgents();

      // Update discovered agents cache
      agents.forEach(agent => {
        this.discoveredAgents.set(agent.agentId, {
          agent,
          lastSeen: new Date()
        });
      });

      this.logger.debug('Agent discovery completed', {
        discoveredCount: agents.length,
        totalCached: this.discoveredAgents.size
      });

      return agents;

    } catch (error) {
      this.logger.error('Error discovering agents:', error);
      return [];
    }
  }

  /**
   * Subscribe to agent discovery events
   */
  public onAgentDiscovered(callback: (agent: A2AAgentCard) => void): void {
    this.callbacks.discovered.add(callback);
  }

  /**
   * Subscribe to agent disconnection events  
   */
  public onAgentLost(callback: (agentId: string) => void): void {
    this.callbacks.lost.add(callback);
  }

  /**
   * Handle agent discovery announcement
   */
  public handleAgentAnnouncement(agent: A2AAgentCard): void {
    const existing = this.discoveredAgents.get(agent.agentId);
    
    if (!existing) {
      // New agent discovered
      this.discoveredAgents.set(agent.agentId, {
        agent,
        lastSeen: new Date()
      });

      this.logger.info('New agent discovered', {
        agentId: agent.agentId,
        name: agent.name,
        capabilities: agent.capabilities.length
      });

      // Notify callbacks
      this.callbacks.discovered.forEach(callback => {
        try {
          callback(agent);
        } catch (error) {
          this.logger.error('Error in discovery callback:', error);
        }
      });

    } else {
      // Update existing agent
      existing.agent = agent;
      existing.lastSeen = new Date();
      
      this.logger.debug('Agent announcement updated', {
        agentId: agent.agentId,
        name: agent.name
      });
    }
  }

  /**
   * Cleanup lost agents (Validate phase)
   */
  private async cleanupLostAgents(): Promise<void> {
    const now = Date.now();
    const lostAgents: string[] = [];

    for (const [agentId, discovery] of this.discoveredAgents.entries()) {
      const timeSinceLastSeen = now - discovery.lastSeen.getTime();
      
      if (timeSinceLastSeen > this.config.agentTimeout) {
        lostAgents.push(agentId);
        this.discoveredAgents.delete(agentId);
        
        this.logger.warn('Agent lost due to timeout', {
          agentId,
          name: discovery.agent.name,
          timeoutMs: timeSinceLastSeen
        });

        // Notify callbacks
        this.callbacks.lost.forEach(callback => {
          try {
            callback(agentId);
          } catch (error) {
            this.logger.error('Error in lost agent callback:', error);
          }
        });
      }
    }

    if (lostAgents.length > 0) {
      this.logger.info('Agent cleanup completed', {
        lostCount: lostAgents.length,
        activeCount: this.discoveredAgents.size
      });
    }
  }

  /**
   * Get discovery statistics for cybernetic governance
   */
  public getDiscoveryStatistics(): {
    totalDiscovered: number;
    activeAgents: number;
    averageResponseTime: number;
    discoveryHealth: number;
  } {
    const now = Date.now();
    const discoveries = Array.from(this.discoveredAgents.values());
    
    // Calculate average response time (time since last seen)
    const averageResponseTime = discoveries.length > 0
      ? discoveries.reduce((sum, disc) => sum + (now - disc.lastSeen.getTime()), 0) / discoveries.length
      : 0;

    // Calculate discovery health (percentage of agents with recent activity)
    const healthyAgents = discoveries.filter(disc => 
      (now - disc.lastSeen.getTime()) < (this.config.agentTimeout / 2)
    ).length;
    const discoveryHealth = discoveries.length > 0 ? (healthyAgents / discoveries.length) * 100 : 100;

    return {
      totalDiscovered: discoveries.length,
      activeAgents: healthyAgents,
      averageResponseTime,
      discoveryHealth
    };
  }

  /**
   * Find agents by capability through discovery
   */
  public async findAgentsByCapability(capability: string): Promise<A2AAgentCard[]> {
    const discoveries = Array.from(this.discoveredAgents.values());
    return discoveries
      .filter(disc => 
        disc.agent.capabilities.some(cap => 
          cap.id === capability || cap.name.toLowerCase().includes(capability.toLowerCase())
        )
      )
      .map(disc => disc.agent);
  }

  /**
   * Get all discovered agents
   */
  public getDiscoveredAgents(): A2AAgentCard[] {
    return Array.from(this.discoveredAgents.values()).map(disc => disc.agent);
  }

  /**
   * Force rediscovery of all agents
   */
  public async rediscover(): Promise<A2AAgentCard[]> {
    this.logger.info('Forcing agent rediscovery');
    this.discoveredAgents.clear();
    return await this.discover();
  }
}