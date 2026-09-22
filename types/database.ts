/**
 * GENERATED FILE — do not hand-edit.
 *
 * Produced by introspecting the Phase 2 migrations applied to a
 * local Postgres instance (scripts/generate-types.js), matching the
 * shape Supabase's own `supabase gen types typescript` produces.
 * Regenerate the same way after any schema change, or — once a real
 * Supabase project exists — with:
 *
 *   npx supabase gen types typescript --project-id <project-ref> > types/database.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      attachments: {
        Row: {
          id: string;
          recon_id: string;
          file_name: string;
          drive_file_id: string;
          drive_view_url: string | null;
          drive_download_url: string | null;
          mime_type: string | null;
          file_size: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          recon_id: string;
          file_name: string;
          drive_file_id: string;
          drive_view_url?: string | null;
          drive_download_url?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          recon_id?: string;
          file_name?: string;
          drive_file_id?: string;
          drive_view_url?: string | null;
          drive_download_url?: string | null;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before_data: Json | null;
          after_data: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          before_data?: Json | null;
          after_data?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      fiscal_years: {
        Row: {
          year: number;
          active: boolean;
          open_for_entry: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          year: number;
          active?: boolean;
          open_for_entry?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          year?: number;
          active?: boolean;
          open_for_entry?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      opd_master: {
        Row: {
          id: string;
          kode_opd: string | null;
          nama_opd: string;
          aktif: boolean;
          urutan: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kode_opd?: string | null;
          nama_opd: string;
          aktif?: boolean;
          urutan?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kode_opd?: string | null;
          nama_opd?: string;
          aktif?: boolean;
          urutan?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          role: 'admin' | 'opd';
          opd_id: string | null;
          aktif: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          role: 'admin' | 'opd';
          opd_id?: string | null;
          aktif?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          role?: 'admin' | 'opd';
          opd_id?: string | null;
          aktif?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recon_admin_values: {
        Row: {
          recon_id: string;
          lra_sistem: number;
          saldo_spj_fungsional_sistem: number;
          saldo_laporan_penutupan_kas: number;
          keterangan_b1: string | null;
          keterangan_b2: string | null;
          keterangan_c1: string | null;
          keterangan_c2: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          recon_id: string;
          lra_sistem?: number;
          saldo_spj_fungsional_sistem?: number;
          saldo_laporan_penutupan_kas?: number;
          keterangan_b1?: string | null;
          keterangan_b2?: string | null;
          keterangan_c1?: string | null;
          keterangan_c2?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          recon_id?: string;
          lra_sistem?: number;
          saldo_spj_fungsional_sistem?: number;
          saldo_laporan_penutupan_kas?: number;
          keterangan_b1?: string | null;
          keterangan_b2?: string | null;
          keterangan_c1?: string | null;
          keterangan_c2?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      recon_headers: {
        Row: {
          id: string;
          opd_id: string;
          fiscal_year: number;
          reporting_month: number;
          status_opd: 'DRAFT' | 'SUBMITTED';
          status_admin: 'PENDING' | 'VERIFIED';
          no_surat: string | null;
          tanggal_rekon: string | null;
          hari_rekon: string | null;
          bulan_label: string | null;
          petugas_rekon_id: string | null;
          petugas_rekon_nama_snapshot: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          submitted_at: string | null;
          verified_at: string | null;
        };
        Insert: {
          id?: string;
          opd_id: string;
          fiscal_year: number;
          reporting_month: number;
          status_opd?: 'DRAFT' | 'SUBMITTED';
          status_admin?: 'PENDING' | 'VERIFIED';
          no_surat?: string | null;
          tanggal_rekon?: string | null;
          hari_rekon?: string | null;
          bulan_label?: string | null;
          petugas_rekon_id?: string | null;
          petugas_rekon_nama_snapshot?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          submitted_at?: string | null;
          verified_at?: string | null;
        };
        Update: {
          id?: string;
          opd_id?: string;
          fiscal_year?: number;
          reporting_month?: number;
          status_opd?: 'DRAFT' | 'SUBMITTED';
          status_admin?: 'PENDING' | 'VERIFIED';
          no_surat?: string | null;
          tanggal_rekon?: string | null;
          hari_rekon?: string | null;
          bulan_label?: string | null;
          petugas_rekon_id?: string | null;
          petugas_rekon_nama_snapshot?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          submitted_at?: string | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      recon_opd_values: {
        Row: {
          recon_id: string;
          lra_manual: number;
          spj_fungsional: number;
          saldo_spj_fungsional: number;
          rekening_koran: number;
          updated_by: string | null;
          updated_at: string;
          submitted_at: string | null;
        };
        Insert: {
          recon_id: string;
          lra_manual?: number;
          spj_fungsional?: number;
          saldo_spj_fungsional?: number;
          rekening_koran?: number;
          updated_by?: string | null;
          updated_at?: string;
          submitted_at?: string | null;
        };
        Update: {
          recon_id?: string;
          lra_manual?: number;
          spj_fungsional?: number;
          saldo_spj_fungsional?: number;
          rekening_koran?: number;
          updated_by?: string | null;
          updated_at?: string;
          submitted_at?: string | null;
        };
        Relationships: [];
      };
      subunit_mapping: {
        Row: {
          id: string;
          source_name: string;
          normalized_name: string;
          parent_opd_id: string | null;
          aktif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_name: string;
          normalized_name: string;
          parent_opd_id?: string | null;
          aktif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_name?: string;
          normalized_name?: string;
          parent_opd_id?: string | null;
          aktif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      recon_summary: {
        Row: {
          recon_id: string | null;
          opd_id: string | null;
          nama_opd: string | null;
          kode_opd: string | null;
          fiscal_year: number | null;
          reporting_month: number | null;
          bulan_label: string | null;
          status_opd: string | null;
          status_admin: string | null;
          no_surat: string | null;
          tanggal_rekon: string | null;
          petugas_rekon_nama_snapshot: string | null;
          submitted_at: string | null;
          verified_at: string | null;
          lra_manual: number | null;
          spj_fungsional: number | null;
          saldo_spj_fungsional: number | null;
          rekening_koran: number | null;
          lra_sistem: number | null;
          saldo_spj_fungsional_sistem: number | null;
          saldo_laporan_penutupan_kas: number | null;
          keterangan_b1: string | null;
          keterangan_b2: string | null;
          keterangan_c1: string | null;
          keterangan_c2: string | null;
          selisih_b1: number | null;
          status_b1: string | null;
          selisih_b2: number | null;
          status_b2: string | null;
          selisih_c1: number | null;
          status_c1: string | null;
          selisih_c2: number | null;
          status_c2: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_my_opd_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
