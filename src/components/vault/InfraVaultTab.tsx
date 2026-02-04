import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInfraCredentials } from '@/hooks/useInfraCredentials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  KeyRound,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Shield,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

interface InfraVaultTabProps {
  resourceId: string;
  resourceType: 'server' | 'vm' | 'node' | 'cluster' | 'network' | 'datacenter';
  resourceName?: string;
}

const InfraVaultTab: React.FC<InfraVaultTabProps> = ({ 
  resourceId, 
  resourceType,
  resourceName 
}) => {
  const { dir } = useLanguage();
  const {
    credentials,
    isLoading,
    createCredential,
    revealSecret,
    hideSecret,
    deleteCredential,
    revealedSecrets,
    revealingId,
  } = useInfraCredentials(resourceId, resourceType);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  const handleAddCredential = async () => {
    if (!newSecretName.trim() || !newSecretValue.trim()) {
      toast.error('يرجى إدخال اسم وقيمة السر');
      return;
    }

    await createCredential.mutateAsync({
      resource_id: resourceId,
      resource_type: resourceType,
      secret_name: newSecretName.trim(),
      secret_value: newSecretValue.trim(),
    });

    setNewSecretName('');
    setNewSecretValue('');
    setIsAddDialogOpen(false);
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('تم نسخ القيمة');
  };

  const handleReveal = async (credentialId: string) => {
    await revealSecret(credentialId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">خزنة بيانات الاعتماد</h3>
          {resourceName && (
            <Badge variant="outline" className="text-xs">
              {resourceName}
            </Badge>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة سر
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                إضافة بيانات اعتماد جديدة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="secretName">اسم السر</Label>
                <Input
                  id="secretName"
                  placeholder="مثال: root_password, api_key"
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretValue">قيمة السر</Label>
                <Input
                  id="secretValue"
                  type="password"
                  placeholder="أدخل القيمة السرية"
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleAddCredential}
                disabled={createCredential.isPending}
              >
                {createCredential.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'حفظ'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <KeyRound className="w-12 h-12 mb-4 opacity-50" />
            <p>لا توجد بيانات اعتماد مخزنة</p>
            <p className="text-sm">أضف بيانات اعتماد لهذا المورد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential) => {
            const isRevealed = !!revealedSecrets[credential.id];
            const isRevealing = revealingId === credential.id;

            return (
              <Card key={credential.id} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <KeyRound className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{credential.secret_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {credential.created_at
                            ? new Date(credential.created_at).toLocaleDateString('ar-SA')
                            : 'غير محدد'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Secret Value Display */}
                      {isRevealed ? (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-warning/10 border border-warning/20">
                          <code className="text-sm font-mono">
                            {revealedSecrets[credential.id]}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleCopy(revealedSecrets[credential.id])}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <code className="text-sm font-mono text-muted-foreground">
                          ••••••••••
                        </code>
                      )}

                      {/* Reveal/Hide Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => isRevealed ? hideSecret(credential.id) : handleReveal(credential.id)}
                        disabled={isRevealing}
                        className="gap-1"
                      >
                        {isRevealing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isRevealed ? (
                          <>
                            <EyeOff className="w-4 h-4" />
                            إخفاء
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            كشف
                          </>
                        )}
                      </Button>

                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف بيانات الاعتماد</AlertDialogTitle>
                            <AlertDialogDescription>
                              هل أنت متأكد من حذف "{credential.secret_name}"؟ لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCredential.mutate(credential.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          جميع الأسرار مشفرة بخوارزمية AES-256-GCM. يتم تسجيل كل عملية كشف في سجل التدقيق.
        </p>
      </div>
    </div>
  );
};

export default InfraVaultTab;
