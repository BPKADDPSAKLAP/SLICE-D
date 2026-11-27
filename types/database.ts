export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      attachments: {
        Row: {
          drive_download_url: string | null
          drive_file_id: string
          drive_view_url: string | null
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          recon_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          drive_download_url?: string | null
          drive_file_id: string
          drive_view_url?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          recon_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          drive_download_url?: string | null
          drive_file_id?: string
          drive_view_url?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          recon_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: false
            referencedRelation: "recon_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: false
            referencedRelation: "recon_summary"
            referencedColumns: ["recon_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      cek_selisih_runs: {
        Row: {
          catatan: string | null
          created_at: string
          fiscal_year: number
          id: string
          jumlah_rekening: number
          jumlah_selisih: number
          jumlah_sesuai: number
          jumlah_transaksi: number
          lra_manual_file_id: string | null
          lra_program_file_id: string | null
          reporting_month: number
          result_file_id: string | null
          status: string
          total_lra_program: number
          total_selisih: number
          total_sp2d: number
          uploaded_by: string
          version: number
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          fiscal_year: number
          id?: string
          jumlah_rekening?: number
          jumlah_selisih?: number
          jumlah_sesuai?: number
          jumlah_transaksi?: number
          lra_manual_file_id?: string | null
          lra_program_file_id?: string | null
          reporting_month: number
          result_file_id?: string | null
          status: string
          total_lra_program?: number
          total_selisih?: number
          total_sp2d?: number
          uploaded_by: string
          version: number
        }
        Update: {
          catatan?: string | null
          created_at?: string
          fiscal_year?: number
          id?: string
          jumlah_rekening?: number
          jumlah_selisih?: number
          jumlah_sesuai?: number
          jumlah_transaksi?: number
          lra_manual_file_id?: string | null
          lra_program_file_id?: string | null
          reporting_month?: number
          result_file_id?: string | null
          status?: string
          total_lra_program?: number
          total_selisih?: number
          total_sp2d?: number
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cek_selisih_runs_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
        ]
      }
      fiscal_years: {
        Row: {
          active: boolean
          created_at: string
          open_for_entry: boolean
          updated_at: string
          year: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          open_for_entry?: boolean
          updated_at?: string
          year: number
        }
        Update: {
          active?: boolean
          created_at?: string
          open_for_entry?: boolean
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      opd_master: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          kode_opd: string | null
          nama_opd: string
          updated_at: string
          urutan: number | null
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          kode_opd?: string | null
          nama_opd: string
          updated_at?: string
          urutan?: number | null
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          kode_opd?: string | null
          nama_opd?: string
          updated_at?: string
          urutan?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          must_change_password: boolean
          opd_id: string | null
          role: string
          updated_at: string
          username: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id: string
          must_change_password?: boolean
          opd_id?: string | null
          role: string
          updated_at?: string
          username: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          must_change_password?: boolean
          opd_id?: string | null
          role?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_opd_id_fkey"
            columns: ["opd_id"]
            isOneToOne: false
            referencedRelation: "opd_master"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_admin_values: {
        Row: {
          keterangan_b1: string | null
          keterangan_b2: string | null
          keterangan_c1: string | null
          keterangan_c2: string | null
          lra_sistem: number
          recon_id: string
          saldo_laporan_penutupan_kas: number
          saldo_spj_fungsional_sistem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          keterangan_b1?: string | null
          keterangan_b2?: string | null
          keterangan_c1?: string | null
          keterangan_c2?: string | null
          lra_sistem?: number
          recon_id: string
          saldo_laporan_penutupan_kas?: number
          saldo_spj_fungsional_sistem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          keterangan_b1?: string | null
          keterangan_b2?: string | null
          keterangan_c1?: string | null
          keterangan_c2?: string | null
          lra_sistem?: number
          recon_id?: string
          saldo_laporan_penutupan_kas?: number
          saldo_spj_fungsional_sistem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_admin_values_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: true
            referencedRelation: "recon_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_admin_values_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: true
            referencedRelation: "recon_summary"
            referencedColumns: ["recon_id"]
          },
        ]
      }
      recon_headers: {
        Row: {
          bulan_label: string | null
          created_at: string
          created_by: string | null
          fiscal_year: number
          hari_rekon: string | null
          id: string
          no_surat: string | null
          opd_id: string
          petugas_rekon_id: string | null
          petugas_rekon_nama_snapshot: string | null
          reporting_month: number
          status_admin: string
          status_opd: string
          submitted_at: string | null
          tanggal_rekon: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
        }
        Insert: {
          bulan_label?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_year: number
          hari_rekon?: string | null
          id?: string
          no_surat?: string | null
          opd_id: string
          petugas_rekon_id?: string | null
          petugas_rekon_nama_snapshot?: string | null
          reporting_month: number
          status_admin?: string
          status_opd?: string
          submitted_at?: string | null
          tanggal_rekon?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Update: {
          bulan_label?: string | null
          created_at?: string
          created_by?: string | null
          fiscal_year?: number
          hari_rekon?: string | null
          id?: string
          no_surat?: string | null
          opd_id?: string
          petugas_rekon_id?: string | null
          petugas_rekon_nama_snapshot?: string | null
          reporting_month?: number
          status_admin?: string
          status_opd?: string
          submitted_at?: string | null
          tanggal_rekon?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_headers_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "recon_headers_opd_id_fkey"
            columns: ["opd_id"]
            isOneToOne: false
            referencedRelation: "opd_master"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_opd_values: {
        Row: {
          lra_manual: number
          recon_id: string
          rekening_koran: number
          saldo_spj_fungsional: number
          spj_fungsional: number
          submitted_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          lra_manual?: number
          recon_id: string
          rekening_koran?: number
          saldo_spj_fungsional?: number
          spj_fungsional?: number
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          lra_manual?: number
          recon_id?: string
          rekening_koran?: number
          saldo_spj_fungsional?: number
          spj_fungsional?: number
          submitted_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_opd_values_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: true
            referencedRelation: "recon_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_opd_values_recon_id_fkey"
            columns: ["recon_id"]
            isOneToOne: true
            referencedRelation: "recon_summary"
            referencedColumns: ["recon_id"]
          },
        ]
      }
      subunit_mapping: {
        Row: {
          aktif: boolean
          created_at: string
          id: string
          normalized_name: string
          parent_opd_id: string | null
          source_name: string
          updated_at: string
        }
        Insert: {
          aktif?: boolean
          created_at?: string
          id?: string
          normalized_name: string
          parent_opd_id?: string | null
          source_name: string
          updated_at?: string
        }
        Update: {
          aktif?: boolean
          created_at?: string
          id?: string
          normalized_name?: string
          parent_opd_id?: string | null
          source_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subunit_mapping_parent_opd_id_fkey"
            columns: ["parent_opd_id"]
            isOneToOne: false
            referencedRelation: "opd_master"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      recon_summary: {
        Row: {
          bulan_label: string | null
          fiscal_year: number | null
          keterangan_b1: string | null
          keterangan_b2: string | null
          keterangan_c1: string | null
          keterangan_c2: string | null
          kode_opd: string | null
          lra_manual: number | null
          lra_sistem: number | null
          nama_opd: string | null
          no_surat: string | null
          opd_id: string | null
          petugas_rekon_nama_snapshot: string | null
          recon_id: string | null
          rekening_koran: number | null
          reporting_month: number | null
          saldo_laporan_penutupan_kas: number | null
          saldo_spj_fungsional: number | null
          saldo_spj_fungsional_sistem: number | null
          selisih_b1: number | null
          selisih_b2: number | null
          selisih_c1: number | null
          selisih_c2: number | null
          spj_fungsional: number | null
          status_admin: string | null
          status_b1: string | null
          status_b2: string | null
          status_c1: string | null
          status_c2: string | null
          status_opd: string | null
          submitted_at: string | null
          tanggal_rekon: string | null
          verified_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_headers_fiscal_year_fkey"
            columns: ["fiscal_year"]
            isOneToOne: false
            referencedRelation: "fiscal_years"
            referencedColumns: ["year"]
          },
          {
            foreignKeyName: "recon_headers_opd_id_fkey"
            columns: ["opd_id"]
            isOneToOne: false
            referencedRelation: "opd_master"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_cek_selisih_run: { Args: { p_id: string }; Returns: undefined }
      create_cek_selisih_run: {
        Args: {
          p_catatan?: string
          p_fiscal_year: number
          p_jumlah_rekening?: number
          p_jumlah_selisih?: number
          p_jumlah_sesuai?: number
          p_jumlah_transaksi?: number
          p_lra_manual_file_id?: string
          p_lra_program_file_id?: string
          p_reporting_month: number
          p_result_file_id?: string
          p_total_lra_program?: number
          p_total_selisih?: number
          p_total_sp2d?: number
        }
        Returns: string
      }
      get_my_opd_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
