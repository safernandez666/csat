export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: { id: number; name: string }[];
}

export interface Safeguard {
  id: number;
  safeguard_id: string;
  title: string;
  description: string | null;
  implementation_status: string;
  ig: string;
}

export interface Control {
  id: number;
  cis_id: string;
  name: string;
  objective: string | null;
  implementation_guidance: string | null;
  status: string;
  risk_level: string;
  owner_id: number | null;
  owner_name: string | null;
  due_date: string | null;
  review_date: string | null;
  started_at: string | null;
  implemented_at: string | null;
  group: string;
  created_at: string;
  updated_at: string;
  safeguards: Safeguard[];
}

export interface Evidence {
  id: number;
  control_id: number;
  uploaded_by: number;
  uploader_name: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  note: string | null;
  external_link: string | null;
  created_at: string;
}

export interface CommentItem {
  id: number;
  control_id: number;
  user_id: number;
  user_name: string | null;
  content: string;
  created_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardSummary {
  summary: {
    total: number;
    implemented: number;
    in_progress: number;
    not_implemented: number;
    needs_review: number;
    compliance_score: number;
    by_risk: Record<string, number>;
  };
  upcoming_reviews: number;
  recent_activity: Control[];
}

export interface TrendData {
  labels: string[];
  data: number[];
}
