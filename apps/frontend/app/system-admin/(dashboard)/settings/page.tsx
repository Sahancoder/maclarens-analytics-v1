"use client";

import { useState } from "react";
import { Save, Globe, Bell, Shield, Database, Mail, Clock, ChevronRight } from "lucide-react";

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: any;
}

const sections: SettingSection[] = [
  { id: "general", title: "General Settings", description: "Basic system configuration", icon: Globe },
  { id: "notifications", title: "Notification Settings", description: "Email and alert preferences", icon: Bell },
  { id: "security", title: "Security Settings", description: "Authentication and access control", icon: Shield },
  { id: "backup", title: "Backup & Recovery", description: "Data backup configuration", icon: Database },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [settings, setSettings] = useState({
    companyName: "McLarens Group",
    timezone: "Asia/Colombo",
    dateFormat: "DD/MM/YYYY",
    currency: "LKR",
    fiscalYearStart: "April",
    emailNotifications: true,
    reportReminders: true,
    systemAlerts: true,
    sessionTimeout: "30",
    twoFactorAuth: false,
    passwordExpiry: "90",
    backupFrequency: "daily",
    backupRetention: "30",
    autoBackup: true,
  });

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
            <p className="text-base text-slate-500 mt-2">Configure system preferences and options</p>
          </div>
          <button className="flex items-center gap-2 h-11 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors">
            <Save className="h-4 w-4" /> Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="xl:col-span-1 space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                    activeSection === section.id
                      ? "bg-[#0b1f3a] text-white"
                      : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{section.title}</p>
                      <p className={`text-xs ${activeSection === section.id ? "text-white/70" : "text-slate-500"}`}>
                        {section.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Settings Content */}
          <div className="xl:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              {activeSection === "general" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-200">General Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Organization Name</label>
                      <input
                        type="text"
                        value={settings.companyName}
                        onChange={(e) => updateSetting("companyName", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => updateSetting("timezone", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      >
                        <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                        <option value="UTC">UTC (GMT+0)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Date Format</label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => updateSetting("dateFormat", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Currency</label>
                      <select
                        value={settings.currency}
                        onChange={(e) => updateSetting("currency", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      >
                        <option value="LKR">LKR - Sri Lankan Rupee</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Fiscal Year Start</label>
                      <select
                        value={settings.fiscalYearStart}
                        onChange={(e) => updateSetting("fiscalYearStart", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      >
                        <option value="January">January</option>
                        <option value="April">April</option>
                        <option value="July">July</option>
                        <option value="October">October</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-200">Notification Settings</h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Email Notifications</p>
                        <p className="text-xs text-slate-500">Receive email alerts for important events</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => updateSetting("emailNotifications", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-[#0b1f3a]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-slate-800">Report Reminders</p>
                        <p className="text-xs text-slate-500">Send reminders for pending report submissions</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.reportReminders}
                        onChange={(e) => updateSetting("reportReminders", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-[#0b1f3a]"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                      <div>
                        <p className="text-sm font-medium text-slate-800">System Alerts</p>
                        <p className="text-xs text-slate-500">Receive alerts for system health issues</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.systemAlerts}
                        onChange={(e) => updateSetting("systemAlerts", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-[#0b1f3a]"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeSection === "security" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-200">Security Settings</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => updateSetting("sessionTimeout", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Password Expiry (days)</label>
                      <input
                        type="number"
                        value={settings.passwordExpiry}
                        onChange={(e) => updateSetting("passwordExpiry", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      />
                    </div>
                  </div>
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-500">Require 2FA for all admin users</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={(e) => updateSetting("twoFactorAuth", e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-[#0b1f3a]"
                    />
                  </label>
                </div>
              )}

              {activeSection === "backup" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-slate-900 pb-4 border-b border-slate-200">Backup & Recovery</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Backup Frequency</label>
                      <select
                        value={settings.backupFrequency}
                        onChange={(e) => updateSetting("backupFrequency", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Retention Period (days)</label>
                      <input
                        type="number"
                        value={settings.backupRetention}
                        onChange={(e) => updateSetting("backupRetention", e.target.value)}
                        className="w-full h-11 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-[#0b1f3a]"
                      />
                    </div>
                  </div>
                  <label className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Automatic Backups</p>
                      <p className="text-xs text-slate-500">Enable scheduled automatic backups</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoBackup}
                      onChange={(e) => updateSetting("autoBackup", e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-[#0b1f3a]"
                    />
                  </label>
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm font-medium text-emerald-800">Last Backup</p>
                    <p className="text-xs text-emerald-600 mt-1">December 23, 2025 at 12:30 PM • Size: 2.4 GB</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
