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
      employee_registrations: {
        Row: {
          address_domicile: string | null
          address_ktp: string | null
          birth_date: string | null
          birth_place: string | null
          created_at: string
          drive_folder_id: string | null
          email: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          employee_no: string | null
          employee_status: Database["public"]["Enums"]["employee_status_enum"]
          facebook: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          home_unit_id: string | null
          id: string
          instagram: string | null
          ktp_url: string | null
          last_education: string | null
          marital_status: string | null
          nik: string | null
          note: string | null
          phone: string | null
          photo_url: string | null
          position_name: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["employee_registration_status_enum"]
          study_program: string | null
          twitter: string | null
          uniform_size: string | null
          updated_at: string
        }
        Insert: {
          address_domicile?: string | null
          address_ktp?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          drive_folder_id?: string | null
          email: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          employee_no?: string | null
          employee_status?: Database["public"]["Enums"]["employee_status_enum"]
          facebook?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          home_unit_id?: string | null
          id?: string
          instagram?: string | null
          ktp_url?: string | null
          last_education?: string | null
          marital_status?: string | null
          nik?: string | null
          note?: string | null
          phone?: string | null
          photo_url?: string | null
          position_name?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["employee_registration_status_enum"]
          study_program?: string | null
          twitter?: string | null
          uniform_size?: string | null
          updated_at?: string
        }
        Update: {
          address_domicile?: string | null
          address_ktp?: string | null
          birth_date?: string | null
          birth_place?: string | null
          created_at?: string
          drive_folder_id?: string | null
          email?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          employee_no?: string | null
          employee_status?: Database["public"]["Enums"]["employee_status_enum"]
          facebook?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          home_unit_id?: string | null
          id?: string
          instagram?: string | null
          ktp_url?: string | null
          last_education?: string | null
          marital_status?: string | null
          nik?: string | null
          note?: string | null
          phone?: string | null
          photo_url?: string | null
          position_name?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["employee_registration_status_enum"]
          study_program?: string | null
          twitter?: string | null
          uniform_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employee_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          status: Database["public"]["Enums"]["employee_invite_status_enum"]
          used_at: string | null
          used_registration_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["employee_invite_status_enum"]
          used_at?: string | null
          used_registration_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          status?: Database["public"]["Enums"]["employee_invite_status_enum"]
          used_at?: string | null
          used_registration_id?: string | null
        }
        Relationships: []
      }
      employee_intake: {
        Row: {
          created_at: string
          created_by: string | null
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relation: string | null
          id: string
          ktp_url: string | null
          photo_url: string | null
          uniform_size: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL" | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          id?: string
          ktp_url?: string | null
          photo_url?: string | null
          uniform_size?: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL" | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relation?: string | null
          id?: string
          ktp_url?: string | null
          photo_url?: string | null
          uniform_size?: "XS" | "S" | "M" | "L" | "XL" | "XXL" | "XXXL" | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_intake_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_intake_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          status: "ACTIVE" | "COMPLETED" | "CANCELLED"
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          status?: "ACTIVE" | "COMPLETED" | "CANCELLED"
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          status?: "ACTIVE" | "COMPLETED" | "CANCELLED"
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_leaves_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          active_status: Database["public"]["Enums"]["active_status_enum"]
          active_status_end_date: string | null
          active_status_note: string | null
          active_status_start_date: string | null
          facebook: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          home_unit_id: string | null
          id: string
          instagram: string | null
          last_education: string | null
          marital_status: string | null
          nik: string | null
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
          active_status?: Database["public"]["Enums"]["active_status_enum"]
          active_status_end_date?: string | null
          active_status_note?: string | null
          active_status_start_date?: string | null
          facebook?: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_enum"]
          home_unit_id?: string | null
          id: string
          instagram?: string | null
          last_education?: string | null
          marital_status?: string | null
          nik?: string | null
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
          active_status?: Database["public"]["Enums"]["active_status_enum"]
          active_status_end_date?: string | null
          active_status_note?: string | null
          active_status_start_date?: string | null
          facebook?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_enum"]
          home_unit_id?: string | null
          id?: string
          instagram?: string | null
          last_education?: string | null
          marital_status?: string | null
          nik?: string | null
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
      leave_requests: {
        Row: {
          id: string
          user_id: string
          academic_year_id: string | null
          unit_id: string | null
          start_date: string
          end_date: string
          leave_category: string
          leave_time_type: Database["public"]["Enums"]["leave_time_type_enum"]
          reason: string
          unit_head_approved: boolean
          no_evidence_ack: boolean
          status: Database["public"]["Enums"]["leave_request_status_enum"]
          admin_note: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          academic_year_id?: string | null
          unit_id?: string | null
          start_date: string
          end_date: string
          leave_category: string
          leave_time_type: Database["public"]["Enums"]["leave_time_type_enum"]
          reason: string
          unit_head_approved?: boolean
          no_evidence_ack?: boolean
          status?: Database["public"]["Enums"]["leave_request_status_enum"]
          admin_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["leave_requests"]["Insert"]>
        Relationships: []
      }
      leave_request_attachments: {
        Row: {
          id: string
          leave_request_id: string
          kind: Database["public"]["Enums"]["leave_attachment_kind_enum"]
          drive_file_id: string
          drive_view_link: string
          file_name: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          leave_request_id: string
          kind: Database["public"]["Enums"]["leave_attachment_kind_enum"]
          drive_file_id: string
          drive_view_link: string
          file_name: string
          mime_type: string
          uploaded_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["leave_request_attachments"]["Insert"]>
        Relationships: []
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          date: string
          check_in: string | null
          check_out: string | null
          source: string
          academic_year_id: string | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          check_in?: string | null
          check_out?: string | null
          source?: string
          academic_year_id?: string | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["attendance_records"]["Insert"]>
        Relationships: []
      }
      attendance_corrections: {
        Row: {
          id: string
          user_id: string
          academic_year_id: string | null
          unit_id: string | null
          event_date: string
          correction_kind: Database["public"]["Enums"]["attendance_correction_kind_enum"]
          time_scope: Database["public"]["Enums"]["attendance_time_scope_enum"]
          reason: string
          requested_check_in: string | null
          requested_check_out: string | null
          status: Database["public"]["Enums"]["attendance_correction_status_enum"]
          admin_note: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          academic_year_id?: string | null
          unit_id?: string | null
          event_date: string
          correction_kind: Database["public"]["Enums"]["attendance_correction_kind_enum"]
          time_scope: Database["public"]["Enums"]["attendance_time_scope_enum"]
          reason: string
          requested_check_in?: string | null
          requested_check_out?: string | null
          status?: Database["public"]["Enums"]["attendance_correction_status_enum"]
          admin_note?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["attendance_corrections"]["Insert"]>
        Relationships: []
      }
      attendance_correction_attachments: {
        Row: {
          id: string
          attendance_correction_id: string
          drive_file_id: string
          drive_view_link: string
          file_name: string
          mime_type: string
          uploaded_at: string
        }
        Insert: {
          id?: string
          attendance_correction_id: string
          drive_file_id: string
          drive_view_link: string
          file_name: string
          mime_type: string
          uploaded_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["attendance_correction_attachments"]["Insert"]>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_employee_invite: {
        Args: never
        Returns: string
      }
      check_employee_invite: {
        Args: { p_code: string }
        Returns: boolean
      }
      submit_employee_registration: {
        Args: {
          p_invite_code: string
          p_full_name: string
          p_email: string
          p_nik?: string | null
          p_phone?: string | null
          p_gender?: string
          p_marital_status?: string | null
          p_birth_place?: string | null
          p_birth_date?: string | null
          p_last_education?: string | null
          p_study_program?: string | null
          p_address_ktp?: string | null
          p_address_domicile?: string | null
          p_facebook?: string | null
          p_instagram?: string | null
          p_twitter?: string | null
          p_home_unit_id?: string | null
          p_employee_status?: string
          p_position_name?: string | null
          p_emergency_name?: string | null
          p_emergency_relation?: string | null
          p_emergency_phone?: string | null
          p_uniform_size?: string | null
          p_ktp_url?: string | null
          p_photo_url?: string | null
          p_drive_folder_id?: string | null
          p_note?: string | null
        }
        Returns: undefined
      }
      leave_recap_by_category_active_year: {
        Args: never
        Returns: { leave_category: string; total: number }[]
      }
      leave_recap_by_unit_active_year: {
        Args: never
        Returns: { unit_name: string; total: number }[]
      }
      leave_recap_stats_active_year: {
        Args: never
        Returns: { total_requests: number; avg_duration_days: number | null }[]
      }
      submit_leave_request: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_leave_category: string
          p_leave_time_type: Database["public"]["Enums"]["leave_time_type_enum"]
          p_reason: string
          p_unit_head_approved: boolean
          p_no_evidence_ack: boolean
        }
        Returns: string
      }
      review_leave_request: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["leave_request_status_enum"]
          p_note: string
        }
        Returns: undefined
      }
      my_leave_summary_active_year: {
        Args: never
        Returns: { leave_category: string; total: number }[]
      }
      unit_leave_counts_active_year: {
        Args: never
        Returns: {
          user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          total_leaves: number
        }[]
      }
      correction_recap_by_kind_active_year: {
        Args: never
        Returns: {
          correction_kind: Database["public"]["Enums"]["attendance_correction_kind_enum"]
          total: number
        }[]
      }
      correction_recap_by_unit_active_year: {
        Args: never
        Returns: { unit_name: string; total: number }[]
      }
      correction_recap_stats_active_year: {
        Args: never
        Returns: { total_requests: number; distinct_employees: number }[]
      }
      submit_attendance_correction: {
        Args: {
          p_event_date: string
          p_correction_kind: Database["public"]["Enums"]["attendance_correction_kind_enum"]
          p_time_scope: Database["public"]["Enums"]["attendance_time_scope_enum"]
          p_reason: string
          p_requested_check_in?: string | null
          p_requested_check_out?: string | null
        }
        Returns: string
      }
      review_attendance_correction: {
        Args: {
          p_id: string
          p_status: Database["public"]["Enums"]["attendance_correction_status_enum"]
          p_note: string
        }
        Returns: undefined
      }
      my_correction_summary_active_year: {
        Args: never
        Returns: {
          correction_kind: Database["public"]["Enums"]["attendance_correction_kind_enum"]
          total: number
        }[]
      }
      unit_correction_counts_active_year: {
        Args: never
        Returns: {
          user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          total_corrections: number
        }[]
      }
      unit_correction_day_recap_active_year: {
        Args: { p_start_date?: string | null; p_end_date?: string | null }
        Returns: {
          user_id: string
          full_name: string
          employee_no: string
          unit_name: string | null
          total_correction_days: number
          lupa_tap_days: number
          kartu_tertinggal_days: number
          kartu_hilang_rusak_days: number
          kendala_sistem_days: number
        }[]
      }
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
      leave_request_status_enum: "MENUNGGU" | "DISETUJUI" | "DITOLAK" | "PERLU_REVISI"
      leave_time_type_enum: "SEHARIAN_PENUH" | "DATANG_TERLAMBAT" | "PULANG_LEBIH_AWAL" | "SEBAGIAN_JAM_KERJA"
      leave_attachment_kind_enum: "BUKTI_IZIN" | "SS_KEPALA_UNIT"
      attendance_correction_status_enum: "MENUNGGU" | "DISETUJUI" | "DITOLAK"
      attendance_correction_kind_enum: "LUPA_TAP" | "KARTU_TERTINGGAL" | "KARTU_HILANG_RUSAK" | "KENDALA_SISTEM"
      attendance_time_scope_enum: "MASUK" | "PULANG" | "KEDUANYA"
      assignment_type_enum: "HOME" | "TEACHING"
      active_status_enum: "AKTIF" | "CUTI" | "NONAKTIF" | "RESIGN" | "DIBERHENTIKAN" | "PENSIUN"
      employee_registration_status_enum: "MENUNGGU" | "DISETUJUI" | "DITOLAK"
      employee_invite_status_enum: "AKTIF" | "TERPAKAI" | "KEDALUWARSA"
      employee_status_enum: "MAGANG" | "HONORER" | "CPTY" | "PTY"
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

// Convenience aliases
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
export type EmployeeLeave = Tables<"employee_leaves">

export type WorkStatementStatus = Database["public"]["Enums"]["work_statement_status_enum"]
export type UserRoleEnum = Database["public"]["Enums"]["user_role_enum"]
export type ActiveStatus = Database["public"]["Enums"]["active_status_enum"]
export type EmployeeStatus = Database["public"]["Enums"]["employee_status_enum"]
export type GenderEnum = Database["public"]["Enums"]["gender_enum"]
export type AssignmentType = Database["public"]["Enums"]["assignment_type_enum"]
export type ReviewAction = Database["public"]["Enums"]["review_action_enum"]









