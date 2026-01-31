import React from 'react';
import { ArrowUpDown, List, LayoutGrid, Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/contexts/LanguageContext';

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

interface SortConfig {
  value: string;
  label: string;
  labelEn: string;
}

interface DataTableHeaderProps {
  sortOptions: SortConfig[];
  currentSort: string;
  onSortChange: (value: string) => void;
  viewMode?: 'table' | 'grid' | 'cards';
  onViewModeChange?: (mode: 'table' | 'grid' | 'cards') => void;
  showViewToggle?: boolean;
}

export const DataTableHeader: React.FC<DataTableHeaderProps> = ({
  sortOptions,
  currentSort,
  onSortChange,
  viewMode = 'table',
  onViewModeChange,
  showViewToggle = false,
}) => {
  const { dir } = useLanguage();
  const isRTL = dir === 'rtl';

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
        <Select value={currentSort} onValueChange={onSortChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={isRTL ? 'ترتيب حسب' : 'Sort by'} />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {isRTL ? option.label : option.labelEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* View Mode Toggle */}
      {showViewToggle && onViewModeChange && (
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(value) => value && onViewModeChange(value as 'table' | 'grid' | 'cards')}
          className="border rounded-lg p-1"
        >
          <ToggleGroupItem value="table" aria-label="Table view" className="px-2.5">
            <List className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="px-2.5">
            <LayoutGrid className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="cards" aria-label="Cards view" className="px-2.5">
            <Layers className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      )}
    </div>
  );
};

// Predefined sort options for different pages
export const serverSortOptions: SortConfig[] = [
  { value: 'name-asc', label: 'الاسم (أ-ي)', labelEn: 'Name (A-Z)' },
  { value: 'name-desc', label: 'الاسم (ي-أ)', labelEn: 'Name (Z-A)' },
  { value: 'ip-asc', label: 'IP (تصاعدي)', labelEn: 'IP (Ascending)' },
  { value: 'ip-desc', label: 'IP (تنازلي)', labelEn: 'IP (Descending)' },
  { value: 'environment-asc', label: 'البيئة', labelEn: 'Environment' },
  { value: 'status-asc', label: 'الحالة', labelEn: 'Status' },
  { value: 'created_at-desc', label: 'الأحدث', labelEn: 'Newest' },
  { value: 'created_at-asc', label: 'الأقدم', labelEn: 'Oldest' },
];

export const licenseSortOptions: SortConfig[] = [
  { value: 'name-asc', label: 'الاسم (أ-ي)', labelEn: 'Name (A-Z)' },
  { value: 'name-desc', label: 'الاسم (ي-أ)', labelEn: 'Name (Z-A)' },
  { value: 'expiry_date-asc', label: 'تاريخ الانتهاء (الأقرب)', labelEn: 'Expiry (Soonest)' },
  { value: 'expiry_date-desc', label: 'تاريخ الانتهاء (الأبعد)', labelEn: 'Expiry (Latest)' },
  { value: 'vendor-asc', label: 'المورد', labelEn: 'Vendor' },
  { value: 'cost-desc', label: 'التكلفة (الأعلى)', labelEn: 'Cost (Highest)' },
  { value: 'cost-asc', label: 'التكلفة (الأقل)', labelEn: 'Cost (Lowest)' },
];

export const taskSortOptions: SortConfig[] = [
  { value: 'due_date-asc', label: 'تاريخ الاستحقاق (الأقرب)', labelEn: 'Due Date (Soonest)' },
  { value: 'due_date-desc', label: 'تاريخ الاستحقاق (الأبعد)', labelEn: 'Due Date (Latest)' },
  { value: 'title-asc', label: 'العنوان (أ-ي)', labelEn: 'Title (A-Z)' },
  { value: 'title-desc', label: 'العنوان (ي-أ)', labelEn: 'Title (Z-A)' },
  { value: 'priority-desc', label: 'الأولوية (الأعلى)', labelEn: 'Priority (Highest)' },
  { value: 'priority-asc', label: 'الأولوية (الأقل)', labelEn: 'Priority (Lowest)' },
  { value: 'created_at-desc', label: 'الأحدث', labelEn: 'Newest' },
];

export const vacationSortOptions: SortConfig[] = [
  { value: 'start_date-desc', label: 'تاريخ البداية (الأحدث)', labelEn: 'Start Date (Latest)' },
  { value: 'start_date-asc', label: 'تاريخ البداية (الأقدم)', labelEn: 'Start Date (Oldest)' },
  { value: 'days_count-desc', label: 'عدد الأيام (الأكثر)', labelEn: 'Days (Most)' },
  { value: 'days_count-asc', label: 'عدد الأيام (الأقل)', labelEn: 'Days (Least)' },
  { value: 'employee-asc', label: 'الموظف (أ-ي)', labelEn: 'Employee (A-Z)' },
  { value: 'status-asc', label: 'الحالة', labelEn: 'Status' },
];

export const employeeSortOptions: SortConfig[] = [
  { value: 'name-asc', label: 'الاسم (أ-ي)', labelEn: 'Name (A-Z)' },
  { value: 'name-desc', label: 'الاسم (ي-أ)', labelEn: 'Name (Z-A)' },
  { value: 'department-asc', label: 'القسم', labelEn: 'Department' },
  { value: 'position-asc', label: 'المنصب', labelEn: 'Position' },
  { value: 'created_at-desc', label: 'الأحدث', labelEn: 'Newest' },
  { value: 'created_at-asc', label: 'الأقدم', labelEn: 'Oldest' },
];

// Helper to apply sort
export function applySortToData<T>(data: T[], sortValue: string, fieldMapping?: Record<string, keyof T>): T[] {
  if (!sortValue || !data.length) return data;
  
  const [field, direction] = sortValue.split('-') as [string, 'asc' | 'desc'];
  const actualField = fieldMapping?.[field] || field as keyof T;
  
  return [...data].sort((a, b) => {
    const aVal = a[actualField];
    const bVal = b[actualField];
    
    // Handle null/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return direction === 'asc' ? 1 : -1;
    if (bVal == null) return direction === 'asc' ? -1 : 1;
    
    // String comparison
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const result = aVal.localeCompare(bVal);
      return direction === 'asc' ? result : -result;
    }
    
    // Number comparison
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    // Date comparison
    if (aVal instanceof Date && bVal instanceof Date) {
      return direction === 'asc' 
        ? aVal.getTime() - bVal.getTime() 
        : bVal.getTime() - aVal.getTime();
    }
    
    // Try date string comparison
    const aDate = new Date(String(aVal));
    const bDate = new Date(String(bVal));
    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return direction === 'asc' 
        ? aDate.getTime() - bDate.getTime() 
        : bDate.getTime() - aDate.getTime();
    }
    
    return 0;
  });
}
