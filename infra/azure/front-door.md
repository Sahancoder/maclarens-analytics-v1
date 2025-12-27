# Azure Front Door Configuration

## Overview

Azure Front Door provides global load balancing, SSL termination, and WAF protection for MacLarens Analytics.

## Features

- Global HTTP load balancing
- SSL/TLS termination
- Web Application Firewall (WAF)
- DDoS protection
- Custom domains

## Setup

### Create Front Door Profile

```bash
az afd profile create \
  --profile-name maclarens-fd \
  --resource-group maclarens-rg \
  --sku Premium_AzureFrontDoor
```

### Add Endpoints

```bash
# Frontend endpoint
az afd endpoint create \
  --endpoint-name frontend \
  --profile-name maclarens-fd \
  --resource-group maclarens-rg

# API endpoint
az afd endpoint create \
  --endpoint-name api \
  --profile-name maclarens-fd \
  --resource-group maclarens-rg
```

### Configure Origin Groups

```bash
az afd origin-group create \
  --origin-group-name frontend-origins \
  --profile-name maclarens-fd \
  --resource-group maclarens-rg \
  --probe-request-type GET \
  --probe-protocol Https \
  --probe-interval-in-seconds 30
```

### Add Origins

```bash
az afd origin create \
  --origin-name frontend-containerapp \
  --origin-group-name frontend-origins \
  --profile-name maclarens-fd \
  --resource-group maclarens-rg \
  --host-name maclarens-frontend.azurecontainerapps.io \
  --origin-host-header maclarens-frontend.azurecontainerapps.io \
  --http-port 80 \
  --https-port 443 \
  --priority 1 \
  --weight 1000
```

## WAF Policy

```bash
az network front-door waf-policy create \
  --name maclarens-waf \
  --resource-group maclarens-rg \
  --sku Premium_AzureFrontDoor \
  --mode Prevention
```

## Custom Domains

1. Add custom domain in Azure Portal
2. Validate domain ownership via DNS TXT record
3. Configure SSL certificate (managed or bring your own)
4. Create route to link domain to endpoint
