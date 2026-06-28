"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FormAlert } from "@/components/security/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NotionConnectDialog({
  open,
  onOpenChange,
  isConnecting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isConnecting?: boolean;
  onSubmit: (apiKey: string | null) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [touched, setTouched] = useState(false);

  const reset = () => {
    setApiKey("");
    setTouched(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Notion</DialogTitle>
          <DialogDescription>
            Create an internal integration in Notion (Settings &amp; Members →
            Connections → Develop your own integration) and paste its secret
            token here.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {touched && !apiKey && (
            <FormAlert
              variant="error"
              message="Enter a Notion API key, or cancel to use a server-configured key if available."
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="notion-api-key">Notion API Key</Label>
            <Input
              id="notion-api-key"
              type="password"
              placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Stored encrypted and never shown after saving.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!apiKey) {
                setTouched(true);
                return;
              }
              onSubmit(apiKey);
            }}
            disabled={!apiKey || isConnecting}
          >
            {isConnecting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
