# IAM access role for App Runner
resource "aws_iam_role" "apprunner_access_role" {
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

# IAM policy granting access ECR
resource "aws_iam_policy" "apprunner_access_role_policy" {
  name = "${var.project_name}-${var.school_id}-apprunner-access-role-policy"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect  = "Allow"
        Action  = ["ecr:*"]
        Resource= "*"
      }
    ]
  })
}

# Attach access role policy to role
resource "aws_iam_role_policy_attachment" "apprunner_access_role_attach" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = aws_iam_policy.apprunner_access_role_policy.arn
}


# IAM instance role for App Runner
resource "aws_iam_role" "apprunner_instance_role" {
  name = "${var.project_name}-${var.school_id}-apprunner-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "tasks.apprunner.amazonaws.com"
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
resource "aws_iam_policy" "apprunner_instance_role_policy" {
  name = "${var.project_name}-${var.school_id}-apprunner-instance-role-policy"

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
      },
      {
        Effect  = "Allow"
        Action  = ["ecr:*"]
        Resource= "*"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "apprunner_instance_role_attach" {
  role       = aws_iam_role.apprunner_instance_role.name
  policy_arn = aws_iam_policy.apprunner_instance_role_policy.arn
}
