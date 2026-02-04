import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';
import { useSites, useDeleteSite } from '@/hooks/useSites';
import { useSite, Site } from '@/contexts/SiteContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import SiteForm from './SiteForm';

interface SiteManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SiteManagementDialog: React.FC<SiteManagementDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { data: sites = [], isLoading } = useSites();
  const { selectedSite, setSelectedSite } = useSite();
  const deleteSite = useDeleteSite();
  
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    await deleteSite.mutateAsync(deletingId);
    
    // If deleted site was selected, clear selection
    if (selectedSite?.id === deletingId) {
      const remaining = sites.filter(s => s.id !== deletingId);
      if (remaining.length > 0) {
        setSelectedSite(remaining[0]);
      } else {
        setSelectedSite(null);
      }
    }
    
    setDeletingId(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingSite(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Manage Sites
            </DialogTitle>
            <DialogDescription>
              Create and manage organizational sites. Sites are the top-level containers for your infrastructure.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end mb-4">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Site
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sites configured yet.</p>
              <p className="text-sm">Click "Add Site" to create your first site.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">
                        {site.name}
                        {selectedSite?.id === site.id && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {site.code && (
                          <Badge variant="outline">{site.code}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {site.city}
                        {site.region && `, ${site.region}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {site.timezone}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(site)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingId(site.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form Dialog */}
      <SiteForm
        open={showForm}
        onOpenChange={handleFormClose}
        site={editingSite}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All datacenters, domains, and resources 
              under this site will become orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSite.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SiteManagementDialog;
