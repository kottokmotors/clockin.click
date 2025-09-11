output "users_table_name" {
  value = aws_dynamodb_table.users.name
}

output "time_attendance_table_name" {
  value = aws_dynamodb_table.time_attendance.name
}

output "apprunner_url" {
  value = aws_apprunner_service.service.service_url
}
