variable "project_name" {
  type    = string
  default = "safepsy"
}

variable "environment" {
  type    = string
  default = "prod"
}

variable "zone" {
  type        = string
  description = "Scaleway zone (e.g. fr-par-2)"
  default     = "fr-par-2"
}

variable "region" {
  type        = string
  description = "Scaleway region (e.g. fr-par)"
  default     = "fr-par"
}

variable "scaleway_access_key" {
  type        = string
  sensitive   = true
  description = "Scaleway API access key"
}

variable "scaleway_secret_key" {
  type        = string
  sensitive   = true
  description = "Scaleway API secret key"
}

variable "scaleway_project_id" {
  type        = string
  description = "Scaleway project ID"
}

# CI workflow compatibility (optional features)
variable "ai_service_enabled" {
  type    = bool
  default = false
}

variable "ai_service_container_image" {
  type    = string
  default = ""
}

variable "chatbot_instance_id" {
  type        = string
  description = "Existing Scaleway Instance ID for chatbot (scw-new-psy, DEV1-M PAR2)"
  default     = "60a5e86a-07a8-4e17-aa3b-862ae586d030"
}

variable "app_instance_id" {
  type        = string
  description = "Existing Scaleway Instance ID for app (scw-happy-app)"
  default     = "51c98b35-29cf-4650-9acd-927bf0bbb2cf"
}
