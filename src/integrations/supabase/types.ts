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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_name: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_name?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      manager_assignments: {
        Row: {
          can_approve_purchases: boolean | null
          can_approve_vacations: boolean | null
          created_at: string | null
          employee_id: string
          id: string
          manager_id: string
        }
        Insert: {
          can_approve_purchases?: boolean | null
          can_approve_vacations?: boolean | null
          created_at?: string | null
          employee_id: string
          id?: string
          manager_id: string
        }
        Update: {
          can_approve_purchases?: boolean | null
          can_approve_vacations?: boolean | null
          created_at?: string | null
          employee_id?: string
          id?: string
          manager_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manager_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manager_assignments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          related_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          related_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      on_call_schedules: {
        Row: {
          created_at: string | null
          current_index: number | null
          id: string
          name: string
          rotation_type: string | null
          team_members: string[] | null
        }
        Insert: {
          created_at?: string | null
          current_index?: number | null
          id?: string
          name: string
          rotation_type?: string | null
          team_members?: string[] | null
        }
        Update: {
          created_at?: string | null
          current_index?: number | null
          id?: string
          name?: string
          rotation_type?: string | null
          team_members?: string[] | null
        }
        Relationships: []
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
      purchase_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          priority: string | null
          profile_id: string
          rejection_reason: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          profile_id: string
          rejection_reason?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string | null
          profile_id?: string
          rejection_reason?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          domain_id: string | null
          finished_at: string | null
          id: string
          ip_range: string
          name: string
          network_id: string | null
          scan_mode: string | null
          started_at: string | null
          status: string | null
          summary: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          domain_id?: string | null
          finished_at?: string | null
          id?: string
          ip_range: string
          name: string
          network_id?: string | null
          scan_mode?: string | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          domain_id?: string | null
          finished_at?: string | null
          id?: string
          ip_range?: string
          name?: string
          network_id?: string | null
          scan_mode?: string | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_jobs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_jobs_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_results: {
        Row: {
          created_at: string | null
          device_type: string | null
          hostname: string | null
          id: string
          ip_address: string
          is_imported: boolean | null
          last_seen: string | null
          mac_address: string | null
          open_ports: string[] | null
          os_type: string | null
          os_version: string | null
          raw_data: Json | null
          scan_job_id: string | null
          vendor: string | null
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          hostname?: string | null
          id?: string
          ip_address: string
          is_imported?: boolean | null
          last_seen?: string | null
          mac_address?: string | null
          open_ports?: string[] | null
          os_type?: string | null
          os_version?: string | null
          raw_data?: Json | null
          scan_job_id?: string | null
          vendor?: string | null
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          hostname?: string | null
          id?: string
          ip_address?: string
          is_imported?: boolean | null
          last_seen?: string | null
          mac_address?: string | null
          open_ports?: string[] | null
          os_type?: string | null
          os_version?: string | null
          raw_data?: Json | null
          scan_job_id?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_results_scan_job_id_fkey"
            columns: ["scan_job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          backup_frequency: string | null
          backup_job_name: string | null
          beneficiary_department: string | null
          business_owner: string | null
          cpu: string | null
          created_at: string | null
          created_by: string | null
          disk_space: string | null
          environment: string | null
          id: string
          ip_address: string | null
          is_backed_up_by_veeam: boolean | null
          last_backup_date: string | null
          last_backup_status: string | null
          name: string
          network_id: string | null
          notes: string | null
          operating_system: string | null
          owner: string | null
          primary_application: string | null
          ram: string | null
          responsible_user: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          backup_frequency?: string | null
          backup_job_name?: string | null
          beneficiary_department?: string | null
          business_owner?: string | null
          cpu?: string | null
          created_at?: string | null
          created_by?: string | null
          disk_space?: string | null
          environment?: string | null
          id?: string
          ip_address?: string | null
          is_backed_up_by_veeam?: boolean | null
          last_backup_date?: string | null
          last_backup_status?: string | null
          name: string
          network_id?: string | null
          notes?: string | null
          operating_system?: string | null
          owner?: string | null
          primary_application?: string | null
          ram?: string | null
          responsible_user?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_frequency?: string | null
          backup_job_name?: string | null
          beneficiary_department?: string | null
          business_owner?: string | null
          cpu?: string | null
          created_at?: string | null
          created_by?: string | null
          disk_space?: string | null
          environment?: string | null
          id?: string
          ip_address?: string | null
          is_backed_up_by_veeam?: boolean | null
          last_backup_date?: string | null
          last_backup_status?: string | null
          name?: string
          network_id?: string | null
          notes?: string | null
          operating_system?: string | null
          owner?: string | null
          primary_application?: string | null
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
      task_comments: {
        Row: {
          attachments: Json | null
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          task_id: string | null
        }
        Insert: {
          attachments?: Json | null
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          task_id?: string | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          checklist: Json | null
          created_at: string | null
          created_by: string | null
          default_assignee_id: string | null
          description: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
        }
        Insert: {
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_assignee_id?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
        }
        Update: {
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          default_assignee_id?: string | null
          description?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_default_assignee_id_fkey"
            columns: ["default_assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          checklist: Json | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          evidence: Json | null
          frequency: string | null
          id: string
          linked_license_id: string | null
          linked_network_id: string | null
          linked_server_id: string | null
          parent_task_id: string | null
          priority: string | null
          requester_id: string | null
          reviewer_id: string | null
          server_id: string | null
          sla_breached: boolean | null
          sla_resolve_hours: number | null
          sla_response_hours: number | null
          status: string | null
          task_status: string | null
          title: string
          updated_at: string | null
          watchers: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          checklist?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          evidence?: Json | null
          frequency?: string | null
          id?: string
          linked_license_id?: string | null
          linked_network_id?: string | null
          linked_server_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          requester_id?: string | null
          reviewer_id?: string | null
          server_id?: string | null
          sla_breached?: boolean | null
          sla_resolve_hours?: number | null
          sla_response_hours?: number | null
          status?: string | null
          task_status?: string | null
          title: string
          updated_at?: string | null
          watchers?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          checklist?: Json | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          evidence?: Json | null
          frequency?: string | null
          id?: string
          linked_license_id?: string | null
          linked_network_id?: string | null
          linked_server_id?: string | null
          parent_task_id?: string | null
          priority?: string | null
          requester_id?: string | null
          reviewer_id?: string | null
          server_id?: string | null
          sla_breached?: boolean | null
          sla_resolve_hours?: number | null
          sla_response_hours?: number | null
          status?: string | null
          task_status?: string | null
          title?: string
          updated_at?: string | null
          watchers?: string[] | null
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
            foreignKeyName: "tasks_linked_license_id_fkey"
            columns: ["linked_license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_linked_network_id_fkey"
            columns: ["linked_network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_linked_server_id_fkey"
            columns: ["linked_server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_reviewer_id_fkey"
            columns: ["reviewer_id"]
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
      website_applications: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          domain_id: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          url: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          url: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_applications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_applications_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
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
      is_manager_of: { Args: { _employee_id: string }; Returns: boolean }
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
