terraform {
  backend "s3" {
    bucket       = "kottokmotors-terraform-states"
    use_lockfile = true
    region       = "us-east-1"
    key          = "state/clockinclick/state.tfstate"
  }
}
