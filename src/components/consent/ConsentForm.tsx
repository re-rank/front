import { useState } from 'react';
import { ArrowLeft, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ScrollArea,
} from '@/components/ui/Dialog';
import type { ConsentItem } from '@/lib/consent-data';

interface ConsentFormProps {
  type: 'user' | 'founder';
  items: ConsentItem[];
  onBack: () => void;
  onComplete: () => void;
}

export function ConsentForm({ type, items, onBack, onComplete }: ConsentFormProps) {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [allAgreed, setAllAgreed] = useState(false);

  const requiredItems = items.filter((item) => item.required);
  const allRequiredChecked = requiredItems.every((item) => consents[item.id]);

  const handleConsentChange = (id: string, checked: boolean) => {
    const newConsents = { ...consents, [id]: checked };
    setConsents(newConsents);
    setAllAgreed(items.every((item) => newConsents[item.id]));
  };

  const handleSelectAll = () => {
    const newValue = !allAgreed;
    setAllAgreed(newValue);

    const newConsents: Record<string, boolean> = {};
    items.forEach((item) => {
      newConsents[item.id] = newValue;
    });
    setConsents(newConsents);
  };

  const isFounder = type === 'founder';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <Card>
          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-border">
            <div className="mx-auto mb-4">
              <img
                src="/logo-dark.jpg"
                alt="IV Logo"
                className="w-[60px] h-[60px] mx-auto rounded-lg"
              />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isFounder ? 'Founder Consent Form' : 'User Consent Form'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              IV {isFounder ? 'Founder' : 'User'} Consent Form • Version v1.{isFounder ? '0' : '1'} • Effective January 26, 2026
            </p>
            <p className="text-sm text-muted-foreground mt-4 text-left">
              {isFounder
                ? 'This consent form includes required and optional consent items for company profile registration, subscription payments, content posting, and metrics integration. Company registration and posting may be restricted if you do not agree to the required items. IV is not an investment platform and does not broker investments.'
                : 'This consent form includes required and optional consent items for using the IV service. Access to the service may be restricted if you do not agree to the required items. IV is not an investment platform and does not solicit, recommend, or guarantee investments.'}
            </p>
            {isFounder && (
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border text-left">
                "Founder" refers to the CEO or authorized representative who registers company profiles and business metrics on the IV platform.
              </p>
            )}
          </div>

          {/* Content */}
          <CardContent className="pt-6 space-y-6">
            {/* Agree to All Checkbox */}
            <div
              className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5 cursor-pointer"
              onClick={handleSelectAll}
            >
              <Checkbox
                id="agree-all"
                checked={allAgreed}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="agree-all"
                className="text-base font-semibold cursor-pointer flex-1 text-foreground"
              >
                Agree to All Terms (including optional items)
              </label>
            </div>

            {/* Consent Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <ConsentCheckboxItem
                  key={item.id}
                  item={item}
                  checked={consents[item.id] || false}
                  onCheckedChange={(checked) => handleConsentChange(item.id, checked)}
                />
              ))}
            </div>
          </CardContent>

          {/* Footer */}
          <div className="px-6 py-6 border-t border-border space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {allRequiredChecked ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  You have agreed to all required items
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {requiredItems.length -
                    Object.keys(consents).filter(
                      (id) => requiredItems.some((item) => item.id === id) && consents[id]
                    ).length}{' '}
                  required items need your consent
                </>
              )}
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={!allRequiredChecked}
              onClick={onComplete}
            >
              {isFounder ? 'Agree and Start Company Registration' : 'Agree and Get Started'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface ConsentCheckboxItemProps {
  item: ConsentItem;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function ConsentCheckboxItem({ item, checked, onCheckedChange }: ConsentCheckboxItemProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      <Checkbox
        id={item.id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="flex-1 space-y-2">
        <label
          htmlFor={item.id}
          className="text-sm font-medium leading-relaxed cursor-pointer text-foreground block"
        >
          {item.label}
          {!item.required && (
            <span className="text-muted-foreground ml-1">(Optional)</span>
          )}
        </label>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              View Details
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{item.modalTitle}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-2 text-sm text-muted-foreground">
                {item.modalContent.map((line, index) => (
                  <p
                    key={index}
                    className={
                      line === ''
                        ? 'h-4'
                        : line.startsWith('•')
                        ? 'pl-4'
                        : 'font-medium text-foreground'
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
