output "schools_apprunner_urls" {
  value = { for school, mod in module.schools : school => mod.apprunner_url }
}

