# Azure Deployment Guide

This document contains instructions for managing the Azure deployment of the Card Battler application.

## Deployment Status Management

### Completely Stopping the Deployment (to eliminate costs)

To completely stop your deployment and eliminate almost all costs:

```bash
# 1. Delete the Container App
az containerapp delete -n card-battler -g card-battler-rg --yes

# 2. Delete the Container App Environment
az containerapp env delete -n card-battler-env -g card-battler-rg --yes
```

This will:
- Delete all running containers and their configurations
- Delete the Container App Environment
- Eliminate all compute and environment costs
- Keep your Container Registry intact with your images (minimal storage cost)
- Keep your resource group intact

### Redeploying the Application

When you're ready to bring your application back online:

```bash
# 1. Recreate the Container App Environment
az containerapp env create \
  --name card-battler-env \
  --resource-group card-battler-rg \
  --location eastus

# 2. Redeploy the Container App
az containerapp create \
  --name card-battler \
  --resource-group card-battler-rg \
  --environment card-battler-env \
  --image cardbattlerregistry.azurecr.io/card-battler:latest \
  --target-port 3001 \
  --ingress external
```

This will:
- Recreate your environment and container app from scratch
- Make your application available at a new URL (check the output for the new URL)
- Resume normal billing

## Monitoring Costs

To check your current Azure costs:

```bash
# View cost analysis in browser
az cost management view --scope "subscriptions/$(az account show --query id -o tsv)" --timeperiod MonthToDate
```

Or visit the [Azure Cost Management portal](https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/costanalysis).

## Deployment Details

- Resource Group: `card-battler-rg`
- Container App: `card-battler`
- Container App Environment: `card-battler-env`
- Container Registry: `cardbattlerregistry`
- Deployed Image: `cardbattlerregistry.azurecr.io/card-battler:latest`

## Full Removal (if needed)

If you want to completely remove the deployment and stop all charges:

```bash
# Delete the entire resource group (this deletes EVERYTHING in the group)
az group delete -n card-battler-rg
```

WARNING: This is irreversible and will delete all resources in the resource group.