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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      domain_memberships: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          domain_id: string
          id: string
          profile_id: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          domain_id: string
          id?: string
          profile_id: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          domain_id?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_memberships_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      employee_reports: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          profile_id: string
          report_date: string
          report_type: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          profile_id: string
          report_date: string
          report_type?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          profile_id?: string
          report_date?: string
          report_type?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_reports_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          assigned_to: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          domain_id: string | null
          expiry_date: string | null
          id: string
          license_key: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          quantity: number | null
          status: string | null
          vendor: string | null
        }
        Insert: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          domain_id?: string | null
          expiry_date?: string | null
          id?: string
          license_key?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number | null
          status?: string | null
          vendor?: string | null
        }
        Update: {
          assigned_to?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          domain_id?: string | null
          expiry_date?: string | null
          id?: string
          license_key?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number | null
          status?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          created_at: string | null
          description: string | null
          dns_servers: string[] | null
          domain_id: string
          gateway: string | null
          id: string
          name: string
          subnet: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dns_servers?: string[] | null
          domain_id: string
          gateway?: string | null
          id?: string
          name: string
          subnet?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dns_servers?: string[] | null
          domain_id?: string
          gateway?: string | null
          id?: string
          name?: string
          subnet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networks_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          skills: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          department?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      servers: {
        Row: {
          cpu: string | null
          created_at: string | null
          created_by: string | null
          disk_space: string | null
          environment: string | null
          id: string
          ip_address: string | null
          name: string
          network_id: string | null
          notes: string | null
          operating_system: string | null
          owner: string | null
          ram: string | null
          responsible_user: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cpu?: string | null
          created_at?: string | null
          created_by?: string | null
          disk_space?: string | null
          environment?: string | null
          id?: string
          ip_address?: string | null
          name: string
          network_id?: string | null
          notes?: string | null
          operating_system?: string | null
          owner?: string | null
          ram?: string | null
          responsible_user?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cpu?: string | null
          created_at?: string | null
          created_by?: string | null
          disk_space?: string | null
          environment?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          network_id?: string | null
          notes?: string | null
          operating_system?: string | null
          owner?: string | null
          ram?: string | null
          responsible_user?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "servers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servers_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          frequency: string | null
          id: string
          priority: string | null
          server_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          priority?: string | null
          server_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          frequency?: string | null
          id?: string
          priority?: string | null
          server_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      vacations: {
        Row: {
          approved_by: string | null
          created_at: string | null
          days_count: number | null
          end_date: string
          id: string
          notes: string | null
          profile_id: string
          start_date: string
          status: string | null
          vacation_type: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          days_count?: number | null
          end_date: string
          id?: string
          notes?: string | null
          profile_id: string
          start_date: string
          status?: string | null
          vacation_type?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          days_count?: number | null
          end_date?: string
          id?: string
          notes?: string | null
          profile_id?: string
          start_date?: string
          status?: string | null
          vacation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      yearly_goals: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          profile_id: string
          progress: number | null
          status: string | null
          title: string
          year: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id: string
          progress?: number | null
          status?: string | null
          title: string
          year: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          profile_id?: string
          progress?: number | null
          status?: string | null
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "yearly_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_domain: { Args: { _domain_id: string }; Returns: boolean }
      can_access_network: { Args: { _network_id: string }; Returns: boolean }
      get_my_profile_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "employee"
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
      app_role: ["admin", "employee"],
    },
  },
} as const
