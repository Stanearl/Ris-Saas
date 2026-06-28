import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { mockUser } from '@/lib/mockData';
import { User, CreditCard, Bell, Shield } from 'lucide-react';
import { RegisterDeviceModal } from '@/components/device/RegisterDeviceModal';
import { ChangePasswordModal } from '@/components/security/ChangePasswordModal';
import { TwoFactorModal } from '@/components/security/TwoFactorModal';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your account and subscription
        </p>
      </div>
      
      {/* Profile Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
              {mockUser.avatar}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{mockUser.name}</p>
              <p className="text-sm text-slate-500">{mockUser.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Full Name
              </label>
              <Input
                type="text"
                value={mockUser.name}
                readOnly
                className="bg-slate-50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Email Address
              </label>
              <Input
                type="email"
                value={mockUser.email}
                readOnly
                className="bg-slate-50"
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Subscription Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-semibold text-slate-900">{mockUser.subscription.plan} Plan</p>
              <p className="text-sm text-slate-500 mt-1">
                Expires on {new Date(mockUser.subscription.expiresAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
            <Badge variant="success">
              {mockUser.subscription.status.toUpperCase()}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-500">Devices</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">3</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-500">Data Retention</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">90d</p>
            </div>
            <div className="p-4 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-500">API Calls</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">∞</p>
            </div>
          </div>
          
          <div className="pt-4">
            <Button variant="outline">Manage Subscription</Button>
          </div>
        </div>
      </Card>
      
      {/* Notifications Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Weight Limit Alerts</p>
              <p className="text-sm text-slate-500">Get notified when vehicles approach weight limits</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Device Offline Alerts</p>
              <p className="text-sm text-slate-500">Alert when a device goes offline</p>
            </div>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-900">Weekly Reports</p>
              <p className="text-sm text-slate-500">Receive weekly fleet performance summaries</p>
            </div>
            <input type="checkbox" className="w-5 h-5" />
          </div>
        </div>
      </Card>
      
      {/* Device Management Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Device Management</h2>
          </div>
          <RegisterDeviceModal />
        </div>
        
        <p className="text-sm text-slate-500">
          Register new IoT hardware devices to start collecting telemetry data from your fleet.
        </p>
      </Card>
      
      {/* Security Section */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Security</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <ChangePasswordModal />
            <TwoFactorModal />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SettingsPage;
