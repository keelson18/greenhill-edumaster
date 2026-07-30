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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          ends_on: string
          grade_scope: string
          id: string
          name: string
          starts_on: string
          status: Database["public"]["Enums"]["exam_status"]
          term_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_on: string
          grade_scope?: string
          id?: string
          name: string
          starts_on: string
          status?: Database["public"]["Enums"]["exam_status"]
          term_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_on?: string
          grade_scope?: string
          id?: string
          name?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["exam_status"]
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          paid_at: string
          recorded_by: string | null
          reference: string | null
          student_id: string
          term_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          student_id: string
          term_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          paid_at?: string
          recorded_by?: string | null
          reference?: string | null
          student_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      marks: {
        Row: {
          created_at: string
          entered_by: string | null
          exam_id: string
          id: string
          score: number
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_by?: string | null
          exam_id: string
          id?: string
          score: number
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_by?: string | null
          exam_id?: string
          id?: string
          score?: number
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          admission_no: string
          admitted_on: string
          county: string | null
          created_at: string
          date_of_birth: string | null
          fee_billed: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          grade_level: string
          guardian_name: string
          guardian_phone: string
          id: string
          nemis_no: string
          status: Database["public"]["Enums"]["student_status"]
          stream: string
          updated_at: string
        }
        Insert: {
          admission_no: string
          admitted_on?: string
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          fee_billed?: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          grade_level: string
          guardian_name: string
          guardian_phone: string
          id?: string
          nemis_no: string
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string
          updated_at?: string
        }
        Update: {
          admission_no?: string
          admitted_on?: string
          county?: string | null
          created_at?: string
          date_of_birth?: string | null
          fee_billed?: number
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          grade_level?: string
          guardian_name?: string
          guardian_phone?: string
          id?: string
          nemis_no?: string
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string
          updated_at?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      terms: {
        Row: {
          code: string
          created_at: string
          ends_on: string
          id: string
          is_locked: boolean
          label: string
          locked_at: string | null
          locked_by: string | null
          short_label: string
          starts_on: string
          status: Database["public"]["Enums"]["term_status"]
          updated_at: string
          year: number
        }
        Insert: {
          code: string
          created_at?: string
          ends_on: string
          id?: string
          is_locked?: boolean
          label: string
          locked_at?: string | null
          locked_by?: string | null
          short_label: string
          starts_on: string
          status?: Database["public"]["Enums"]["term_status"]
          updated_at?: string
          year: number
        }
        Update: {
          code?: string
          created_at?: string
          ends_on?: string
          id?: string
          is_locked?: boolean
          label?: string
          locked_at?: string | null
          locked_by?: string | null
          short_label?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["term_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher" | "parent"
      exam_status: "Draft" | "Active" | "Marking" | "Completed"
      gender: "Male" | "Female"
      student_status: "Active" | "Suspended" | "Transferred"
      term_status: "Closed" | "Current" | "Upcoming"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "parent"],
      exam_status: ["Draft", "Active", "Marking", "Completed"],
      gender: ["Male", "Female"],
      student_status: ["Active", "Suspended", "Transferred"],
      term_status: ["Closed", "Current", "Upcoming"],
    },
  },
} as const
