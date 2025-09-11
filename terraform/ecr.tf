resource "aws_ecr_repository" "timekeeper_app" {
  name                 = var.project_name
  image_tag_mutability = "MUTABLE"

  tags = {
    application     = var.project_name
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.timekeeper_app.repository_url
}

