import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, of, defer, Subject } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { PostgrestError, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { environment } from '../../environments/environment';

export interface CompanyBuilding {
  id: string;
  company_id: string;
  address: string;
  postal_code?: string;
  city?: string;
  country?: string;
  building_type?: string;
  surface_area?: number;
  construction_year?: number;
  purchase_date?: string;
  current_value?: number;
  usage?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyDriver {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  license_number: string;
  license_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface CompanyVehicle {
  id: string;
  company_id: string;
  driver_id?: string | null;
  make: string;
  model: string;
  license_plate?: string;
  vin?: string;
  first_registration_date?: string;
  fuel_type?: string;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {

  constructor(private supabaseService: SupabaseService) { }

  addCompanyDriver(driver: {
    company_id: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    license_number: string;
    license_date: string;
  }): Observable<any> {
    return from(
      this.supabaseService.supabase.rpc('add_company_driver', {
        p_company_id: driver.company_id,
        p_first_name: driver.first_name,
        p_last_name: driver.last_name,
        p_birth_date: driver.birth_date,
        p_license_number: driver.license_number,
        p_license_date: driver.license_date,
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return response.data;
      })
    );
  }

  getCompanyDrivers(companyId: string): Observable<CompanyDriver[]> {
    return from(
      this.supabaseService.supabase.rpc('get_company_drivers', {
        p_company_id: companyId,
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return response.data as CompanyDriver[];
      })
    );
  }

  updateCompanyDriver(driver: Partial<CompanyDriver> & { id: string }): Observable<CompanyDriver> {
    return from(
      this.supabaseService.supabase
        .from('company_drivers')
        .update(driver)
        .eq('id', driver.id)
        .select()
        .single()
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return response.data as CompanyDriver;
      })
    );
  }

  deleteCompanyDriver(driverId: string): Observable<void> {
    return from(
      this.supabaseService.supabase
        .from('company_drivers')
        .delete()
        .eq('id', driverId)
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
      })
    );
  }

  getCompanyBuildings(companyId: string): Observable<CompanyBuilding[]> {
    return from(
      this.supabaseService.supabase.rpc('get_company_buildings', {
        p_company_id: companyId,
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return response.data as CompanyBuilding[];
      })
    );
  }

  addCompanyBuilding(building: Omit<CompanyBuilding, 'id' | 'created_at' | 'updated_at'>): Observable<CompanyBuilding> {
    return from(
      this.supabaseService.supabase.rpc('add_company_building', {
        p_company_id: building.company_id,
        p_address: building.address,
        p_postal_code: building.postal_code || null,
        p_city: building.city || null,
        p_country: building.country || null,
        p_building_type: building.building_type || null,
        p_surface_area: building.surface_area || null,
        p_construction_year: building.construction_year || null,
        p_purchase_date: building.purchase_date || null,
        p_current_value: building.current_value || null,
        p_usage: building.usage || null
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return (Array.isArray(response.data) ? response.data[0] : response.data) as CompanyBuilding;
      })
    );
  }

  updateCompanyBuilding(building: Partial<CompanyBuilding> & { id: string }): Observable<CompanyBuilding> {
    return from(
      this.supabaseService.supabase.rpc('update_company_building', {
        p_id: building.id,
        p_address: building.address,
        p_postal_code: building.postal_code || null,
        p_city: building.city || null,
        p_country: building.country || null,
        p_building_type: building.building_type || null,
        p_surface_area: building.surface_area || null,
        p_construction_year: building.construction_year || null,
        p_purchase_date: building.purchase_date || null,
        p_current_value: building.current_value || null,
        p_usage: building.usage || null
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return (Array.isArray(response.data) ? response.data[0] : response.data) as CompanyBuilding;
      })
    );
  }

  deleteCompanyBuilding(buildingId: string): Observable<void> {
    return from(
      this.supabaseService.supabase.rpc('delete_company_building', {
        p_id: buildingId,
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
      })
    );
  }

  getCompanyBuilding(buildingId: string): Observable<CompanyBuilding> {
    return from(
      this.supabaseService.supabase
        .from('company_buildings')
        .select('*')
        .eq('id', buildingId)
        .single()
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        return response.data as CompanyBuilding;
      })
    );
  }

  // --- Vehicle Methods (RPC) ---

  getCompanyVehicles(companyId: string): Observable<CompanyVehicle[]> {
    return from(
      this.supabaseService.supabase.rpc('get_company_vehicles', {
        p_company_id: companyId,
      })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return response.data as CompanyVehicle[];
      })
    );
  }

  addCompanyVehicle(vehicle: Partial<CompanyVehicle>): Observable<CompanyVehicle> {
    return from(
      this.supabaseService.supabase.rpc('add_company_vehicle', {
        p_company_id: vehicle.company_id,
        p_driver_id: vehicle.driver_id || null,
        p_make: vehicle.make,
        p_model: vehicle.model,
        p_license_plate: vehicle.license_plate,
        p_vin: vehicle.vin,
        p_first_registration_date: vehicle.first_registration_date,
        p_fuel_type: vehicle.fuel_type
      })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        // RPC returning SETOF returns an array, we take the first item
        return (Array.isArray(response.data) ? response.data[0] : response.data) as CompanyVehicle;
      })
    );
  }

  updateCompanyVehicle(vehicle: Partial<CompanyVehicle> & { id: string }): Observable<CompanyVehicle> {
    return from(
      this.supabaseService.supabase.rpc('update_company_vehicle', {
        p_id: vehicle.id,
        p_driver_id: vehicle.driver_id || null,
        p_make: vehicle.make,
        p_model: vehicle.model,
        p_license_plate: vehicle.license_plate,
        p_vin: vehicle.vin,
        p_first_registration_date: vehicle.first_registration_date,
        p_fuel_type: vehicle.fuel_type
      })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
        return (Array.isArray(response.data) ? response.data[0] : response.data) as CompanyVehicle;
      })
    );
  }

  deleteCompanyVehicle(vehicleId: string): Observable<void> {
    return from(
      this.supabaseService.supabase.rpc('delete_company_vehicle', {
        p_id: vehicleId,
      })
    ).pipe(
      map((response) => {
        if (response.error) throw response.error;
      })
    );
  }
}
