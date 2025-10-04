# DynamoDB Users table
resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-${var.school_id}-Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "UserId"

  attribute {
    name = "UserId"
    type = "S"
  }

  # For Email GSI
  attribute {
    name = "Email"
    type = "S"
  }

  # For Pin GSI
  attribute {
    name = "Pin"
    type = "S"
  }

  global_secondary_index {
    name               = "EmailIndex"
    hash_key           = "Email"
    projection_type    = "ALL"
  }

  global_secondary_index {
    name               = "PinIndex"
    hash_key           = "Pin"
    projection_type    = "ALL"
  }

  tags = {
    client      = var.school_id
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