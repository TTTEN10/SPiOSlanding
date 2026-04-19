# References an existing Scaleway Instance (chatbot / LLM host).
terraform {
  required_providers {
    scaleway = {
      source  = "scaleway/scaleway"
      version = ">= 2.35.0"
    }
  }
}

data "scaleway_instance_server" "this" {
  server_id = var.server_id
}
