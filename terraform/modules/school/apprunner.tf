# App Runner service
resource "aws_apprunner_service" "service" {
  service_name = "${var.project_name}-${var.school_id}-app"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_role.arn
    }

    image_repository {
      image_identifier      = var.docker_image
      image_repository_type = "ECR"
      image_configuration {
        port = "3000"
      }
    }
  }
}