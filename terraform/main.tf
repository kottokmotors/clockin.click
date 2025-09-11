module "schools" {
  for_each  = toset(var.schools)
  source    = "./modules/school"
  school_id = each.value
  project_name = var.project_name
  route53_zone_id = var.route53_zone_id
  docker_image = "${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}:${each.value}-latest"
}

output "school_service_urls" {
  value = { for s, m in module.schools : s => m.apprunner_url }
}

