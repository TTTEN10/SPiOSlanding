terraform {
  required_version = ">= 1.5.0"
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = "~> 2.40"
    }
  }
}

provider "scaleway" {
  zone       = var.zone
  region     = var.region
  access_key = var.scaleway_access_key
  secret_key = var.scaleway_secret_key
  project_id = var.scaleway_project_id
}

module "chatbot_instance" {
  source    = "../../modules/chatbot-instance"
  server_id = var.chatbot_instance_id
}

module "app_instance" {
  source    = "../../modules/api-instance"
  server_id = var.app_instance_id
}

# Firewall: on chatbot (scw-new-psy), restrict :8000 to the app host (scw-happy-app) public or private IP
# in the Scaleway console (e.g. safepsy-dev-ai-service-sg). Avoid managing security_group_rules
# in Terraform here: scaleway_instance_security_group_rules replaces the full rule set and can lock SSH.
