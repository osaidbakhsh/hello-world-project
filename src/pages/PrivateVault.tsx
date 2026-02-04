import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrivateVault } from '@/hooks/usePrivateVault';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  FileText,
  KeyRound,
  ShieldOff,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

const PrivateVault: React.FC = () => {
  const { dir } = useLanguage();
  const {
    items,
    isLoading,
    isUnlocked,
    unlockVault,
    lockVault,
    createItem,
    decryptItem,
    hideItem,
    deleteItem,
    decryptedItems,
  } = usePrivateVault();

  const [passphraseInput, setPassphraseInput] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const handleUnlock = () => {
    if (!passphraseInput.trim()) {
      toast.error('يرجى إدخال عبارة المرور الرئيسية');
      return;
    }
    unlockVault(passphraseInput);
    setPassphraseInput('');
    toast.success('تم فتح الخزنة الخاصة');
  };

  const handleLock = () => {
    lockVault();
    toast.success('تم قفل الخزنة الخاصة');
  };

  const handleAddItem = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('يرجى إدخال العنوان والمحتوى');
      return;
    }

    await createItem.mutateAsync({
      title: newTitle.trim(),
      plainContent: newContent.trim(),
      content_type: 'note',
    });

    setNewTitle('');
    setNewContent('');
    setIsAddDialogOpen(false);
  };

  const handleReveal = async (itemId: string) => {
    setRevealingId(itemId);
    await decryptItem(itemId);
    setRevealingId(null);
  };

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success('تم نسخ المحتوى');
  };

  // Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir={dir}>
        <Card className="w-full max-w-md border-2 border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">الخزنة الخاصة</CardTitle>
            <p className="text-muted-foreground text-sm mt-2">
              هذه الخزنة محمية بتشفير من طرف العميل. لا يمكن لأي شخص، بما في ذلك مديري النظام، الوصول إلى محتوياتها.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">عبارة المرور الرئيسية</Label>
              <Input
                id="passphrase"
                type="password"
                placeholder="أدخل عبارة المرور الخاصة بك"
                value={passphraseInput}
                onChange={(e) => setPassphraseInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              />
            </div>
            <Button className="w-full gap-2" onClick={handleUnlock}>
              <Unlock className="w-4 h-4" />
              فتح الخزنة
            </Button>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <p className="text-warning-foreground">
                إذا نسيت عبارة المرور، لن تتمكن من استرداد البيانات المشفرة.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الخزنة الخاصة</h1>
            <p className="text-muted-foreground text-sm">
              تشفير من طرف العميل - لا يمكن لأحد الوصول إلى بياناتك
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/20">
            <Unlock className="w-3 h-3" />
            مفتوحة
          </Badge>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة عنصر
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  إضافة عنصر جديد
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">العنوان</Label>
                  <Input
                    id="title"
                    placeholder="عنوان العنصر"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">المحتوى</Label>
                  <Textarea
                    id="content"
                    placeholder="أدخل المحتوى السري هنا..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddItem} disabled={createItem.isPending}>
                  {createItem.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'حفظ'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handleLock} className="gap-2">
            <Lock className="w-4 h-4" />
            قفل
          </Button>
        </div>
      </div>

      {/* Super Admin Block Notice */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-4">
          <ShieldOff className="w-6 h-6 text-destructive" />
          <div>
            <p className="font-medium text-destructive">منطقة خاصة بالكامل</p>
            <p className="text-sm text-muted-foreground">
              لا يمكن لمديري النظام (Super Admin) الوصول إلى هذه البيانات. التشفير يتم على جهازك.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <KeyRound className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">الخزنة فارغة</p>
            <p className="text-sm">أضف عناصر سرية للحفاظ عليها بأمان</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isRevealed = !!decryptedItems[item.id];
            const isRevealing = revealingId === item.id;

            return (
              <Card key={item.id} className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      {item.title}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {item.content_type || 'note'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('ar-SA')
                      : 'غير محدد'}
                  </p>
                </CardHeader>
                <CardContent>
                  {isRevealed ? (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <pre className="text-sm whitespace-pre-wrap font-mono">
                          {decryptedItems[item.id]}
                        </pre>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleCopy(decryptedItems[item.id])}
                        >
                          <Copy className="w-3 h-3" />
                          نسخ
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => hideItem(item.id)}
                        >
                          <EyeOff className="w-3 h-3" />
                          إخفاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-muted/50 border text-center text-muted-foreground">
                        <Lock className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <span className="text-sm">محتوى مشفر</span>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full gap-1"
                        onClick={() => handleReveal(item.id)}
                        disabled={isRevealing}
                      >
                        {isRevealing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            كشف المحتوى
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Delete */}
                  <div className="mt-3 pt-3 border-t">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full text-destructive gap-1">
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>حذف العنصر</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف "{item.title}"؟ لا يمكن استرداد البيانات المحذوفة.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteItem.mutate(item.id)}
                            className="bg-destructive text-destructive-foreground"
                          >
                            حذف
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PrivateVault;
