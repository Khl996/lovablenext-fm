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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          building_id: string | null
          category: Database["public"]["Enums"]["asset_category"]
          code: string
          coordinates_x: number | null
          coordinates_y: number | null
          created_at: string
          criticality: Database["public"]["Enums"]["criticality_level"]
          department_id: string | null
          depreciation_annual: number | null
          expected_lifespan_years: number | null
          floor_id: string | null
          hospital_id: string
          id: string
          installation_date: string | null
          manufacture_year: number | null
          manufacturer: string | null
          model: string | null
          name: string
          name_ar: string
          parent_asset_id: string | null
          purchase_cost: number | null
          purchase_date: string | null
          qr_code: string | null
          room_id: string | null
          serial_number: string | null
          specifications: Json | null
          status: Database["public"]["Enums"]["asset_status"]
          subcategory: string | null
          supplier: string | null
          type: string | null
          updated_at: string
          warranty_expiry: string | null
          warranty_provider: string | null
        }
        Insert: {
          building_id?: string | null
          category: Database["public"]["Enums"]["asset_category"]
          code: string
          coordinates_x?: number | null
          coordinates_y?: number | null
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          department_id?: string | null
          depreciation_annual?: number | null
          expected_lifespan_years?: number | null
          floor_id?: string | null
          hospital_id: string
          id?: string
          installation_date?: string | null
          manufacture_year?: number | null
          manufacturer?: string | null
          model?: string | null
          name: string
          name_ar: string
          parent_asset_id?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_code?: string | null
          room_id?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["asset_status"]
          subcategory?: string | null
          supplier?: string | null
          type?: string | null
          updated_at?: string
          warranty_expiry?: string | null
          warranty_provider?: string | null
        }
        Update: {
          building_id?: string | null
          category?: Database["public"]["Enums"]["asset_category"]
          code?: string
          coordinates_x?: number | null
          coordinates_y?: number | null
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          department_id?: string | null
          depreciation_annual?: number | null
          expected_lifespan_years?: number | null
          floor_id?: string | null
          hospital_id?: string
          id?: string
          installation_date?: string | null
          manufacture_year?: number | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          name_ar?: string
          parent_asset_id?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          qr_code?: string | null
          room_id?: string | null
          serial_number?: string | null
          specifications?: Json | null
          status?: Database["public"]["Enums"]["asset_status"]
          subcategory?: string | null
          supplier?: string | null
          type?: string | null
          updated_at?: string
          warranty_expiry?: string | null
          warranty_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          code: string
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          floor_id: string
          id: string
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          floor_id: string
          id?: string
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          floor_id?: string
          id?: string
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          code: string
          created_at: string
          id: string
          level: number
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          building_id: string
          code: string
          created_at?: string
          id?: string
          level: number
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          code?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          name_ar: string
          notes: string | null
          phone: string | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          name_ar: string
          notes?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          name_ar?: string
          notes?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      issue_type_team_mapping: {
        Row: {
          created_at: string
          hospital_id: string
          id: string
          is_default: boolean | null
          issue_type: string
          issue_type_ar: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hospital_id: string
          id?: string
          is_default?: boolean | null
          issue_type: string
          issue_type_ar: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hospital_id?: string
          id?: string
          is_default?: boolean | null
          issue_type?: string
          issue_type_ar?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_type_team_mapping_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_type_team_mapping_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_plans: {
        Row: {
          budget: number | null
          budget_utilization: number | null
          code: string
          completion_rate: number | null
          created_at: string
          department: string | null
          hospital_id: string
          id: string
          name: string
          name_ar: string
          on_time_rate: number | null
          quality_score: number | null
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          budget?: number | null
          budget_utilization?: number | null
          code: string
          completion_rate?: number | null
          created_at?: string
          department?: string | null
          hospital_id: string
          id?: string
          name: string
          name_ar: string
          on_time_rate?: number | null
          quality_score?: number | null
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          budget?: number | null
          budget_utilization?: number | null
          code?: string
          completion_rate?: number | null
          created_at?: string
          department?: string | null
          hospital_id?: string
          id?: string
          name?: string
          name_ar?: string
          on_time_rate?: number | null
          quality_score?: number | null
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tasks: {
        Row: {
          assigned_to: string | null
          checklist: Json | null
          code: string
          created_at: string
          depends_on: string | null
          duration_days: number
          end_date: string
          frequency: string
          id: string
          is_critical: boolean | null
          name: string
          name_ar: string
          plan_id: string
          progress: number | null
          start_date: string
          status: string
          type: Database["public"]["Enums"]["maintenance_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          checklist?: Json | null
          code: string
          created_at?: string
          depends_on?: string | null
          duration_days: number
          end_date: string
          frequency: string
          id?: string
          is_critical?: boolean | null
          name: string
          name_ar: string
          plan_id: string
          progress?: number | null
          start_date: string
          status?: string
          type: Database["public"]["Enums"]["maintenance_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          checklist?: Json | null
          code?: string
          created_at?: string
          depends_on?: string | null
          duration_days?: number
          end_date?: string
          frequency?: string
          id?: string
          is_critical?: boolean | null
          name?: string
          name_ar?: string
          plan_id?: string
          progress?: number | null
          start_date?: string
          status?: string
          type?: Database["public"]["Enums"]["maintenance_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_depends_on_fkey"
            columns: ["depends_on"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      operations_log: {
        Row: {
          actual_duration: number | null
          affected_areas: string[] | null
          approval_notes: string | null
          approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          asset_id: string | null
          asset_name: string
          category: string | null
          code: string
          created_at: string
          description: string | null
          emergency_measures: string | null
          end_time: string | null
          estimated_duration: number | null
          hospital_id: string
          id: string
          location: string
          new_status: string | null
          notes: string | null
          notified_parties: string[] | null
          performed_by: string
          photos: string[] | null
          previous_status: string | null
          reason: string
          related_work_order: string | null
          start_time: string | null
          status: string
          system_type: string
          team: string | null
          technician_name: string
          timestamp: string
          type: Database["public"]["Enums"]["operation_type"]
        }
        Insert: {
          actual_duration?: number | null
          affected_areas?: string[] | null
          approval_notes?: string | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          asset_name: string
          category?: string | null
          code: string
          created_at?: string
          description?: string | null
          emergency_measures?: string | null
          end_time?: string | null
          estimated_duration?: number | null
          hospital_id: string
          id?: string
          location: string
          new_status?: string | null
          notes?: string | null
          notified_parties?: string[] | null
          performed_by: string
          photos?: string[] | null
          previous_status?: string | null
          reason: string
          related_work_order?: string | null
          start_time?: string | null
          status?: string
          system_type: string
          team?: string | null
          technician_name: string
          timestamp?: string
          type: Database["public"]["Enums"]["operation_type"]
        }
        Update: {
          actual_duration?: number | null
          affected_areas?: string[] | null
          approval_notes?: string | null
          approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          asset_name?: string
          category?: string | null
          code?: string
          created_at?: string
          description?: string | null
          emergency_measures?: string | null
          end_time?: string | null
          estimated_duration?: number | null
          hospital_id?: string
          id?: string
          location?: string
          new_status?: string | null
          notes?: string | null
          notified_parties?: string[] | null
          performed_by?: string
          photos?: string[] | null
          previous_status?: string | null
          reason?: string
          related_work_order?: string | null
          start_time?: string | null
          status?: string
          system_type?: string
          team?: string | null
          technician_name?: string
          timestamp?: string
          type?: Database["public"]["Enums"]["operation_type"]
        }
        Relationships: [
          {
            foreignKeyName: "operations_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_log_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operations_log_related_work_order_fkey"
            columns: ["related_work_order"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          full_name_ar: string | null
          hospital_id: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          full_name_ar?: string | null
          hospital_id?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          full_name_ar?: string | null
          hospital_id?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      push_notification_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          coordinates_x: number | null
          coordinates_y: number | null
          created_at: string
          department_id: string
          id: string
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          code: string
          coordinates_x?: number | null
          coordinates_y?: number | null
          created_at?: string
          department_id: string
          id?: string
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          code?: string
          coordinates_x?: number | null
          coordinates_y?: number | null
          created_at?: string
          department_id?: string
          id?: string
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      specializations: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          hospital_id: string
          id: string
          name: string
          name_ar: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          hospital_id: string
          id?: string
          name: string
          name_ar: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          hospital_id?: string
          id?: string
          name?: string
          name_ar?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specializations_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisor_buildings: {
        Row: {
          building_id: string
          created_at: string
          id: string
          supervisor_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          supervisor_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          supervisor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisor_buildings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          certifications: Json | null
          created_at: string
          id: string
          role: string
          specialization: string[] | null
          team_id: string
          user_id: string
        }
        Insert: {
          certifications?: Json | null
          created_at?: string
          id?: string
          role: string
          specialization?: string[] | null
          team_id: string
          user_id: string
        }
        Update: {
          certifications?: Json | null
          created_at?: string
          id?: string
          role?: string
          specialization?: string[] | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          code: string
          created_at: string
          department: string | null
          hospital_id: string
          id: string
          name: string
          name_ar: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          department?: string | null
          hospital_id: string
          id?: string
          name: string
          name_ar: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          department?: string | null
          hospital_id?: string
          id?: string
          name?: string
          name_ar?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          effect: string
          hospital_id: string | null
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          effect: string
          hospital_id?: string | null
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          effect?: string
          hospital_id?: string | null
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          hospital_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          hospital_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actions_taken: Json | null
          actual_duration: number | null
          asset_id: string | null
          assigned_at: string | null
          assigned_team: string | null
          assigned_to: string | null
          building_id: string | null
          code: string
          created_at: string
          customer_feedback: string | null
          customer_rating: number | null
          customer_reviewed_at: string | null
          customer_reviewed_by: string | null
          department_id: string | null
          description: string
          due_date: string | null
          end_time: string | null
          estimated_duration: number | null
          floor_id: string | null
          hospital_id: string
          id: string
          is_redirected: boolean | null
          issue_type: string
          labor_time: number | null
          notify_supervisor: boolean | null
          original_issue_type: string | null
          parts_used: Json | null
          photos: string[] | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          redirect_reason: string | null
          redirected_by: string | null
          redirected_to: string | null
          reported_at: string
          reported_by: string
          resolution_time: number | null
          response_time: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          room_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          supervisor_approved_at: string | null
          supervisor_approved_by: string | null
          supervisor_notes: string | null
          total_cost: number | null
          updated_at: string
          urgency: string | null
          work_notes: string | null
          work_photos: string[] | null
        }
        Insert: {
          actions_taken?: Json | null
          actual_duration?: number | null
          asset_id?: string | null
          assigned_at?: string | null
          assigned_team?: string | null
          assigned_to?: string | null
          building_id?: string | null
          code: string
          created_at?: string
          customer_feedback?: string | null
          customer_rating?: number | null
          customer_reviewed_at?: string | null
          customer_reviewed_by?: string | null
          department_id?: string | null
          description: string
          due_date?: string | null
          end_time?: string | null
          estimated_duration?: number | null
          floor_id?: string | null
          hospital_id: string
          id?: string
          is_redirected?: boolean | null
          issue_type: string
          labor_time?: number | null
          notify_supervisor?: boolean | null
          original_issue_type?: string | null
          parts_used?: Json | null
          photos?: string[] | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          redirect_reason?: string | null
          redirected_by?: string | null
          redirected_to?: string | null
          reported_at?: string
          reported_by: string
          resolution_time?: number | null
          response_time?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          supervisor_approved_at?: string | null
          supervisor_approved_by?: string | null
          supervisor_notes?: string | null
          total_cost?: number | null
          updated_at?: string
          urgency?: string | null
          work_notes?: string | null
          work_photos?: string[] | null
        }
        Update: {
          actions_taken?: Json | null
          actual_duration?: number | null
          asset_id?: string | null
          assigned_at?: string | null
          assigned_team?: string | null
          assigned_to?: string | null
          building_id?: string | null
          code?: string
          created_at?: string
          customer_feedback?: string | null
          customer_rating?: number | null
          customer_reviewed_at?: string | null
          customer_reviewed_by?: string | null
          department_id?: string | null
          description?: string
          due_date?: string | null
          end_time?: string | null
          estimated_duration?: number | null
          floor_id?: string | null
          hospital_id?: string
          id?: string
          is_redirected?: boolean | null
          issue_type?: string
          labor_time?: number | null
          notify_supervisor?: boolean | null
          original_issue_type?: string | null
          parts_used?: Json | null
          photos?: string[] | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          redirect_reason?: string | null
          redirected_by?: string | null
          redirected_to?: string | null
          reported_at?: string
          reported_by?: string
          resolution_time?: number | null
          response_time?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          room_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          supervisor_approved_at?: string | null
          supervisor_approved_by?: string | null
          supervisor_notes?: string | null
          total_cost?: number | null
          updated_at?: string
          urgency?: string | null
          work_notes?: string | null
          work_photos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_team_fkey"
            columns: ["assigned_team"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_hospital: { Args: { _user_id: string }; Returns: string }
      has_permission: {
        Args: {
          _hospital_id?: string
          _permission_key: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "global_admin"
        | "hospital_admin"
        | "facility_manager"
        | "maintenance_manager"
        | "supervisor"
        | "technician"
        | "reporter"
        | "engineer"
      asset_category:
        | "mechanical"
        | "electrical"
        | "medical"
        | "safety"
        | "plumbing"
        | "other"
      asset_status: "active" | "inactive" | "maintenance" | "retired"
      criticality_level: "critical" | "essential" | "non_essential"
      maintenance_type: "preventive" | "corrective" | "predictive" | "routine"
      operation_type: "shutdown" | "startup" | "adjustment" | "transfer"
      work_order_priority: "low" | "medium" | "high" | "urgent"
      work_order_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "needs_redirection"
        | "awaiting_approval"
        | "customer_approved"
        | "customer_rejected"
        | "completed"
        | "cancelled"
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
        "global_admin",
        "hospital_admin",
        "facility_manager",
        "maintenance_manager",
        "supervisor",
        "technician",
        "reporter",
        "engineer",
      ],
      asset_category: [
        "mechanical",
        "electrical",
        "medical",
        "safety",
        "plumbing",
        "other",
      ],
      asset_status: ["active", "inactive", "maintenance", "retired"],
      criticality_level: ["critical", "essential", "non_essential"],
      maintenance_type: ["preventive", "corrective", "predictive", "routine"],
      operation_type: ["shutdown", "startup", "adjustment", "transfer"],
      work_order_priority: ["low", "medium", "high", "urgent"],
      work_order_status: [
        "pending",
        "assigned",
        "in_progress",
        "needs_redirection",
        "awaiting_approval",
        "customer_approved",
        "customer_rejected",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
