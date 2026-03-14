export interface AuditRecord {
  id: string;
  scope: string;
  business_id: string;
  actor_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  diff_json: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}
