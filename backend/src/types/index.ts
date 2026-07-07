export interface CRMLead {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: 'GOOD_LEAD_FOLLOW_UP' | 'DID_NOT_CONNECT' | 'BAD_LEAD' | 'SALE_DONE';
  crm_note: string;
  data_source: 'leads_on_demand' | 'meridian_tower' | 'eden_park' | 'varah_swamy' | 'sarjapur_plots' | '';
  possession_time: string;
  description: string;
}

export interface RawRow {
  [key: string]: string;
}

export interface ParsePreviewResponse {
  headers: string[];
  rows: RawRow[];
  totalRows: number;
}

export interface ImportRequest {
  rows: RawRow[];
}

export interface SkippedRecord {
  row: RawRow;
  reason: string;
}

export interface ImportResponse {
  success: boolean;
  imported: CRMLead[];
  skipped: SkippedRecord[];
  stats: {
    totalProcessed: number;
    totalImported: number;
    totalSkipped: number;
  };
}
