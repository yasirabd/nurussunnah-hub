export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      peer_feedbacks: {
        Row: {
          academic_year_id: string
          created_at: string
          feedback_text: string | null
          giver_user_id: string
          id: string
          is_completed: boolean
          rating: number
          receiver_user_id: string
          updated_at: string
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          feedback_text?: string | null
          giver_user_id: string
          id?: string
          is_completed?: boolean
          rating: number
          receiver_user_id: string
          updated_at?: string
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          feedback_text?: string | null
          giver_user_id?: string
          id?: string
          is_completed?: boolean
          rating?: number
          receiver_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedbacks_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
      position_histories: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          position_name: string
          start_date: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          position_name: string
          start_date: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          position_name?: string
          start_date?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_histories_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_domicile: string | null
          address_ktp: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          email: string
          employee_no: string
          employee_status: Database["public"]["Enums"]["employee_status_enum"]
          facebook: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          home_unit_id: string | null
          id: string
          instagram: string | null
          is_active: boolean
          last_education: string | null
          marital_status: string | null
          must_change_password: boolean
          phone: string | null
          study_program: string | null
          twitter: string | null
          updated_at: string
        }
        Insert: {
          address_domicile?: string | null
          address_ktp?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          email: string
          employee_no: string
          employee_status?: Database["public"]["Enums"]["employee_status_enum"]
          facebook?: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          home_unit_id?: string | null
          id: string
          instagram?: string | null
          is_active?: boolean
          last_education?: string | null
          marital_status?: string | null
          must_change_password?: boolean
          phone?: string | null
          study_program?: string | null
          twitter?: string | null
          updated_at?: string
        }
        Update: {
          address_domicile?: string | null
          address_ktp?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          email?: string
          employee_no?: string
          employee_status?: Database["public"]["Enums"]["employee_status_enum"]
          facebook?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          home_unit_id?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          last_education?: string | null
          marital_status?: string | null
          must_change_password?: boolean
          phone?: string | null
          study_program?: string | null
          twitter?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_unit_id_fkey"
            columns: ["home_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      statement_reviews: {
        Row: {
          action: Database["public"]["Enums"]["review_action_enum"]
          created_at: string
          id: string
          notes: string | null
          reviewer_id: string
          work_statement_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["review_action_enum"]
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id: string
          work_statement_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["review_action_enum"]
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string
          work_statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "statement_reviews_work_statement_id_fkey"
            columns: ["work_statement_id"]
            isOneToOne: false
            referencedRelation: "work_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role_enum"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          user_id?: string
        }
        Relationships: []
      }
      user_unit_assignments: {
        Row: {
          academic_year_id: string | null
          assignment_type: Database["public"]["Enums"]["assignment_type_enum"]
          created_at: string
          id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          academic_year_id?: string | null
          assignment_type: Database["public"]["Enums"]["assignment_type_enum"]
          created_at?: string
          id?: string
          unit_id: string
          user_id: string
        }
        Update: {
          academic_year_id?: string | null
          assignment_type?: Database["public"]["Enums"]["assignment_type_enum"]
          created_at?: string
          id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unit_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_unit_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      work_statements: {
        Row: {
          academic_year_id: string
          content: Json
          created_at: string
          id: string
          pdf_url: string | null
          signature_data: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["work_statement_status_enum"]
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year_id: string
          content?: Json
          created_at?: string
          id?: string
          pdf_url?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["work_statement_status_enum"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year_id?: string
          content?: Json
          created_at?: string
          id?: string
          pdf_url?: string | null
          signature_data?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["work_statement_status_enum"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_statements_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_review_work_statement: {
        Args: { statement_id: string }
        Returns: boolean
      }
      get_my_roles: { Args: never; Returns: string[] }
      get_feedback_identified: {
        Args: { p_academic_year_id: string }
        Returns: {
          feedback_id: string
          giver_user_id: string
          giver_name: string
          receiver_user_id: string
          receiver_name: string
          unit_name: string | null
          unit_code: string | null
          rating: number
          feedback_text: string | null
          created_at: string
        }[]
      }
      get_feedback_monitoring: {
        Args: { p_academic_year_id: string }
        Returns: {
          user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          unit_code: string | null
          target_count: number
          completed_count: number
          is_complete: boolean
        }[]
      }
      get_feedback_monitoring_scoped: {
        Args: { p_academic_year_id: string }
        Returns: {
          user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          unit_code: string | null
          target_count: number
          completed_count: number
          is_complete: boolean
        }[]
      }
      get_feedback_targets: {
        Args: { p_academic_year_id: string }
        Returns: {
          receiver_user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          unit_code: string | null
          rating: number | null
          feedback_text: string | null
          is_completed: boolean
          feedback_id: string | null
        }[]
      }
      get_received_feedback_anonymous: {
        Args: { p_academic_year_id: string }
        Returns: {
          feedback_id: string
          rating: number
          feedback_text: string | null
          created_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_hrd: { Args: never; Returns: boolean }
      is_kepala_unit: { Args: never; Returns: boolean }
      review_work_statement: {
        Args: {
          p_action: Database["public"]["Enums"]["review_action_enum"]
          p_notes?: string
          p_work_statement_id: string
        }
        Returns: Database["public"]["Tables"]["work_statements"]["Row"]
      }
      resolve_login_email: {
        Args: { p_identifier: string }
        Returns: string | null
      }
      save_work_statement_draft: {
        Args: {
          p_academic_year_id: string
          p_content: Json
          p_signature_data?: string | null
        }
        Returns: Database["public"]["Tables"]["work_statements"]["Row"]
      }
      submit_work_statement: {
        Args: {
          p_academic_year_id: string
          p_content: Json
          p_signature_data: string
        }
        Returns: Database["public"]["Tables"]["work_statements"]["Row"]
      }
      submit_peer_feedback: {
        Args: {
          p_academic_year_id: string
          p_receiver_user_id: string
          p_rating: number
          p_feedback_text: string
        }
        Returns: Database["public"]["Tables"]["peer_feedbacks"]["Row"]
      }
    }
    Enums: {
      assignment_type_enum: "HOME" | "TEACHING"
      employee_status_enum: "TETAP" | "TIDAK_TETAP" | "KONTRAK" | "HONORER" | "PENSIUN"
      gender_enum: "L" | "P"
      review_action_enum: "REVIEWED" | "APPROVED" | "REJECTED" | "REOPENED"
      user_role_enum: "PEGAWAI" | "KEPALA_UNIT" | "HRD" | "ADMIN"
      work_statement_status_enum: "DRAFT" | "SUBMITTED" | "REVIEWED" | "APPROVED" | "REJECTED" | "REOPENED"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

// ── Convenience aliases ──────────────────────────────────────────
export type Profile = Tables<"profiles">
export type Unit = Tables<"units">
export type Organization = Tables<"organizations">
export type AcademicYear = Tables<"academic_years">
export type WorkStatement = Tables<"work_statements">
export type StatementReview = Tables<"statement_reviews">
export type UserRole = Tables<"user_roles">
export type UserUnitAssignment = Tables<"user_unit_assignments">
export type PositionHistory = Tables<"position_histories">
export type PeerFeedback = Tables<"peer_feedbacks">
export type AuditLog = Tables<"audit_logs">

export type WorkStatementStatus = Database["public"]["Enums"]["work_statement_status_enum"]
export type UserRoleEnum = Database["public"]["Enums"]["user_role_enum"]
export type EmployeeStatus = Database["public"]["Enums"]["employee_status_enum"]
export type GenderEnum = Database["public"]["Enums"]["gender_enum"]
export type AssignmentType = Database["public"]["Enums"]["assignment_type_enum"]
export type ReviewAction = Database["public"]["Enums"]["review_action_enum"]


