# Azure Database for PostgreSQL

## Overview

MacLarens Analytics uses Azure Database for PostgreSQL Flexible Server for production data storage.

## Configuration

### Server Specifications

- **SKU**: Standard_D2s_v3 (2 vCores, 8 GB RAM)
- **Storage**: 128 GB
- **Backup Retention**: 7 days
- **Geo-redundant Backup**: Enabled for production
- **High Availability**: Zone-redundant for production

## Setup

### Create Server

```bash
az postgres flexible-server create \
  --name maclarens-db \
  --resource-group maclarens-rg \
  --location eastus \
  --admin-user pgadmin \
  --admin-password <secure-password> \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose \
  --storage-size 128 \
  --version 15 \
  --high-availability ZoneRedundant
```

### Create Database

```bash
az postgres flexible-server db create \
  --resource-group maclarens-rg \
  --server-name maclarens-db \
  --database-name maclarens_analytics
```

### Configure Firewall

```bash
# Allow Azure services
az postgres flexible-server firewall-rule create \
  --resource-group maclarens-rg \
  --name maclarens-db \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Connection String

```
postgresql://<username>:<password>@maclarens-db.postgres.database.azure.com:5432/maclarens_analytics?sslmode=require
```

## Extensions

Enable required extensions:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## Backup & Recovery

- Automated backups daily
- Point-in-time restore up to 7 days
- Geo-restore for disaster recovery

## Monitoring

- Enable Azure Monitor for PostgreSQL
- Configure alerts for:
  - CPU > 80%
  - Storage > 85%
  - Connection failures
  - Long-running queries
