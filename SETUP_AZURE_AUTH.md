# Setting Up Azure Entra ID Authentication

Follow these steps to configure Microsoft Entra ID (Azure AD) for McLarens Analytics.

## 1. Register the Application in Azure Portal

1.  Log in to the [Azure Portal](https://portal.azure.com/).
2.  Search for **App registrations** and select it.
3.  Click **New registration**.
4.  **Name**: `McLarens Analytics (Local Dev)`
5.  **Supported account types**: Accounts in this organizational directory only (Single tenant).
6.  **Redirect URI**:
    - Select **Web**.
    - Enter: `http://localhost:3000/api/auth/callback/azure-ad`
7.  Click **Register**.

## 2. Get Credentials

On the **Overview** page of your new app, copy these values:

- **Application (client) ID**
- **Directory (tenant) ID**

## 3. Create Client Secret

1.  Go to **Certificates & secrets** in the left menu.
2.  Click **New client secret**.
3.  Description: `Local Dev Secret`.
4.  Expires: Select a duration (e.g., 6 months).
5.  Click **Add**.
6.  **IMPORTANT**: Copy the **Value** immediately. You verify won't be able to see it again.

## 4. Configure Token Claims (Optional but Recommended)

To ensure the email is always included in the token:

1.  Go to **Token configuration**.
2.  Click **Add optional claim**.
3.  Select **ID** token.
4.  Select `email`, `family_name`, `given_name`, `upn`.
5.  Click **Add**.

## 5. Setup App Roles (RBAC)

To map Azure users to internal roles (Admin, Finance Director, etc.):

1.  Go to **App roles**.
2.  Create the following roles:
    - **Display name**: `Admin` | **Value**: `ADMIN`
    - **Display name**: `Finance Director` | **Value**: `COMPANY_DIRECTOR`
    - **Display name**: `Finance Officer` | **Value**: `DATA_OFFICER`
    - **Display name**: `Managing Director` | **Value**: `CEO`
    - **Allowed member types**: Users/Groups
3.  **Assign Roles**:
    - Go to **Enterprise applications** (search in top search bar).
    - Find your app (`McLarens Analytics (Local Dev)`).
    - Go to **Users and groups**.
    - Add user -> Select User -> Select Role.

## 6. Configure Local Environment

Create a file named `.env` in the `infra/docker/` directory with the following content:

```ini
# ==========================================
# McLarens Analytics - Docker Environment
# ==========================================

# ─── Auth Mode ───
# Change to 'entra' to enable Microsoft Login
AUTH_MODE=entra

# ─── Azure Entra ID Credentials ───
AZURE_AD_CLIENT_ID=your_client_id_here
AZURE_AD_TENANT_ID=your_tenant_id_here
AZURE_AD_CLIENT_SECRET=your_client_secret_here

# ─── NextAuth Config ───
# Generate a random string for security (openssl rand -base64 32)
NEXTAUTH_SECRET=changeme_dev_secret_12345
NEXTAUTH_URL=http://localhost:3000

# ─── Database ───
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=maclarens_analytics
```

## 7. Apply Changes

Restart your Docker environment to apply the new configuration:

```powershell
# Stop existing containers
./docker-dev.ps1 stop

# Start with new env vars
./docker-dev.ps1 start
```

## 8. Development Bypass (If Azure is not ready)

If you cannot set up Azure yet, you can still use the app in **Dev Mode**:

1.  Set `AUTH_MODE=dev` in your `.env` file.
2.  Restart Docker.
3.  On the login screen, if the Microsoft login fails or is disabled, the system will fallback to local dev usage (via the code we just implemented).
