import { UserVm } from '../models/api.models';

export const mapUserToVm = (u: any): UserVm => {
  if (!u) return {} as UserVm;
  return {
    ...u,
    id_user: u.id_user || u.id?.toString() || '',
    owned_gyms_count: u.owned_gyms_count ?? 0,
    active_gyms_count: u.active_gyms_count ?? 0,
    email_verified_at: u.email_verified_at ? new Date(u.email_verified_at).toISOString() : null
  };
};
