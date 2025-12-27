"use client";

import { useState } from "react";
import { Camera, Save, Building2, Mail, Phone, Briefcase, Shield, Calendar } from "lucide-react";

// Company assignment (from auth/session in real app)
const ASSIGNED_COMPANY = {
  code: "MMA",
  name: "McLarens Maritime Academy",
  cluster: "Shipping Services & Logistics",
  yearEnd: "March",
  financialYear: "FY 2025-26",
  director: {
    name: "Sahan Viranga",
    email: "sahanviranga18@gmail.com",
    phone: "+94 77 234 5678",
    designation: "Company Director",
    employeeId: "EMP-DIR-001",
    joinedDate: "January 2020",
  },
  dataOfficer: {
    name: "Sahan Hettiarachchi",
    email: "sahanhettiarachchi275@gmail.com",
    phone: "+94 77 123 4567",
    designation: "Data Entry Officer",
    employeeId: "EMP-DO-001",
    joinedDate: "March 2022",
  },
};

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: "Sahan",
    lastName: "Viranga",
    email: "sahanviranga18@gmail.com",
    phone: "+94 77 234 5678",
    designation: "Company Director",
    department: "Finance",
    employeeId: "EMP-DIR-001",
  });

  const update = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">User Profile</h1>
          <p className="text-base text-slate-500 mt-2">Manage your account information and view company details</p>
        </div>

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-28 w-28 rounded-full bg-[#0b1f3a] flex items-center justify-center text-white text-3xl font-semibold">
                {profile.firstName[0]}{profile.lastName[0]}
              </div>
              <button className="absolute bottom-1 right-1 h-9 w-9 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
                <Camera className="h-4 w-4 text-slate-600" />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-semibold text-slate-900">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="text-base text-slate-500 mt-1">{profile.designation}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  {ASSIGNED_COMPANY.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {profile.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-slate-400" />
                  {profile.employeeId}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="h-10 px-5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button className="flex items-center gap-2 h-10 px-5 text-sm font-medium text-white bg-[#0b1f3a] rounded-lg hover:bg-[#0b1f3a]/90 transition-colors">
                <Save className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Personal Information - Takes 2 columns */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="h-12 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="h-12 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  className="h-12 px-4 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  className="h-12 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Designation</label>
                <input
                  type="text"
                  value={profile.designation}
                  className="h-12 px-4 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Department</label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => update("department", e.target.value)}
                  className="h-12 px-4 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]/10 focus:border-[#0b1f3a]"
                />
              </div>
            </div>
          </div>

          {/* Assigned Company Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-xl bg-[#0b1f3a]/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-[#0b1f3a]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Assigned Company</h3>
                <p className="text-sm text-slate-500">Your company details</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase">Company Name</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ASSIGNED_COMPANY.name}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase">Company Code</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ASSIGNED_COMPANY.code}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase">Cluster</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ASSIGNED_COMPANY.cluster}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase">Financial Year</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ASSIGNED_COMPANY.financialYear}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase">Year End</span>
                <p className="text-sm font-semibold text-slate-900 mt-1">{ASSIGNED_COMPANY.yearEnd}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Company Team Section - Full Width */}
        <div className="bg-white rounded-xl border border-slate-200 p-8 mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Company Team</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Director Card */}
            <div className="border border-slate-200 rounded-xl p-6 bg-gradient-to-br from-[#0b1f3a]/5 to-transparent">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-[#0b1f3a] flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                  {ASSIGNED_COMPANY.director.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-slate-900">{ASSIGNED_COMPANY.director.name}</p>
                    <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">You</span>
                  </div>
                  <p className="text-sm text-emerald-600 font-medium mt-0.5">{ASSIGNED_COMPANY.director.designation}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {ASSIGNED_COMPANY.director.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {ASSIGNED_COMPANY.director.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      {ASSIGNED_COMPANY.director.employeeId}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Joined {ASSIGNED_COMPANY.director.joinedDate}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Officer Card */}
            <div className="border border-slate-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-600 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                  {ASSIGNED_COMPANY.dataOfficer.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-900">{ASSIGNED_COMPANY.dataOfficer.name}</p>
                  <p className="text-sm text-blue-600 font-medium mt-0.5">{ASSIGNED_COMPANY.dataOfficer.designation}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {ASSIGNED_COMPANY.dataOfficer.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {ASSIGNED_COMPANY.dataOfficer.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      {ASSIGNED_COMPANY.dataOfficer.employeeId}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      Joined {ASSIGNED_COMPANY.dataOfficer.joinedDate}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
