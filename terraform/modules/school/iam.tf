# IAM role for App Runner
resource "aws_iam_role" "apprunner_role" {
  name = "${var.project_name}-${var.school_id}-apprunner-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "build.apprunner.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    client = var.school_id
    application = var.project_name
  }
}

# IAM policy granting access to this school's DynamoDB tables
resource "aws_iam_role_policy" "dynamodb_policy" {
  name = "${var.project_name}-${var.school_id}-apprunner-policy"
  role = aws_iam_role.apprunner_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:*"]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.time_attendance.arn
        ]
      }
    ]
  })
}
