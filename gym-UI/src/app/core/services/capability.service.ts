import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type Role = 'super_admin' | 'owner' | 'trainer' | 'member' | 'nutritionist' | 'receptionist';

// Represents capabilities per feature route
export interface RolePolicy {
  [capabilityNode: string]: boolean;
}

// Hard-coded matrix based on given truth
const ROLE_POLICY_MATRIX: Record<string, RolePolicy> = {
  super_admin: {
    'users.ownerCrud': true,
    'products.read': true,
    'products.write': false, // not allowed by policy
    'notifications.self': true,
    'monitoring.health': true,
    'operations.gated': false, // many operational modules aren't available to super_admin
    'dashboard.admin': true,
    'activity.read': true
  },
  owner: {
    'users.ownerCrud': false,
    'products.read': true,
    'products.write': true,
    'notifications.self': true,
    'monitoring.health': false,
    'operations.gated': true,
    'dashboard.admin': false,
    'activity.read': false
  }
};

@Injectable({
  providedIn: 'root'
})
export class CapabilityService {
  private authService = inject(AuthService);
  private dynamicOverrides = signal<Record<string, boolean>>({});

  setEndpointStatus(capability: string, isAvailable: boolean) {
    this.dynamicOverrides.update(opts => ({ ...opts, [capability]: isAvailable }));
  }

  /** Evaluates if current user can perform an action based on matrix */
  can(capabilityReq: string): boolean {
    const userRole = this.authService.currentUser()?.role;
    if (!userRole) return false;

    // Fast-fail if the remote endpoint corresponding to this capability is down
    const overrides = this.dynamicOverrides();
    if (overrides[capabilityReq] === false) {
      return false;
    }

    // Use default role matrix
    const policy = ROLE_POLICY_MATRIX[userRole] || {};
    return !!policy[capabilityReq];
  }

  /** Evaluates multiple capabilities. Returns true if ANY match. */
  canAny(capabilities: string[]): boolean {
    return capabilities.some(c => this.can(c));
  }

  /** Evaluates multiple capabilities. Returns true if ALL match. */
  canAll(capabilities: string[]): boolean {
    return capabilities.every(c => this.can(c));
  }
}
