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
          user_email: string | null
          user_id: string | null
          user_name: string | null
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
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
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
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
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
      branch_memberships: {
        Row: {
          branch_id: string
          branch_role: Database["public"]["Enums"]["branch_role"]
          created_at: string | null
          id: string
          profile_id: string
        }
        Insert: {
          branch_id: string
          branch_role?: Database["public"]["Enums"]["branch_role"]
          created_at?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          branch_id?: string
          branch_role?: Database["public"]["Enums"]["branch_role"]
          created_at?: string | null
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_memberships_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string | null
          code: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          notes: string | null
          region: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          code: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          region?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      change_requests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          maintenance_window_id: string | null
          priority: string | null
          requested_by: string | null
          risk_assessment: string | null
          rollback_plan: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          maintenance_window_id?: string | null
          priority?: string | null
          requested_by?: string | null
          risk_assessment?: string | null
          rollback_plan?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          maintenance_window_id?: string | null
          priority?: string | null
          requested_by?: string | null
          risk_assessment?: string | null
          rollback_plan?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_maintenance_window_id_fkey"
            columns: ["maintenance_window_id"]
            isOneToOne: false
            referencedRelation: "maintenance_windows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_nodes: {
        Row: {
          cluster_id: string
          cpu_cores: number | null
          cpu_sockets: number | null
          created_at: string | null
          domain_id: string
          id: string
          ilo_idrac_ip: string | null
          mgmt_ip: string | null
          model: string | null
          name: string
          node_role: string | null
          ram_gb: number | null
          serial_number: string | null
          server_ref_id: string | null
          status: string | null
          storage_total_tb: number | null
          storage_used_tb: number | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          cluster_id: string
          cpu_cores?: number | null
          cpu_sockets?: number | null
          created_at?: string | null
          domain_id: string
          id?: string
          ilo_idrac_ip?: string | null
          mgmt_ip?: string | null
          model?: string | null
          name: string
          node_role?: string | null
          ram_gb?: number | null
          serial_number?: string | null
          server_ref_id?: string | null
          status?: string | null
          storage_total_tb?: number | null
          storage_used_tb?: number | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          cluster_id?: string
          cpu_cores?: number | null
          cpu_sockets?: number | null
          created_at?: string | null
          domain_id?: string
          id?: string
          ilo_idrac_ip?: string | null
          mgmt_ip?: string | null
          model?: string | null
          name?: string
          node_role?: string | null
          ram_gb?: number | null
          serial_number?: string | null
          server_ref_id?: string | null
          status?: string | null
          storage_total_tb?: number | null
          storage_used_tb?: number | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cluster_nodes_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_nodes_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_nodes_server_ref_id_fkey"
            columns: ["server_ref_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          cluster_type: string | null
          created_at: string | null
          created_by: string | null
          datacenter_id: string | null
          domain_id: string
          hypervisor_version: string | null
          id: string
          name: string
          node_count: number | null
          notes: string | null
          platform_version: string | null
          rf_level: string | null
          storage_type: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          cluster_type?: string | null
          created_at?: string | null
          created_by?: string | null
          datacenter_id?: string | null
          domain_id: string
          hypervisor_version?: string | null
          id?: string
          name: string
          node_count?: number | null
          notes?: string | null
          platform_version?: string | null
          rf_level?: string | null
          storage_type?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          cluster_type?: string | null
          created_at?: string | null
          created_by?: string | null
          datacenter_id?: string | null
          domain_id?: string
          hypervisor_version?: string | null
          id?: string
          name?: string
          node_count?: number | null
          notes?: string | null
          platform_version?: string | null
          rf_level?: string | null
          storage_type?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clusters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_datacenter_id_fkey"
            columns: ["datacenter_id"]
            isOneToOne: false
            referencedRelation: "datacenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clusters_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_test_runs: {
        Row: {
          created_at: string | null
          domain_id: string
          error_details: Json | null
          fileshare_id: string | null
          id: string
          latency_ms: number | null
          ldap_config_id: string | null
          mail_config_id: string | null
          message: string | null
          module: string
          ntp_config_id: string | null
          requested_by: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          domain_id: string
          error_details?: Json | null
          fileshare_id?: string | null
          id?: string
          latency_ms?: number | null
          ldap_config_id?: string | null
          mail_config_id?: string | null
          message?: string | null
          module: string
          ntp_config_id?: string | null
          requested_by?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          domain_id?: string
          error_details?: Json | null
          fileshare_id?: string | null
          id?: string
          latency_ms?: number | null
          ldap_config_id?: string | null
          mail_config_id?: string | null
          message?: string | null
          module?: string
          ntp_config_id?: string | null
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_test_runs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_test_runs_fileshare_id_fkey"
            columns: ["fileshare_id"]
            isOneToOne: false
            referencedRelation: "file_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_test_runs_ldap_config_id_fkey"
            columns: ["ldap_config_id"]
            isOneToOne: false
            referencedRelation: "ldap_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_test_runs_mail_config_id_fkey"
            columns: ["mail_config_id"]
            isOneToOne: false
            referencedRelation: "mail_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_test_runs_ntp_config_id_fkey"
            columns: ["ntp_config_id"]
            isOneToOne: false
            referencedRelation: "ntp_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_test_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      datacenters: {
        Row: {
          certifications: string[] | null
          contact_person: string | null
          cooling_type: string | null
          created_at: string | null
          created_by: string | null
          domain_id: string
          emergency_contact: string | null
          floor_space_sqm: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          power_capacity_kw: number | null
          rack_count: number | null
          tier_level: string | null
          updated_at: string | null
        }
        Insert: {
          certifications?: string[] | null
          contact_person?: string | null
          cooling_type?: string | null
          created_at?: string | null
          created_by?: string | null
          domain_id: string
          emergency_contact?: string | null
          floor_space_sqm?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          power_capacity_kw?: number | null
          rack_count?: number | null
          tier_level?: string | null
          updated_at?: string | null
        }
        Update: {
          certifications?: string[] | null
          contact_person?: string | null
          cooling_type?: string | null
          created_at?: string | null
          created_by?: string | null
          domain_id?: string
          emergency_contact?: string | null
          floor_space_sqm?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          power_capacity_kw?: number | null
          rack_count?: number | null
          tier_level?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datacenters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "datacenters_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_memberships: {
        Row: {
          can_edit: boolean | null
          created_at: string | null
          domain_id: string
          domain_role: string | null
          id: string
          profile_id: string
        }
        Insert: {
          can_edit?: boolean | null
          created_at?: string | null
          domain_id: string
          domain_role?: string | null
          id?: string
          profile_id: string
        }
        Update: {
          can_edit?: boolean | null
          created_at?: string | null
          domain_id?: string
          domain_role?: string | null
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
          branch_id: string
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          branch_id: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          branch_id?: string
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_domains_branch"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
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
      escalation_rules: {
        Row: {
          created_at: string | null
          id: string
          level: number
          notify_method: string | null
          notify_profile_id: string | null
          schedule_id: string
          wait_minutes: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          level: number
          notify_method?: string | null
          notify_profile_id?: string | null
          schedule_id: string
          wait_minutes?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          notify_method?: string | null
          notify_profile_id?: string | null
          schedule_id?: string
          wait_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_notify_profile_id_fkey"
            columns: ["notify_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalation_rules_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "on_call_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      file_shares: {
        Row: {
          agent_id: string | null
          created_at: string | null
          created_by: string | null
          credential_vault_id: string | null
          domain_id: string
          exclude_patterns: string[] | null
          id: string
          is_enabled: boolean | null
          maintenance_window_id: string | null
          name: string
          path: string
          scan_depth: number | null
          scan_mode: string
          schedule_cron: string | null
          share_type: string
          smb_password_encrypted: string | null
          smb_username: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_vault_id?: string | null
          domain_id: string
          exclude_patterns?: string[] | null
          id?: string
          is_enabled?: boolean | null
          maintenance_window_id?: string | null
          name: string
          path: string
          scan_depth?: number | null
          scan_mode: string
          schedule_cron?: string | null
          share_type: string
          smb_password_encrypted?: string | null
          smb_username?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_vault_id?: string | null
          domain_id?: string
          exclude_patterns?: string[] | null
          id?: string
          is_enabled?: boolean | null
          maintenance_window_id?: string | null
          name?: string
          path?: string
          scan_depth?: number | null
          scan_mode?: string
          schedule_cron?: string | null
          share_type?: string
          smb_password_encrypted?: string | null
          smb_username?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_shares_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "scan_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_credential_vault_id_fkey"
            columns: ["credential_vault_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_shares_maintenance_window_id_fkey"
            columns: ["maintenance_window_id"]
            isOneToOne: false
            referencedRelation: "maintenance_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      fileshare_scans: {
        Row: {
          agent_id: string | null
          created_at: string | null
          created_by: string | null
          domain_id: string | null
          error_code: string | null
          file_share_id: string
          finished_at: string | null
          id: string
          log_text: string | null
          progress_percent: number | null
          scan_mode: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          domain_id?: string | null
          error_code?: string | null
          file_share_id: string
          finished_at?: string | null
          id?: string
          log_text?: string | null
          progress_percent?: number | null
          scan_mode: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          created_by?: string | null
          domain_id?: string | null
          error_code?: string | null
          file_share_id?: string
          finished_at?: string | null
          id?: string
          log_text?: string | null
          progress_percent?: number | null
          scan_mode?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fileshare_scans_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "scan_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fileshare_scans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fileshare_scans_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fileshare_scans_file_share_id_fkey"
            columns: ["file_share_id"]
            isOneToOne: false
            referencedRelation: "file_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_stats: {
        Row: {
          depth: number | null
          files_count: number | null
          folders_count: number | null
          id: string
          name: string
          parent_id: string | null
          path: string
          percent_of_share: number | null
          size_bytes: number | null
          snapshot_id: string
        }
        Insert: {
          depth?: number | null
          files_count?: number | null
          folders_count?: number | null
          id?: string
          name: string
          parent_id?: string | null
          path: string
          percent_of_share?: number | null
          size_bytes?: number | null
          snapshot_id: string
        }
        Update: {
          depth?: number | null
          files_count?: number | null
          folders_count?: number | null
          id?: string
          name?: string
          parent_id?: string | null
          path?: string
          percent_of_share?: number | null
          size_bytes?: number | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_stats_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folder_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_stats_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "scan_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      import_batches: {
        Row: {
          created_at: string | null
          created_count: number | null
          employee_id: string | null
          entity_type: string
          failed_count: number | null
          id: string
          import_data: Json | null
          imported_by: string | null
          updated_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_count?: number | null
          employee_id?: string | null
          entity_type: string
          failed_count?: number | null
          id?: string
          import_data?: Json | null
          imported_by?: string | null
          updated_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_count?: number | null
          employee_id?: string | null
          entity_type?: string
          failed_count?: number | null
          id?: string
          import_data?: Json | null
          imported_by?: string | null
          updated_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      infra_snapshots: {
        Row: {
          captured_at: string | null
          cluster_id: string
          domain_id: string
          id: string
          notes: string | null
          total_cpu_cores: number | null
          total_ram_gb: number | null
          total_storage_tb: number | null
          used_cpu_cores: number | null
          used_ram_gb: number | null
          used_storage_tb: number | null
        }
        Insert: {
          captured_at?: string | null
          cluster_id: string
          domain_id: string
          id?: string
          notes?: string | null
          total_cpu_cores?: number | null
          total_ram_gb?: number | null
          total_storage_tb?: number | null
          used_cpu_cores?: number | null
          used_ram_gb?: number | null
          used_storage_tb?: number | null
        }
        Update: {
          captured_at?: string | null
          cluster_id?: string
          domain_id?: string
          id?: string
          notes?: string | null
          total_cpu_cores?: number | null
          total_ram_gb?: number | null
          total_storage_tb?: number | null
          used_cpu_cores?: number | null
          used_ram_gb?: number | null
          used_storage_tb?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "infra_snapshots_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infra_snapshots_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      ldap_configs: {
        Row: {
          base_dn: string | null
          bind_dn: string | null
          created_at: string | null
          created_by: string | null
          domain_id: string
          host: string
          id: string
          is_active: boolean | null
          name: string
          port: number | null
          updated_at: string | null
          use_tls: boolean | null
        }
        Insert: {
          base_dn?: string | null
          bind_dn?: string | null
          created_at?: string | null
          created_by?: string | null
          domain_id: string
          host: string
          id?: string
          is_active?: boolean | null
          name: string
          port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Update: {
          base_dn?: string | null
          bind_dn?: string | null
          created_at?: string | null
          created_by?: string | null
          domain_id?: string
          host?: string
          id?: string
          is_active?: boolean | null
          name?: string
          port?: number | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ldap_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ldap_configs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
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
      mail_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          domain_id: string
          from_email: string | null
          from_name: string | null
          id: string
          is_active: boolean | null
          name: string
          smtp_host: string
          smtp_password_encrypted: string | null
          smtp_port: number | null
          smtp_username: string | null
          updated_at: string | null
          use_tls: boolean | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          domain_id: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          smtp_host: string
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          domain_id?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          smtp_host?: string
          smtp_password_encrypted?: string | null
          smtp_port?: number | null
          smtp_username?: string | null
          updated_at?: string | null
          use_tls?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mail_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mail_configs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_windows: {
        Row: {
          affected_servers: string[] | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          domain_id: string | null
          end_time: string
          id: string
          impact_level: string | null
          notes: string | null
          recurrence: string | null
          start_time: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          affected_servers?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          end_time: string
          id?: string
          impact_level?: string | null
          notes?: string | null
          recurrence?: string | null
          start_time: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          affected_servers?: string[] | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain_id?: string | null
          end_time?: string
          id?: string
          impact_level?: string | null
          notes?: string | null
          recurrence?: string | null
          start_time?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_windows_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_windows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_windows_domain_id_fkey"
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
          cluster_id: string
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
          cluster_id: string
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
          cluster_id?: string
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
            foreignKeyName: "fk_networks_cluster"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
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
      ntp_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          domain_id: string
          id: string
          is_active: boolean | null
          name: string
          servers: string[]
          sync_interval_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          domain_id: string
          id?: string
          is_active?: boolean | null
          name: string
          servers?: string[]
          sync_interval_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          domain_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          servers?: string[]
          sync_interval_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ntp_configs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ntp_configs_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      on_call_assignments: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          order_index: number | null
          profile_id: string
          role: string | null
          schedule_id: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          order_index?: number | null
          profile_id: string
          role?: string | null
          schedule_id: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          order_index?: number | null
          profile_id?: string
          role?: string | null
          schedule_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "on_call_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_assignments_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "on_call_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      on_call_schedules: {
        Row: {
          created_at: string | null
          created_by: string | null
          current_index: number | null
          domain_id: string | null
          id: string
          is_active: boolean | null
          name: string
          rotation_type: string | null
          start_date: string | null
          team_members: string[] | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          current_index?: number | null
          domain_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          rotation_type?: string | null
          start_date?: string | null
          team_members?: string[] | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          current_index?: number | null
          domain_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          rotation_type?: string | null
          start_date?: string | null
          team_members?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "on_call_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "on_call_schedules_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_activity_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          request_id: string
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          request_id: string
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_activity_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_activity_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_quotations: {
        Row: {
          created_at: string | null
          currency: string | null
          discount: number | null
          file_path: string
          id: string
          original_filename: string
          quotation_ref: string | null
          quote_date: string | null
          request_id: string
          shipping: number | null
          subtotal: number | null
          tax: number | null
          total: number | null
          uploaded_by: string | null
          valid_until: string | null
          vendor_name: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          discount?: number | null
          file_path: string
          id?: string
          original_filename: string
          quotation_ref?: string | null
          quote_date?: string | null
          request_id: string
          shipping?: number | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          uploaded_by?: string | null
          valid_until?: string | null
          vendor_name: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          discount?: number | null
          file_path?: string
          id?: string
          original_filename?: string
          quotation_ref?: string | null
          quote_date?: string | null
          request_id?: string
          shipping?: number | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          uploaded_by?: string | null
          valid_until?: string | null
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "procurement_quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_quotations_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_request_items: {
        Row: {
          created_at: string | null
          estimated_unit_price: number | null
          id: string
          item_name: string
          quantity: number
          request_id: string
          specs: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_name: string
          quantity?: number
          request_id: string
          specs?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_unit_price?: number | null
          id?: string
          item_name?: string
          quantity?: number
          request_id?: string
          specs?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_request_items_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "procurement_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      procurement_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          description: string | null
          domain_id: string
          id: string
          needed_by: string | null
          priority: string | null
          rejection_reason: string | null
          request_number: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          domain_id: string
          id?: string
          needed_by?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_number: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          description?: string | null
          domain_id?: string
          id?: string
          needed_by?: string | null
          priority?: string | null
          rejection_reason?: string | null
          request_number?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procurement_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procurement_requests_domain_id_fkey"
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
      report_upload_rows: {
        Row: {
          created_at: string | null
          errors: string[] | null
          id: string
          payload: Json | null
          report_upload_id: string
          row_number: number
          status: string
        }
        Insert: {
          created_at?: string | null
          errors?: string[] | null
          id?: string
          payload?: Json | null
          report_upload_id: string
          row_number: number
          status: string
        }
        Update: {
          created_at?: string | null
          errors?: string[] | null
          id?: string
          payload?: Json | null
          report_upload_id?: string
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_upload_rows_report_upload_id_fkey"
            columns: ["report_upload_id"]
            isOneToOne: false
            referencedRelation: "report_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      report_uploads: {
        Row: {
          created_at: string | null
          domain_id: string | null
          employee_id: string | null
          file_path: string
          id: string
          import_summary: Json | null
          imported_rows: number | null
          original_filename: string
          rejected_rows: number | null
          uploaded_by: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          domain_id?: string | null
          employee_id?: string | null
          file_path: string
          id?: string
          import_summary?: Json | null
          imported_rows?: number | null
          original_filename: string
          rejected_rows?: number | null
          uploaded_by?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          domain_id?: string | null
          employee_id?: string | null
          file_path?: string
          id?: string
          import_summary?: Json | null
          imported_rows?: number | null
          original_filename?: string
          rejected_rows?: number | null
          uploaded_by?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_uploads_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_uploads_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_agents: {
        Row: {
          auth_token_hash: string
          created_at: string | null
          created_by: string | null
          domain_id: string
          id: string
          last_seen_at: string | null
          name: string
          site_tag: string | null
          status: string | null
          version: string | null
        }
        Insert: {
          auth_token_hash: string
          created_at?: string | null
          created_by?: string | null
          domain_id: string
          id?: string
          last_seen_at?: string | null
          name: string
          site_tag?: string | null
          status?: string | null
          version?: string | null
        }
        Update: {
          auth_token_hash?: string
          created_at?: string | null
          created_by?: string | null
          domain_id?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          site_tag?: string | null
          status?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_agents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_agents_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
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
          domain_id: string | null
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
          domain_id?: string | null
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
          domain_id?: string | null
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
            foreignKeyName: "scan_results_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_results_scan_job_id_fkey"
            columns: ["scan_job_id"]
            isOneToOne: false
            referencedRelation: "scan_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_snapshots: {
        Row: {
          created_at: string | null
          file_share_id: string
          id: string
          scan_id: string
          total_bytes: number | null
          total_files: number | null
          total_folders: number | null
        }
        Insert: {
          created_at?: string | null
          file_share_id: string
          id?: string
          scan_id: string
          total_bytes?: number | null
          total_files?: number | null
          total_folders?: number | null
        }
        Update: {
          created_at?: string | null
          file_share_id?: string
          id?: string
          scan_id?: string
          total_bytes?: number | null
          total_files?: number | null
          total_folders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_snapshots_file_share_id_fkey"
            columns: ["file_share_id"]
            isOneToOne: false
            referencedRelation: "file_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_snapshots_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "fileshare_scans"
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
          contract_id: string | null
          cpu: string | null
          created_at: string | null
          created_by: string | null
          disk_space: string | null
          environment: string | null
          eol_date: string | null
          eos_date: string | null
          id: string
          ip_address: string | null
          is_backed_up_by_veeam: boolean | null
          last_backup_date: string | null
          last_backup_status: string | null
          last_restore_test: string | null
          model: string | null
          name: string
          network_id: string
          notes: string | null
          operating_system: string | null
          owner: string | null
          primary_application: string | null
          purchase_date: string | null
          ram: string | null
          responsible_user: string | null
          rpo_hours: number | null
          rto_hours: number | null
          serial_number: string | null
          server_role: string[] | null
          status: string | null
          support_level: string | null
          updated_at: string | null
          vendor: string | null
          warranty_end: string | null
        }
        Insert: {
          backup_frequency?: string | null
          backup_job_name?: string | null
          beneficiary_department?: string | null
          business_owner?: string | null
          contract_id?: string | null
          cpu?: string | null
          created_at?: string | null
          created_by?: string | null
          disk_space?: string | null
          environment?: string | null
          eol_date?: string | null
          eos_date?: string | null
          id?: string
          ip_address?: string | null
          is_backed_up_by_veeam?: boolean | null
          last_backup_date?: string | null
          last_backup_status?: string | null
          last_restore_test?: string | null
          model?: string | null
          name: string
          network_id: string
          notes?: string | null
          operating_system?: string | null
          owner?: string | null
          primary_application?: string | null
          purchase_date?: string | null
          ram?: string | null
          responsible_user?: string | null
          rpo_hours?: number | null
          rto_hours?: number | null
          serial_number?: string | null
          server_role?: string[] | null
          status?: string | null
          support_level?: string | null
          updated_at?: string | null
          vendor?: string | null
          warranty_end?: string | null
        }
        Update: {
          backup_frequency?: string | null
          backup_job_name?: string | null
          beneficiary_department?: string | null
          business_owner?: string | null
          contract_id?: string | null
          cpu?: string | null
          created_at?: string | null
          created_by?: string | null
          disk_space?: string | null
          environment?: string | null
          eol_date?: string | null
          eos_date?: string | null
          id?: string
          ip_address?: string | null
          is_backed_up_by_veeam?: boolean | null
          last_backup_date?: string | null
          last_backup_status?: string | null
          last_restore_test?: string | null
          model?: string | null
          name?: string
          network_id?: string
          notes?: string | null
          operating_system?: string | null
          owner?: string | null
          primary_application?: string | null
          purchase_date?: string | null
          ram?: string | null
          responsible_user?: string | null
          rpo_hours?: number | null
          rto_hours?: number | null
          serial_number?: string | null
          server_role?: string[] | null
          status?: string | null
          support_level?: string | null
          updated_at?: string | null
          vendor?: string | null
          warranty_end?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_servers_network"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
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
      system_health_checks: {
        Row: {
          check_type: string
          checked_by: string | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          id: string
          latency_ms: number | null
          status: string
        }
        Insert: {
          check_type: string
          checked_by?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          status: string
        }
        Update: {
          check_type?: string
          checked_by?: string | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_health_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_balances: {
        Row: {
          annual_balance: number | null
          created_at: string | null
          created_by: string | null
          emergency_balance: number | null
          id: string
          notes: string | null
          profile_id: string
          sick_balance: number | null
          updated_at: string | null
          used_annual: number | null
          used_emergency: number | null
          used_sick: number | null
          year: number
        }
        Insert: {
          annual_balance?: number | null
          created_at?: string | null
          created_by?: string | null
          emergency_balance?: number | null
          id?: string
          notes?: string | null
          profile_id: string
          sick_balance?: number | null
          updated_at?: string | null
          used_annual?: number | null
          used_emergency?: number | null
          used_sick?: number | null
          year?: number
        }
        Update: {
          annual_balance?: number | null
          created_at?: string | null
          created_by?: string | null
          emergency_balance?: number | null
          id?: string
          notes?: string | null
          profile_id?: string
          sick_balance?: number | null
          updated_at?: string | null
          used_annual?: number | null
          used_emergency?: number | null
          used_sick?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacation_balances_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      vault_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          vault_item_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          vault_item_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          vault_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_audit_logs_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_item_secrets: {
        Row: {
          created_at: string | null
          id: string
          notes_encrypted: string | null
          notes_iv: string | null
          password_encrypted: string | null
          password_iv: string | null
          updated_at: string | null
          username_encrypted: string | null
          username_iv: string | null
          vault_item_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes_encrypted?: string | null
          notes_iv?: string | null
          password_encrypted?: string | null
          password_iv?: string | null
          updated_at?: string | null
          username_encrypted?: string | null
          username_iv?: string | null
          vault_item_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes_encrypted?: string | null
          notes_iv?: string | null
          password_encrypted?: string | null
          password_iv?: string | null
          updated_at?: string | null
          username_encrypted?: string | null
          username_iv?: string | null
          vault_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_item_secrets_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: true
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_items: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          item_type: string
          last_password_reveal: string | null
          linked_application_id: string | null
          linked_network_id: string | null
          linked_server_id: string | null
          notes: string | null
          owner_id: string
          password_encrypted: string | null
          password_iv: string | null
          password_reveal_count: number | null
          requires_2fa_reveal: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
          url: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_type?: string
          last_password_reveal?: string | null
          linked_application_id?: string | null
          linked_network_id?: string | null
          linked_server_id?: string | null
          notes?: string | null
          owner_id: string
          password_encrypted?: string | null
          password_iv?: string | null
          password_reveal_count?: number | null
          requires_2fa_reveal?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          url?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          item_type?: string
          last_password_reveal?: string | null
          linked_application_id?: string | null
          linked_network_id?: string | null
          linked_server_id?: string | null
          notes?: string | null
          owner_id?: string
          password_encrypted?: string | null
          password_iv?: string | null
          password_reveal_count?: number | null
          requires_2fa_reveal?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_linked_application_id_fkey"
            columns: ["linked_application_id"]
            isOneToOne: false
            referencedRelation: "website_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_linked_network_id_fkey"
            columns: ["linked_network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_linked_server_id_fkey"
            columns: ["linked_server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_permissions: {
        Row: {
          can_edit: boolean | null
          can_reveal: boolean | null
          can_view: boolean | null
          created_at: string | null
          created_by: string | null
          id: string
          permission_level: string | null
          profile_id: string
          revoked_at: string | null
          vault_item_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_reveal?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_level?: string | null
          profile_id: string
          revoked_at?: string | null
          vault_item_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_reveal?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          permission_level?: string | null
          profile_id?: string
          revoked_at?: string | null
          vault_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vault_permissions_vault_item_id_fkey"
            columns: ["vault_item_id"]
            isOneToOne: false
            referencedRelation: "vault_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      vms: {
        Row: {
          beneficiary: string | null
          cluster_id: string
          created_at: string | null
          disk_total_gb: number | null
          domain_id: string
          environment: string | null
          host_node_id: string | null
          id: string
          ip_address: string | null
          name: string
          os: string | null
          owner_department: string | null
          ram_gb: number | null
          server_ref_id: string | null
          status: string | null
          tags: string[] | null
          updated_at: string | null
          vcpu: number | null
        }
        Insert: {
          beneficiary?: string | null
          cluster_id: string
          created_at?: string | null
          disk_total_gb?: number | null
          domain_id: string
          environment?: string | null
          host_node_id?: string | null
          id?: string
          ip_address?: string | null
          name: string
          os?: string | null
          owner_department?: string | null
          ram_gb?: number | null
          server_ref_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          vcpu?: number | null
        }
        Update: {
          beneficiary?: string | null
          cluster_id?: string
          created_at?: string | null
          disk_total_gb?: number | null
          domain_id?: string
          environment?: string | null
          host_node_id?: string | null
          id?: string
          ip_address?: string | null
          name?: string
          os?: string | null
          owner_department?: string | null
          ram_gb?: number | null
          server_ref_id?: string | null
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          vcpu?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vms_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vms_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vms_host_node_id_fkey"
            columns: ["host_node_id"]
            isOneToOne: false
            referencedRelation: "cluster_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vms_server_ref_id_fkey"
            columns: ["server_ref_id"]
            isOneToOne: false
            referencedRelation: "servers"
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
          sort_order: number | null
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
          sort_order?: number | null
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
          sort_order?: number | null
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
      can_access_branch: { Args: { _branch_id: string }; Returns: boolean }
      can_access_domain: { Args: { _domain_id: string }; Returns: boolean }
      can_access_network: { Args: { _network_id: string }; Returns: boolean }
      can_access_node: { Args: { _node_id: string }; Returns: boolean }
      can_access_server: { Args: { _server_id: string }; Returns: boolean }
      can_access_vm: { Args: { _vm_id: string }; Returns: boolean }
      can_edit_domain: { Args: { _domain_id: string }; Returns: boolean }
      can_edit_network: { Args: { _network_id: string }; Returns: boolean }
      can_edit_node: { Args: { _node_id: string }; Returns: boolean }
      can_edit_server: { Args: { _server_id: string }; Returns: boolean }
      can_edit_vm: { Args: { _vm_id: string }; Returns: boolean }
      can_manage_branch: { Args: { _branch_id: string }; Returns: boolean }
      can_manage_domain: { Args: { _domain_id: string }; Returns: boolean }
      generate_procurement_request_number: {
        Args: { p_domain_id: string }
        Returns: string
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_vault_permission: {
        Args: { _permission: string; _vault_item_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_branch_admin: { Args: { _branch_id: string }; Returns: boolean }
      is_domain_admin: { Args: { _domain_id: string }; Returns: boolean }
      is_employee_only: { Args: never; Returns: boolean }
      is_manager_of: { Args: { _employee_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_visible_employees: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      owns_vault_item: { Args: { _vault_item_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "employee"
      branch_role: "branch_admin" | "branch_operator" | "branch_viewer"
      vault_role: "vault_admin" | "vault_editor" | "vault_viewer"
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
      app_role: ["super_admin", "admin", "employee"],
      branch_role: ["branch_admin", "branch_operator", "branch_viewer"],
      vault_role: ["vault_admin", "vault_editor", "vault_viewer"],
    },
  },
} as const
