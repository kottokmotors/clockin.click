# App Runner service
resource "aws_apprunner_service" "service" {
  service_name = "${var.project_name}-${var.school_id}-app"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }

    image_repository {
      image_identifier      = var.docker_image
      image_repository_type = "ECR"
      image_configuration {
        port = "3000"
      }
    }
  }

  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_instance_role.arn
  }

  tags = {
    client = var.school_id
    application = var.project_name
  }
}

# Custom domain association for school subdomain
resource "aws_apprunner_custom_domain_association" "domain" {
  service_arn = aws_apprunner_service.service.arn
  domain_name = "${var.school_id}.clockin.click"
}