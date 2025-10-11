resource "aws_ecr_repository" "clockinclick" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"

  tags = {
    application     = var.project_name
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.clockinclick.repository_url
}

