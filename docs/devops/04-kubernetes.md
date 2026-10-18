# DevOps Stage 4 — Kubernetes + GitOps + metrics

**Roadmap phase:** 11 · **Standalone:** yes, needs only a container image

## Goal

Run Invoicely on Kubernetes with declarative, Git-driven deployments and full metrics and alerting.

## What you'll learn

- Kubernetes primitives: Deployments, Services, Ingress, ConfigMaps, Secrets, Jobs, CronJobs
- Packaging with Helm
- GitOps with Argo CD
- Metrics and alerting with Prometheus and Grafana
- Autoscaling and zero-downtime rollouts

## Architecture

```
Git (Helm values) ──▶ Argo CD ──▶ Cluster
                                  ├── Ingress (TLS via cert-manager)
                                  ├── web Deployment (+ HPA)
                                  ├── worker Deployment
                                  ├── migration Job (pre-sync hook)
                                  └── monitoring: Prometheus, Grafana, Alertmanager
Database: managed Postgres (recommended) or a Postgres operator in-cluster
```

## Steps

1. [ ] Local cluster first: `kind` or `k3d`; deploy with raw manifests to learn the primitives
2. [ ] Convert the manifests into a Helm chart (`charts/invoicely`) with values per environment
3. [ ] Ingress controller + cert-manager for TLS
4. [ ] Secrets: Sealed Secrets or External Secrets Operator (never plain secrets in Git)
5. [ ] Migration Job as an Argo CD pre-sync hook
6. [ ] Readiness/liveness probes on `/api/health`; resource requests and limits
7. [ ] Horizontal Pod Autoscaler for web
8. [ ] Install Argo CD; point it at the chart; deploy by changing image tags in Git
9. [ ] kube-prometheus-stack: app metrics endpoint, Grafana dashboards, alerts for errors and job failures
10. [ ] Move to a real cluster (k3s on a VPS, or a managed cluster such as EKS)

## Done when

- A merged change to the Helm values rolls out with zero downtime
- Grafana shows request rate, error rate, latency, and job queue depth
- An alert fires when the error rate spikes

## Cost notes

Local clusters are free. k3s on one VPS is cheap; managed clusters (EKS) add a control-plane fee on
top of the nodes.
