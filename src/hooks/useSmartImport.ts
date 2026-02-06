import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: any; error: string }[];
}

export interface ImportPreview {
  toCreate: number;
  toUpdate: number;
  unchanged: number;
  errors: { row: number; message: string }[];
}

export function useSmartImport() {
  const { toast } = useToast();

  // Helper: Find server by ID or by name+IP
  const findExistingServer = useCallback(async (row: any, existingServers: any[]) => {
    // First check by ID if provided
    if (row.server_id) {
      return existingServers.find(s => s.id === row.server_id);
    }
    
    // Then check by name + IP combination
    const name = row.name || row.Name || '';
    const ip = row.ip_address || row.IP || row['IP Address'] || '';
    
    if (name && ip) {
      return existingServers.find(s => 
        s.name.toLowerCase() === name.toLowerCase() && 
        s.ip_address === ip
      );
    }
    
    // Finally check by name only
    if (name) {
      return existingServers.find(s => s.name.toLowerCase() === name.toLowerCase());
    }
    
    return null;
  }, []);

  // Helper: Find license by ID or by name+key
  const findExistingLicense = useCallback(async (row: any, existingLicenses: any[]) => {
    if (row.license_id) {
      return existingLicenses.find(l => l.id === row.license_id);
    }
    
    const name = row.name || row.Name || '';
    const key = row.license_key || row['License Key'] || '';
    
    if (name && key) {
      return existingLicenses.find(l => 
        l.name.toLowerCase() === name.toLowerCase() && 
        l.license_key === key
      );
    }
    
    if (name) {
      return existingLicenses.find(l => l.name.toLowerCase() === name.toLowerCase());
    }
    
    return null;
  }, []);

  // Map Excel row to server data
  const mapRowToServer = (row: any) => ({
    name: row.name || row.Name || '',
    ip_address: row.ip_address || row.IP || row['IP Address'] || '',
    operating_system: row.operating_system || row.OS || row['Operating System'] || 'Windows Server',
    environment: (row.environment || row.Environment || 'production').toLowerCase(),
    owner: row.owner || row.Owner || '',
    responsible_user: row.responsible_user || row.Responsible || '',
    notes: row.notes || row.Notes || '',
    network_id: row.network_id || null,
    status: (row.status || row.Status || 'active').toLowerCase(),
    cpu: row.cpu || row.CPU || '',
    ram: row.ram || row.RAM || '',
    disk_space: row.disk_space || row['Disk Space'] || row.Disk_Space || '',
  });

  // Map Excel row to license data
  const mapRowToLicense = (row: any, domainMap: Record<string, string>) => {
    const domainName = row.domain_name || row.Domain || '';
    const domainId = domainMap[domainName.toLowerCase()] || row.domain_id || null;
    
    return {
      name: row.name || row.Name || '',
      vendor: row.vendor || row.Vendor || '',
      license_key: row.license_key || row['License Key'] || '',
      purchase_date: row.purchase_date || row['Start Date'] || null,
      expiry_date: row.expiry_date || row['Expiry Date'] || '',
      domain_id: domainId,
      assigned_to: row.assigned_to || row['Assigned To'] || '',
      cost: parseFloat(row.cost || row.Cost || 0) || 0,
      quantity: parseInt(row.quantity || row.Quantity || 1) || 1,
      notes: row.notes || row.Notes || '',
      status: 'active',
    };
  };

  // Analyze import data before executing
  const analyzeServerImport = useCallback(async (data: any[], siteId?: string): Promise<ImportPreview> => {
    const { data: existingServers } = siteId 
      ? await supabase.from('server_inventory_view').select('*').eq('site_id', siteId)
      : await supabase.from('servers').select('*');
    const servers = existingServers || [];
    
    let toCreate = 0;
    let toUpdate = 0;
    let unchanged = 0;
    const errors: { row: number; message: string }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row.name || row.Name || '';
      const ip = row.ip_address || row.IP || '';
      
      if (!name) {
        errors.push({ row: i + 1, message: 'اسم السيرفر مطلوب' });
        continue;
      }
      
      const existing = await findExistingServer(row, servers);
      
      if (existing) {
        // Check if there are actual changes
        const newData = mapRowToServer(row);
        const hasChanges = Object.keys(newData).some(key => {
          if (key === 'network_id') return false; // Skip network_id comparison
          return newData[key as keyof typeof newData] !== existing[key];
        });
        
        if (hasChanges) {
          toUpdate++;
        } else {
          unchanged++;
        }
      } else {
        toCreate++;
      }
    }
    
    return { toCreate, toUpdate, unchanged, errors };
  }, [findExistingServer]);

  // Execute server import with upsert logic via RPC (idempotent)
  const importServers = useCallback(async (data: any[], siteId?: string): Promise<ImportResult> => {
    const { upsertPhysicalServer, findExistingServerInView } = await import('@/services/resourceService');
    
    const results: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    
    for (const row of data) {
      try {
        const serverData = mapRowToServer(row);
        
        if (!serverData.name) {
          results.errors.push({ row, error: 'اسم السيرفر مطلوب' });
          continue;
        }
        
        // Deterministic match: site_id + (hostname OR primary_ip)
        let existingResourceId: string | null = null;
        if (siteId) {
          const existing = await findExistingServerInView(siteId, serverData.name, serverData.ip_address);
          existingResourceId = existing?.resource_id || null;
        }
        
        // Use RPC for atomic upsert
        await upsertPhysicalServer({
          resource_id: existingResourceId || undefined,
          network_id: serverData.network_id || undefined,
          name: serverData.name,
          ip_address: serverData.ip_address,
          operating_system: serverData.operating_system,
          environment: serverData.environment,
          status: serverData.status,
          owner: serverData.owner,
          responsible_user: serverData.responsible_user,
          cpu: serverData.cpu,
          ram: serverData.ram,
          disk_space: serverData.disk_space,
          notes: serverData.notes,
        });
        
        if (existingResourceId) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({ row, error: error.message });
      }
    }
    
    return results;
  }, []);

  // Analyze license import data
  const analyzeLicenseImport = useCallback(async (data: any[]): Promise<ImportPreview> => {
    const { data: existingLicenses } = await supabase.from('licenses').select('*');
    const licenses = existingLicenses || [];
    
    let toCreate = 0;
    let toUpdate = 0;
    let unchanged = 0;
    const errors: { row: number; message: string }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const name = row.name || row.Name || '';
      
      if (!name) {
        errors.push({ row: i + 1, message: 'اسم الترخيص مطلوب' });
        continue;
      }
      
      const existing = await findExistingLicense(row, licenses);
      
      if (existing) {
        toUpdate++;
      } else {
        toCreate++;
      }
    }
    
    return { toCreate, toUpdate, unchanged, errors };
  }, [findExistingLicense]);

  // Execute license import with upsert logic
  const importLicenses = useCallback(async (data: any[]): Promise<ImportResult> => {
    const { data: existingLicenses } = await supabase.from('licenses').select('*');
    const { data: domains } = await supabase.from('domains').select('id, name');
    
    const licenses = existingLicenses || [];
    const domainMap: Record<string, string> = {};
    (domains || []).forEach(d => {
      domainMap[d.name.toLowerCase()] = d.id;
    });
    
    const results: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
    
    for (const row of data) {
      try {
        const licenseData = mapRowToLicense(row, domainMap);
        
        if (!licenseData.name) {
          results.errors.push({ row, error: 'اسم الترخيص مطلوب' });
          continue;
        }
        
        const existing = await findExistingLicense(row, licenses);
        
        if (existing) {
          const { error } = await supabase
            .from('licenses')
            .update(licenseData)
            .eq('id', existing.id);
          
          if (error) throw error;
          results.updated++;
        } else {
          const { error } = await supabase
            .from('licenses')
            .insert([licenseData]);
          
          if (error) throw error;
          results.created++;
        }
      } catch (error: any) {
        results.errors.push({ row, error: error.message });
      }
    }
    
    return results;
  }, [findExistingLicense]);

  return {
    importServers,
    importLicenses,
    analyzeServerImport,
    analyzeLicenseImport,
  };
}
