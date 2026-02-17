# Azure AD / Microsoft Entra ID Setup Guide

## Problem

Getting `OAuthCallback` error when trying to login with `sahanviranga18@gmail.com`.

## Root Cause

The Azure AD app registration is missing critical configuration or has invalid credentials.

---

## Step-by-Step Fix

### 1. Go to Azure Portal

1. Navigate to https://portal.azure.com
2. Search for **"App registrations"** in the top search bar
3. Find your app (or create a new one if needed)

### 2. Configure Redirect URIs

1. Click on your app registration
2. Go to **Authentication** (left sidebar)
3. Under **Platform configurations**, click **+ Add a platform**
4. Select **Web**
5. Add these Redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   http://localhost:3000
   ```
6. Under **Implicit grant and hybrid flows**, check:
   - ✅ ID tokens (used for implicit and hybrid flows)
7. Click **Save**

### 3. Get the Correct Client Secret

1. Go to **Certificates & secrets** (left sidebar)
2. Under **Client secrets** tab, you'll see your secrets with these columns:

   | Description | Value                 | Expires    | Secret ID         |
   | ----------- | --------------------- | ---------- | ----------------- |
   | My secret   | Hidden after creation | 2027-01-01 | 35a1a35d-74bd-... |

3. **Important:** The `35a1a35d-74bd-4b9e-a5ab-a69d136255af` in your `.env.local` is the **Secret ID** ❌
4. You need the **Value** column. Since it's hidden after creation, you must:
   - Click **+ New client secret**
   - Description: `MacLarens Analytics Local Dev`
   - Expires: **24 months**
   - Click **Add**
   - **IMMEDIATELY COPY THE VALUE** (looks like `abc8Q~xYz...`) — it's only shown once!

### 4. Configure Application Settings

1. Go to **Overview** (left sidebar)
2. Copy these values:
   - **Application (client) ID** → `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → `AZURE_AD_TENANT_ID`

### 5. Add API Permissions

1. Go to **API permissions** (left sidebar)
2. Ensure these permissions are granted:
   - ✅ Microsoft Graph → `User.Read` (Delegated)
   - ✅ Microsoft Graph → `openid` (Delegated)
   - ✅ Microsoft Graph → `profile` (Delegated)
   - ✅ Microsoft Graph → `email` (Delegated)
3. Click **Grant admin consent for [Your Organization]** (if you're an admin)

### 6. Configure Supported Account Types

1. Go to **Authentication** (left sidebar)
2. Under **Supported account types**, select:
   - ✅ **Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)**

   This allows your Gmail account (`sahanviranga18@gmail.com`) to login.

---

## Update Your .env.local File

After completing the Azure setup, update `apps/frontend/.env.local`:

```env
# --- COPY THESE VALUES FROM AZURE PORTAL ---
AZURE_AD_TENANT_ID=9afebbd5-e584-48b6-8ed9-73c9dff5a804
AZURE_AD_CLIENT_ID=b260a9be-d114-4a78-b493-d72c199ac331

# ⚠️ REPLACE THIS WITH THE NEW SECRET VALUE YOU JUST COPIED
# (It should look like: abc8Q~xYz1A2B3C4D5E6F7G8H9I0J...)
AZURE_AD_CLIENT_SECRET=PASTE_THE_NEW_SECRET_VALUE_HERE

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=some-long-random-string
```

---

## Restart Frontend

After updating `.env.local`:

```powershell
cd c:\Users\Sahan\Desktop\maclarens-analytics-v1\apps\frontend
npm run dev
```

---

## Test Login

1. Go to http://localhost:3000/system-admin/login
2. Click "Sign in with Microsoft"
3. You should be redirected to Microsoft login
4. After authentication, you should land on `/system-admin/dashboard`

---

## Troubleshooting

### Still getting errors?

Check the **Next.js terminal** for debug logs:

```
[NextAuth] Config: { hasAzureConfig: true, ... }
[NextAuth] signIn callback: { provider: 'azure-ad', email: 'sahanviranga18@gmail.com' }
[NextAuth] JWT callback - user email: sahanviranga18@gmail.com
```

### If you see `AADSTS...` error codes:

| Error Code      | Meaning                  | Fix                                                             |
| --------------- | ------------------------ | --------------------------------------------------------------- |
| `AADSTS50011`   | Redirect URI mismatch    | Add `http://localhost:3000/api/auth/callback/azure-ad` in Azure |
| `AADSTS7000215` | Invalid client secret    | Use the secret **Value**, not the Secret ID                     |
| `AADSTS50020`   | User account is disabled | Contact your Azure AD admin                                     |
| `AADSTS900144`  | App not found in tenant  | Check Tenant ID is correct                                      |

---

## Quick Verification Checklist

- [ ] Redirect URI includes `http://localhost:3000/api/auth/callback/azure-ad`
- [ ] `AZURE_AD_CLIENT_SECRET` is the secret **Value** (not the UUID Secret ID)
- [ ] Account type is set to "Multitenant and personal Microsoft accounts"
- [ ] ID tokens are enabled in Authentication
- [ ] API permissions include `User.Read`, `openid`, `profile`, `email`
- [ ] Frontend `.env.local` has been updated
- [ ] Frontend has been restarted after updating `.env.local`
