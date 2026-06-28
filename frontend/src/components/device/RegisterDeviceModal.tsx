import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Copy, Check } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import api from "../../lib/api";
import { toast } from "../../hooks/useToast";

interface RegisterDeviceResponse {
  device_id: string;
  device_name: string;
  hardware_tier: number;
  load_limit_kg: number;
  api_key?: string;
  created_at: string;
}

export function RegisterDeviceModal() {
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [hardwareTier, setHardwareTier] = useState("1");
  const [loadLimit, setLoadLimit] = useState("");
  const [registeredDevice, setRegisteredDevice] = useState<RegisterDeviceResponse | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState(false);
  
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: async (data: { device_name: string; hardware_tier: number; load_limit_kg: number }) => {
      const response = await api.post("/devices/register", data);
      return response.data.data as RegisterDeviceResponse;
    },
    onSuccess: (data) => {
      setRegisteredDevice(data);
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({
        title: "Device Registered Successfully!",
        description: `${data.device_name} has been registered. Save the API key below.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.response?.data?.error?.message || "Failed to register device",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      device_name: deviceName,
      hardware_tier: parseInt(hardwareTier),
      load_limit_kg: parseInt(loadLimit),
    });
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after a delay to allow animation
    setTimeout(() => {
      setDeviceName("");
      setHardwareTier("1");
      setLoadLimit("");
      setRegisteredDevice(null);
      setCopiedApiKey(false);
    }, 300);
  };

  const copyApiKey = () => {
    if (registeredDevice?.api_key) {
      navigator.clipboard.writeText(registeredDevice.api_key);
      setCopiedApiKey(true);
      setTimeout(() => setCopiedApiKey(false), 2000);
      toast({
        title: "API Key Copied",
        description: "The API key has been copied to your clipboard",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Register New Hardware
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {!registeredDevice ? (
          <>
            <DialogHeader>
              <DialogTitle>Register New Hardware Device</DialogTitle>
              <DialogDescription>
                Register a new IoT hardware device to start collecting telemetry data.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="device-name">Device Name</Label>
                  <Input
                    id="device-name"
                    placeholder="e.g., Truck Alpha, Loader 01"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    required
                    minLength={3}
                    disabled={registerMutation.isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hardware-tier">Hardware Tier</Label>
                  <Select
                    value={hardwareTier}
                    onValueChange={setHardwareTier}
                    disabled={registerMutation.isPending}
                  >
                    <SelectTrigger id="hardware-tier">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tier 1 - Basic (Weight + GPS)</SelectItem>
                      <SelectItem value="2">Tier 2 - Standard (+ Fuel + Speed)</SelectItem>
                      <SelectItem value="3">Tier 3 - Premium (+ ECU Control)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="load-limit">Legal Load Limit (kg)</Label>
                  <Input
                    id="load-limit"
                    type="number"
                    placeholder="e.g., 15000"
                    value={loadLimit}
                    onChange={(e) => setLoadLimit(e.target.value)}
                    required
                    min={1}
                    max={100000}
                    disabled={registerMutation.isPending}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={registerMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register Device"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-green-400">✓ Device Registered Successfully!</DialogTitle>
              <DialogDescription>
                Save the API key below. It will only be shown once.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Device ID</Label>
                <div className="p-3 bg-slate-800 rounded-md border border-slate-700 font-mono text-sm text-slate-300">
                  {registeredDevice.device_id}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Device Name</Label>
                <div className="p-3 bg-slate-800 rounded-md border border-slate-700 text-sm text-slate-300">
                  {registeredDevice.device_name}
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-yellow-400">API Key (Save This!)</Label>
                <div className="relative">
                  <div className="p-3 pr-12 bg-slate-800 rounded-md border border-yellow-600 font-mono text-xs text-yellow-400 break-all">
                    {registeredDevice.api_key}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={copyApiKey}
                  >
                    {copiedApiKey ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-yellow-400">
                  ⚠️ This API key will not be shown again. Copy it now and store it securely.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
