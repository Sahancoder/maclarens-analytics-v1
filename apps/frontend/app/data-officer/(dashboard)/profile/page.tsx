"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Mail, Upload, Camera } from "lucide-react";

interface UserProfile {
  name: string;
  email: string;
  companyName: string;
  companyCode: string;
  userName: string;
  userRole: string;
  mobileNumber: string;
  status: string;
  profileImage: string | null;
}

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile>({
    name: "Sahan Hettiarachchi",
    email: "sahanhettiarachchi275@gmail.com",
    companyName: "",
    companyCode: "",
    userName: "",
    userRole: "Budget Officer",
    mobileNumber: "",
    status: "Active",
    profileImage: null,
  });

  useEffect(() => {
    const auth = localStorage.getItem("auth");
    if (auth) {
      const { email } = JSON.parse(auth);
      const name = email
        .split("@")[0]
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
      setProfile((prev) => ({ ...prev, email, name }));
    }

    // Load saved profile image
    const savedImage = localStorage.getItem("profileImage");
    if (savedImage) {
      setProfile((prev) => ({ ...prev, profileImage: savedImage }));
    }
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProfile((prev) => ({ ...prev, profileImage: base64 }));
        localStorage.setItem("profileImage", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10">
      {/* Profile Header with Image Upload */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12">
        <div className="relative group">
          {profile.profileImage ? (
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <Image
                src={profile.profileImage}
                alt={profile.name}
                width={128}
                height={128}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-600 border-4 border-white shadow-lg">
              {getInitials(profile.name)}
            </div>
          )}
          
          {/* Upload overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-8 w-8 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
        
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0b1f3a]">{profile.name}</h1>
          <p className="text-slate-500 text-lg mt-1">{profile.email}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            {profile.userRole}
          </span>
        </div>
      </div>

      {/* Profile Form */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <div>
          <label className="block text-base font-medium text-slate-700 mb-2">Company Name</label>
          <input
            type="text"
            value={profile.companyName}
            onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
            placeholder="Your Company Name"
            className="w-full px-4 py-4 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-2">User Name</label>
          <input
            type="text"
            value={profile.userName}
            onChange={(e) => setProfile({ ...profile, userName: e.target.value })}
            placeholder="Your User Name"
            className="w-full px-4 py-4 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-2">Company Code</label>
          <select
            value={profile.companyCode}
            onChange={(e) => setProfile({ ...profile, companyCode: e.target.value })}
            className="w-full px-4 py-4 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a] bg-white"
          >
            <option value="">Select Company Code</option>
            <option value="MMA001">MMA001 - McLarens Maritime Academy</option>
            <option value="MMA002">MMA002 - McLarens Shipping</option>
            <option value="MMA003">MMA003 - McLarens Logistics</option>
          </select>
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-2">User Role</label>
          <input
            type="text"
            value={profile.userRole}
            disabled
            className="w-full px-4 py-4 border border-slate-200 rounded-xl text-lg bg-slate-50 text-slate-600"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-2">Mobile Number</label>
          <input
            type="tel"
            value={profile.mobileNumber}
            onChange={(e) => setProfile({ ...profile, mobileNumber: e.target.value })}
            placeholder="+94 XX XXX XXXX"
            className="w-full px-4 py-4 border border-slate-300 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-[#0b1f3a]"
          />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-2">Status</label>
          <div className="w-full px-4 py-4 border border-slate-200 rounded-xl text-lg bg-slate-50 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-slate-600">{profile.status}</span>
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="mt-12 max-w-4xl">
        <h2 className="text-xl font-semibold text-[#0b1f3a] mb-5">My Email Address</h2>
        <div className="flex items-center gap-4 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-[#0b1f3a]">{profile.email}</p>
            <p className="text-sm text-slate-500">Primary email • Verified</p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            Active
          </span>
        </div>
        
        <button className="mt-5 px-5 py-3 border-2 border-amber-500 text-amber-600 rounded-xl text-base font-medium hover:bg-amber-50 transition-colors flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Use organisation&apos;s Email Address
        </button>
      </div>

      {/* Save Button */}
      <div className="mt-10 max-w-4xl">
        <button className="px-8 py-4 bg-[#0b1f3a] text-white rounded-xl text-lg font-medium hover:bg-[#0b1f3a]/90 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  );
}
