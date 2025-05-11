#!/bin/bash

# Azure Deployment Management Script for Card Battler
# Usage: ./azure-deploy.sh [start|stop|status]

# Configuration - Edit these variables if needed
RESOURCE_GROUP="card-battler-rg"
APP_NAME="card-battler"
ENV_NAME="card-battler-env"
REGISTRY_NAME="cardbattlerregistry"
LOCATION="eastus"
IMAGE_TAG="latest"
PORT="3001"

# Display usage information
show_usage() {
  echo "Usage: $0 [start|stop|status|cost]"
  echo ""
  echo "Commands:"
  echo "  start  - Deploy the application"
  echo "  stop   - Remove the application to save costs"
  echo "  status - Check deployment status"
  echo "  cost   - Show current cost information"
  echo ""
}

# Check if Azure CLI is installed
check_azure_cli() {
  if ! command -v az &> /dev/null; then
    echo "Azure CLI is not installed. Please install it first."
    echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
  fi

  # Check if logged in
  SUBSCRIPTION=$(az account show --query name -o tsv 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "You're not logged in to Azure. Running 'az login'..."
    az login
  else
    echo "Using Azure subscription: $SUBSCRIPTION"
  fi
}

# Stop and remove the application
stop_app() {
  echo "Stopping and removing Azure Container App deployment..."
  
  # Delete Container App
  echo "Deleting Container App: $APP_NAME"
  az containerapp delete -n $APP_NAME -g $RESOURCE_GROUP --yes
  
  # Delete Container App Environment
  echo "Deleting Container App Environment: $ENV_NAME"
  az containerapp env delete -n $ENV_NAME -g $RESOURCE_GROUP --yes
  
  echo "Deployment removed successfully!"
  echo "Only Container Registry remains (minimal storage costs)"
  echo "To restart the app later, use: $0 start"
}

# Start and deploy the application
start_app() {
  echo "Starting Azure Container App deployment..."
  
  # Check if container registry exists
  REGISTRY_EXISTS=$(az acr show --name $REGISTRY_NAME --query name -o tsv 2>/dev/null)
  if [ -z "$REGISTRY_EXISTS" ]; then
    echo "Container Registry $REGISTRY_NAME not found."
    echo "Please create it first or update the REGISTRY_NAME in this script."
    exit 1
  fi
  
  # Create Container App Environment
  echo "Creating Container App Environment: $ENV_NAME"
  az containerapp env create \
    --name $ENV_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION
  
  # Get the registry server URL
  REGISTRY_SERVER=$(az acr show --name $REGISTRY_NAME --query loginServer -o tsv)
  
  # Check if the image exists
  IMAGE_EXISTS=$(az acr repository show --name $REGISTRY_NAME --image card-battler:$IMAGE_TAG 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "Image $REGISTRY_SERVER/card-battler:$IMAGE_TAG not found."
    echo "Please build and push the image first or update the IMAGE_TAG in this script."
    exit 1
  fi
  
  # Deploy Container App
  echo "Deploying Container App: $APP_NAME"
  az containerapp create \
    --name $APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --environment $ENV_NAME \
    --image $REGISTRY_SERVER/card-battler:$IMAGE_TAG \
    --target-port $PORT \
    --ingress external \
    --registry-server $REGISTRY_SERVER
  
  # Get the app URL
  APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
  
  echo "Deployment completed successfully!"
  echo "Your app is available at: https://$APP_URL"
}

# Check deployment status
check_status() {
  echo "Checking deployment status..."
  
  # Check if resource group exists
  RG_EXISTS=$(az group show --name $RESOURCE_GROUP 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "Resource group $RESOURCE_GROUP not found."
    return
  fi
  
  # Check Container Registry
  REGISTRY_EXISTS=$(az acr show --name $REGISTRY_NAME --query name -o tsv 2>/dev/null)
  if [ -z "$REGISTRY_EXISTS" ]; then
    echo "Container Registry: Not found"
  else
    echo "Container Registry: $REGISTRY_NAME (Available)"
    # List images
    echo "Available images:"
    az acr repository list --name $REGISTRY_NAME -o table
  fi
  
  # Check Container App Environment
  ENV_EXISTS=$(az containerapp env show --name $ENV_NAME --resource-group $RESOURCE_GROUP 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "Container App Environment: Not deployed"
  else
    echo "Container App Environment: $ENV_NAME (Deployed)"
  fi
  
  # Check Container App
  APP_EXISTS=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "Container App: Not deployed"
  else
    APP_URL=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
    REPLICAS=$(az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query properties.configuration.activeRevisionsMode -o tsv)
    
    echo "Container App: $APP_NAME (Deployed)"
    echo "URL: https://$APP_URL"
    echo "Revision mode: $REPLICAS"
  fi
}

# Check costs
check_cost() {
  echo "Checking Azure costs..."

  # The Azure CLI command for cost data has changed
  # Instead of trying to get exact cost data here, we'll just show resource status
  echo "Active Azure resources in your resource group that incur costs:"

  # List all resources in the resource group
  az resource list --resource-group $RESOURCE_GROUP -o table

  echo ""
  echo "For detailed cost analysis, visit the Azure Portal:"
  echo "https://portal.azure.com/#blade/Microsoft_Azure_CostManagement/Menu/costanalysis"
}

# Main script execution
check_azure_cli

if [ $# -eq 0 ]; then
  show_usage
  exit 0
fi

case "$1" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  status)
    check_status
    ;;
  cost)
    check_cost
    ;;
  *)
    show_usage
    exit 1
    ;;
esac

exit 0