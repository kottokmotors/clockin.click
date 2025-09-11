variable "school_id" {
  type        = string
  description = "Unique identifier for the school"
}

variable "docker_image" {
  type        = string
  description = "Full ECR Docker image URI for this school"
}

variable "project_name" {
  type = string
  description = "Identifier for the project."
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 Hosted Zone ID to create subdomain records"
}