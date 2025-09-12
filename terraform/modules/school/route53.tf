# Route53 record pointing school subdomain to App Runner default URL
resource "aws_route53_record" "school_subdomain" {
  zone_id = var.route53_zone_id
  name    = var.school_id  # e.g., school1.clockin.click
  type    = "CNAME"
  ttl     = 300
  records = [aws_apprunner_custom_domain_association.domain.dns_target]
}

# Validation record for ACM certificate (DNS-01 challenge)
resource "aws_route53_record" "validation" {
  count   = length(aws_apprunner_custom_domain_association.domain.certificate_validation_records)
  zone_id = var.route53_zone_id
  name    = aws_apprunner_custom_domain_association.domain.certificate_validation_records[count.index].name
  type    = aws_apprunner_custom_domain_association.domain.certificate_validation_records[count.index].type
  records = [aws_apprunner_custom_domain_association.domain.certificate_validation_records[count.index].value]
  ttl     = 60
}