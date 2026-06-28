import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Shield, Loader2, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import api from "../../lib/api";
import { toast } from "../../hooks/useToast";

interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export function TwoFactorModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"setup" | "verify">("setup");
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/auth/2fa/setup");
      return response.data.data as TwoFactorSetupResponse;
    },
    onSuccess: (data) => {
      setSetupData(data);
      setStep("verify");
      toast({
        title: "2FA Setup Initiated",
        description: "Scan the QR code with your authenticator app",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.response?.data?.error?.message || "Failed to setup 2FA",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post("/auth/2fa/verify", { code });
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "2FA Enabled Successfully!",
        description: "Two-factor authentication is now active on your account",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.response?.data?.error?.message || "Invalid verification code",
      });
    },
  });

  const handleSetup = () => {
    setupMutation.mutate();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyMutation.mutate(verificationCode);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setStep("setup");
      setSetupData(null);
      setVerificationCode("");
      setCopiedBackupCodes(false);
    }, 300);
  };

  const copyBackupCodes = () => {
    if (setupData?.backup_codes) {
      navigator.clipboard.writeText(setupData.backup_codes.join("\n"));
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 2000);
      toast({
        title: "Backup Codes Copied",
        description: "Store these codes in a safe place",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="ml-2">
          <Shield className="w-4 h-4 mr-2" />
          Enable Two-Factor Authentication
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {step === "setup" ? (
          <>
            <DialogHeader>
              <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Add an extra layer of security to your account by requiring a verification code in addition to your password.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">What you'll need:</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>An authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Your smartphone or tablet</li>
                  </ul>
                </div>
                <p className="text-sm text-slate-600">
                  Click "Continue" to generate your QR code and backup codes.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={setupMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetup}
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Scan QR Code</DialogTitle>
              <DialogDescription>
                Scan this QR code with your authenticator app, then enter the verification code.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleVerify}>
              <div className="grid gap-4 py-4">
                {setupData?.qr_code && (
                  <div className="flex justify-center p-4 bg-white border border-slate-200 rounded-lg">
                    <img 
                      src={setupData.qr_code} 
                      alt="2FA QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label>Manual Entry Key</Label>
                  <div className="p-3 bg-slate-100 rounded-md border border-slate-300 font-mono text-sm break-all">
                    {setupData?.secret}
                  </div>
                </div>

                {setupData?.backup_codes && setupData.backup_codes.length > 0 && (
                  <div className="grid gap-2">
                    <Label className="text-yellow-600">Backup Codes (Save These!)</Label>
                    <div className="relative">
                      <div className="p-3 pr-12 bg-yellow-50 rounded-md border border-yellow-300 font-mono text-xs space-y-1 max-h-32 overflow-y-auto">
                        {setupData.backup_codes.map((code, idx) => (
                          <div key={idx}>{code}</div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="absolute right-1 top-1 h-8 w-8 p-0"
                        onClick={copyBackupCodes}
                      >
                        {copiedBackupCodes ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-yellow-600">
                      ⚠️ Save these backup codes. You can use them to access your account if you lose your device.
                    </p>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="verification-code">Verification Code</Label>
                  <Input
                    id="verification-code"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    disabled={verifyMutation.isPending}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={verifyMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
