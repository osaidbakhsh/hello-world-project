import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCardProps {
  tool: {
    id: string;
    titleKey: string;
    descKey: string;
    icon: React.ComponentType<{ className?: string }>;
    component: React.ComponentType;
  };
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, isFavorite, onToggleFavorite }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const Icon = tool.icon;
  const ToolComponent = tool.component;

  return (
    <>
      <Card 
        className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
        onClick={() => setIsOpen(true)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon className="h-5 w-5" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <Star 
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                )} 
              />
            </Button>
          </div>
          <CardTitle className="text-base mt-2">{t(tool.titleKey)}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-sm line-clamp-2">
            {t(tool.descKey)}
          </CardDescription>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>{t(tool.titleKey)}</DialogTitle>
                <DialogDescription>{t(tool.descKey)}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4">
            <ToolComponent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ToolCard;
