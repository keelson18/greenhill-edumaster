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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email: string | null
          actor_id: string | null
          actor_name: string
          created_at: string
          entity_id: string | null
          entity_label: string
          entity_type: string
          id: string
          metadata: Json
          summary: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string
          entity_type: string
          id?: string
          metadata?: Json
          summary?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity_id?: string | null
          entity_label?: string
          entity_type?: string
          id?: string
          metadata?: Json
          summary?: string
        }
        Relationships: []
      }
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
      homework: {
        Row: {
          assigned_on: string
          class_level: string
          created_at: string
          created_by: string | null
          description: string
          due_on: string
          id: string
          status: string
          subject_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_on?: string
          class_level: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_on: string
          id?: string
          status?: string
          subject_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_on?: string
          class_level?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_on?: string
          id?: string
          status?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category: string
          condition: string
          created_at: string
          id: string
          location: string
          name: string
          quantity: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string
          name: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          quantity?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          author: string
          available_copies: number
          category: string
          created_at: string
          id: string
          isbn: string | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author?: string
          available_copies?: number
          category?: string
          created_at?: string
          id?: string
          isbn?: string | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string
          available_copies?: number
          category?: string
          created_at?: string
          id?: string
          isbn?: string | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      library_loans: {
        Row: {
          book_id: string
          borrowed_on: string
          borrower_name: string
          created_at: string
          due_on: string
          id: string
          returned_on: string | null
          student_id: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          borrowed_on?: string
          borrower_name: string
          created_at?: string
          due_on: string
          id?: string
          returned_on?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          borrowed_on?: string
          borrower_name?: string
          created_at?: string
          due_on?: string
          id?: string
          returned_on?: string | null
          student_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_loans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
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
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_entries: {
        Row: {
          created_at: string
          gross_pay: number
          id: string
          income_tax: number
          net_pay: number
          period: string
          ssnit: number
          staff_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gross_pay?: number
          id?: string
          income_tax?: number
          net_pay?: number
          period: string
          ssnit?: number
          staff_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gross_pay?: number
          id?: string
          income_tax?: number
          net_pay?: number
          period?: string
          ssnit?: number
          staff_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
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
          is_suspended: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_suspended?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_suspended?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          department: string
          email: string | null
          full_name: string
          hired_on: string
          id: string
          job_title: string
          monthly_salary: number
          phone: string
          staff_no: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string
          email?: string | null
          full_name: string
          hired_on?: string
          id?: string
          job_title: string
          monthly_salary?: number
          phone?: string
          staff_no: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string | null
          full_name?: string
          hired_on?: string
          id?: string
          job_title?: string
          monthly_salary?: number
          phone?: string
          staff_no?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      staff_attendance: {
        Row: {
          attended_on: string
          created_at: string
          id: string
          note: string | null
          recorded_by: string | null
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          attended_on?: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          attended_on?: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      student_attendance: {
        Row: {
          attended_on: string
          class_level: string
          created_at: string
          id: string
          note: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          attended_on?: string
          class_level: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          attended_on?: string
          class_level?: string
          created_at?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          relationship: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          relationship?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          relationship?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_no: string
          admitted_on: string
          created_at: string
          date_of_birth: string | null
          district: string | null
          fee_billed: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          ges_id: string
          ghana_post_gps: string | null
          grade_level: string
          guardian_name: string
          guardian_phone: string
          id: string
          region: string | null
          status: Database["public"]["Enums"]["student_status"]
          stream: string
          town: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admission_no: string
          admitted_on?: string
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          fee_billed?: number
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          ges_id: string
          ghana_post_gps?: string | null
          grade_level: string
          guardian_name: string
          guardian_phone: string
          id?: string
          region?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string
          town?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admission_no?: string
          admitted_on?: string
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          fee_billed?: number
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          ges_id?: string
          ghana_post_gps?: string | null
          grade_level?: string
          guardian_name?: string
          guardian_phone?: string
          id?: string
          region?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          stream?: string
          town?: string | null
          updated_at?: string
          user_id?: string | null
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
      timetable_slots: {
        Row: {
          class_level: string
          created_at: string
          day_of_week: string
          ends_at: string
          id: string
          period: number
          room: string | null
          staff_id: string | null
          starts_at: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          class_level: string
          created_at?: string
          day_of_week: string
          ends_at: string
          id?: string
          period: number
          room?: string | null
          staff_id?: string | null
          starts_at: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          class_level?: string
          created_at?: string
          day_of_week?: string
          ends_at?: string
          id?: string
          period?: number
          room?: string | null
          staff_id?: string | null
          starts_at?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          capacity: number
          created_at: string
          driver_name: string
          driver_phone: string
          id: string
          learners: number
          name: string
          status: string
          updated_at: string
          vehicle_reg: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver_name: string
          driver_phone?: string
          id?: string
          learners?: number
          name: string
          status?: string
          updated_at?: string
          vehicle_reg: string
        }
        Update: {
          capacity?: number
          created_at?: string
          driver_name?: string
          driver_phone?: string
          id?: string
          learners?: number
          name?: string
          status?: string
          updated_at?: string
          vehicle_reg?: string
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
      can_view_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_finance: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      term_dashboard_stats: { Args: { _term_code: string }; Returns: Json }
      term_grade_performance: {
        Args: { _term_code: string }
        Returns: {
          grade_level: string
          mean_score: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "teacher"
        | "student"
        | "parent"
        | "accountant"
        | "librarian"
        | "staff"
      attendance_status: "present" | "absent" | "late" | "excused"
      audit_action:
        | "role_assigned"
        | "user_suspended"
        | "user_reinstated"
        | "user_deleted"
        | "user_updated"
        | "term_locked"
        | "term_unlocked"
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
      app_role: [
        "super_admin",
        "admin",
        "teacher",
        "student",
        "parent",
        "accountant",
        "librarian",
        "staff",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      audit_action: [
        "role_assigned",
        "user_suspended",
        "user_reinstated",
        "user_deleted",
        "user_updated",
        "term_locked",
        "term_unlocked",
      ],
      exam_status: ["Draft", "Active", "Marking", "Completed"],
      gender: ["Male", "Female"],
      student_status: ["Active", "Suspended", "Transferred"],
      term_status: ["Closed", "Current", "Upcoming"],
    },
  },
} as const
