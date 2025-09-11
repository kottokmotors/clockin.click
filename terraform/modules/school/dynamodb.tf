# DynamoDB Users table
resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-${var.school_id}-Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    client = var.school_id
    application = var.project_name
  }
}

# DynamoDB TimeAttendance table
resource "aws_dynamodb_table" "time_attendance" {
  name         = "${var.project_name}-${var.school_id}-TimeAttendance"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "recordId"

  attribute {
    name = "recordId"
    type = "S"
  }

  tags = {
    client = var.school_id
    application = var.project_name
  }
}