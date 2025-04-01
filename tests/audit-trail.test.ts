import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the blockchain environment
const mockBlockchain = {
  blockHeight: 1,
  blockTime: 1617984000, // Example timestamp
  principals: {
    admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    provider: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
    patient: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
  },
  contractCaller: null // Will be set in tests
};

// Mock the contract functions
const mockAuditTrail = {
  admin: mockBlockchain.principals.admin,
  auditEvents: new Map(),
  eventCounter: 0,
  
  isAdmin() {
    return mockBlockchain.caller === this.admin;
  },
  
  isAuthorizedContract() {
    const caller = mockBlockchain.contractCaller;
    return (
        caller === '.patient-identity' ||
        caller === '.provider-verification' ||
        caller === '.record-access'
    );
  },
  
  logEvent(eventType, resourceId, actor) {
    const caller = mockBlockchain.contractCaller;
    
    // Check authorization
    if (!this.isAuthorizedContract() && !this.isAdmin()) {
      return { err: 1 }; // ERR_UNAUTHORIZED
    }
    
    // Check valid input
    if (!eventType || eventType.length === 0) {
      return { err: 4 }; // ERR_INVALID_INPUT
    }
    
    const currentTime = mockBlockchain.blockTime;
    const eventId = this.eventCounter;
    
    // Increment counter
    this.eventCounter++;
    
    // Store event
    this.auditEvents.set(eventId, {
      eventType,
      resourceId,
      actor,
      timestamp: currentTime,
      details: null
    });
    
    return { ok: eventId };
  },
  
  logEventWithDetails(eventType, resourceId, actor, details) {
    const caller = mockBlockchain.contractCaller;
    
    // Check authorization
    if (!this.isAuthorizedContract() && !this.isAdmin()) {
      return { err: 1 }; // ERR_UNAUTHORIZED
    }
    
    // Check valid input
    if (!eventType || eventType.length === 0) {
      return { err: 4 }; // ERR_INVALID_INPUT
    }
    
    const currentTime = mockBlockchain.blockTime;
    const eventId = this.eventCounter;
    
    // Increment counter
    this.eventCounter++;
    
    // Store event
    this.auditEvents.set(eventId, {
      eventType,
      resourceId,
      actor,
      timestamp: currentTime,
      details
    });
    
    return { ok: eventId };
  },
  
  getAuditEvent(eventId) {
    const caller = mockBlockchain.caller;
    
    // Check if admin
    if (!this.isAdmin()) {
      return { err: 1 }; // ERR_UNAUTHORIZED
    }
    
    // Check if event exists
    if (!this.auditEvents.has(eventId)) {
      return { err: 3 }; // ERR_NOT_FOUND
    }
    
    return { ok: this.auditEvents.get(eventId) };
  }
};

describe('Audit Trail Contract', () => {
  beforeEach(() => {
    // Reset mocks and state
    mockAuditTrail.auditEvents.clear();
    mockAuditTrail.eventCounter = 0;
    mockAuditTrail.admin = mockBlockchain.principals.admin;
    mockBlockchain.contractCaller = null;
  });
  
  it('should log an event successfully from an authorized contract', () => {
    // Setup
    mockBlockchain.contractCaller = '.patient-identity';
    
    // Execute
    const result = mockAuditTrail.logEvent(
        'REGISTER_PATIENT',
        'PATIENT123',
        mockBlockchain.principals.provider
    );
    
    // Verify
    expect(result).toEqual({ ok: 0 });
    expect(mockAuditTrail.auditEvents.has(0)).toBe(true);
    expect(mockAuditTrail.auditEvents.get(0).eventType).toBe('REGISTER_PATIENT');
    expect(mockAuditTrail.auditEvents.get(0).resourceId).toBe('PATIENT123');
    expect(mockAuditTrail.auditEvents.get(0).actor).toBe(mockBlockchain.principals.provider);
  });
  
  it('should log an event with details successfully', () => {
    // Setup
    mockBlockchain.contractCaller = '.record-access';
    
    // Execute
    const result = mockAuditTrail.logEventWithDetails(
        'GRANT_ACCESS',
        'PATIENT123',
        mockBlockchain.principals.provider,
        'Access granted for annual checkup'
    );
    
    // Verify
    expect(result).toEqual({ ok: 0 });
    expect(mockAuditTrail.auditEvents.has(0)).toBe(true);
    expect(mockAuditTrail.auditEvents.get(0).eventType).toBe('GRANT_ACCESS');
    expect(mockAuditTrail.auditEvents.get(0).details).toBe('Access granted for annual checkup');
  });
  
  it('should fail to log an event from unauthorized caller', () => {
    // Setup - not an authorized contract or admin
    mockBlockchain.contractCaller = '.unauthorized-contract';
    
    // Execute
    const result = mockAuditTrail.logEvent(
        'UNAUTHORIZED_EVENT',
        'PATIENT123',
        mockBlockchain.principals.provider
    );
    
    // Verify
    expect(result).toEqual({ err: 1 }); // ERR_UNAUTHORIZED
    expect(mockAuditTrail.auditEvents.has(0)).toBe(false);
  });
  
  it('should retrieve an audit event as admin', () => {
    // Setup - first log an event
    mockBlockchain.contractCaller = '.patient-identity';
    mockAuditTrail.logEvent(
        'REGISTER_PATIENT',
        'PATIENT123',
        mockBlockchain.principals.provider
    );
    
    // Set caller to admin for retrieval
    mockBlockchain.caller = mockBlockchain.principals.admin;
    
    // Execute
    const result = mockAuditTrail.getAuditEvent(0);
    
    // Verify
    expect(result.ok).toBeDefined();
    expect(result.ok.eventType).toBe('REGISTER_PATIENT');
    expect(result.ok.resourceId).toBe('PATIENT123');
  });
  
  it('should fail to retrieve an audit event as non-admin', () => {
    // Setup - first log an event
    mockBlockchain.contractCaller = '.patient-identity';
    mockAuditTrail.logEvent(
        'REGISTER_PATIENT',
        'PATIENT123',
        mockBlockchain.principals.provider
    );
    
    // Set caller to non-admin for retrieval
    mockBlockchain.caller = mockBlockchain.principals.provider;
    
    // Execute
    const result = mockAuditTrail.getAuditEvent(0);
    
    // Verify
    expect(result).toEqual({ err: 1 }); // ERR_UNAUTHORIZED
  });
});
