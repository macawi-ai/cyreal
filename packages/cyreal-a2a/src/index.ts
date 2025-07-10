/**
 * A2A (Agent-to-Agent) Protocol Implementation for Cyreal
 * 
 * Replaces MCP with standards-compliant A2A protocol including:
 * - JSON-RPC 2.0 over HTTPS
 * - Agent Card discovery system
 * - RFC-1918 security enforcement
 * - Cybernetic governance integration
 */

export * from './cli';
export * from './agent-registry';
export * from './service-discovery';
export * from './a2a-governor';

// Re-export core A2A interfaces and implementations
export * from '@cyreal/core';