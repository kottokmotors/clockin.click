variable "aws_account_id" {
  type        = string
  description = "AWS Account ID for ECR"
  default = "905418082003"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type = string
  default = "clockinclick"
}

variable "schools" {
  type    = list(string)
  default = ["WildFlower"]
}

variable "route53_zone_id" {
  type        = string
  description = "Route53 Hosted Zone ID"
  default = "Z01523052WFJO5NYZBFF2"
}