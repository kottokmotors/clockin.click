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
  for_each = {
    for r in try(aws_apprunner_custom_domain_association.domain.certificate_validation_records, []) :
    r.name => r
  }
  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.value]
  ttl     = 60

  depends_on = [aws_apprunner_custom_domain_association.domain]
}