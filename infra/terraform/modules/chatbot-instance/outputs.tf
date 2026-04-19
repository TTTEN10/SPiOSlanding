output "server_id" {
  value = data.scaleway_instance_server.this.id
}

output "public_ip" {
  value       = local.first_public_ip
  description = "Primary public IPv4 when present"
}

output "private_ip" {
  value       = local.effective_private_ip
  description = "Preferred private IPv4; falls back to public if no private IP is exposed in the API"
}

locals {
  first_public_ip      = try(data.scaleway_instance_server.this.public_ips[0].address, null)
  first_private_ip     = try(data.scaleway_instance_server.this.private_ips[0].address, null)
  effective_private_ip = coalesce(local.first_private_ip, local.first_public_ip)
}
