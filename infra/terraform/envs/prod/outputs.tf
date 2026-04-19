output "chatbot_private_ip" {
  value       = module.chatbot_instance.private_ip
  description = "Primary instance IP for API → chatbot (private IP when present, else public)"
}

output "app_private_ip" {
  value       = module.app_instance.private_ip
  description = "App host preferred private IP"
}

output "chatbot_public_ip" {
  value = module.chatbot_instance.public_ip
}

output "app_public_ip" {
  value = module.app_instance.public_ip
}
