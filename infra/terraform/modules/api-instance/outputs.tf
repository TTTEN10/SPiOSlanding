output "server_id" {
  value = data.scaleway_instance_server.this.id
}

output "public_ip" {
  value = local.first_public_ip
}

output "private_ip" {
  value = local.effective_private_ip
}

locals {
  first_public_ip      = try(data.scaleway_instance_server.this.public_ips[0].address, null)
  first_private_ip     = try(data.scaleway_instance_server.this.private_ips[0].address, null)
  effective_private_ip = coalesce(local.first_private_ip, local.first_public_ip)
}
