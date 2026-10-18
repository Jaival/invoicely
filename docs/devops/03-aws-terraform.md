# DevOps Stage 3 — AWS + Terraform

**Roadmap phase:** 8 · **Standalone:** yes, needs the Docker image from stage 2 (or any container image)

## Goal

Describe the whole production environment as code and run Invoicely on managed AWS services, with
separate staging and production environments.

## What you'll learn

- Infrastructure as Code with Terraform (state, modules, plan/apply workflow)
- AWS networking: VPC, subnets, security groups
- Managed containers and databases
- IAM and least privilege; OIDC from GitHub Actions (no long-lived keys)
- Environment promotion (staging → production)

## Architecture

```
Route 53 ──▶ ALB (ACM TLS) ──▶ ECS Fargate: web service
                                ECS Fargate: worker service
                                     │
              Secrets Manager ───────┤
                                     ▼
                              RDS Postgres (private subnets)
ECR (images) · CloudWatch (logs, alarms) · S3 (backups/uploads)
```

## Steps

1. [ ] Create an AWS account with billing alerts and an admin user with MFA
2. [ ] Remote Terraform state: S3 bucket + state locking
3. [ ] Module layout: `network`, `database`, `app`, `dns`; environments `staging` and `prod`
4. [ ] VPC with public and private subnets
5. [ ] RDS Postgres in private subnets with automated backups
6. [ ] ECR repository; push the existing image
7. [ ] ECS Fargate services for web and worker, behind an Application Load Balancer
8. [ ] Secrets Manager for `DATABASE_URL`, Stripe, Resend, Better Auth secrets
9. [ ] Route 53 + ACM certificate for the domain
10. [ ] GitHub Actions with OIDC role: `terraform plan` on PR, `apply` on merge; deploy new image tags
11. [ ] Run migrations as a one-off ECS task before each deploy
12. [ ] CloudWatch log groups and alarms (5xx rate, CPU, DB connections)
13. [ ] Optional: switch email to Amazon SES

## Done when

- `terraform destroy` + `terraform apply` rebuilds staging from scratch
- Deploys to staging happen on merge; production is promoted deliberately

## Cost notes

This is the most expensive stage (load balancer, NAT, and RDS add up). Use small instance sizes,
tear down staging when idle, and keep billing alerts on.
