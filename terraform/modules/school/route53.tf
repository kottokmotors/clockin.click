# Route53 record pointing school subdomain to App Runner default URL
resource "aws_route53_record" "school_subdomain" {
  zone_id = var.route53_zone_id
  name    = var.school_id  # e.g., school1.clockin.click
  type    = "CNAME"
  ttl     = 300
  records = [aws_apprunner_service.service.service_url]
}
