import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Box,
  Cloud,
  Database,
  GitBranch,
  Layers,
  MessageSquare,
  MousePointer2,
  Network,
  Server,
  Shield,
  Trash2,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import type { PlanDiagramCanvasNodeType } from "@/lib/plan-diagram-canvas-mermaid";

export type PlanDiagramShapePreset = {
  id: string;
  label: string;
  defaultLabel: string;
  nodeType: PlanDiagramCanvasNodeType;
  accentColor?: string;
  iconText?: string;
  width?: number;
  height?: number;
};

export type PlanDiagramShapeCategory = {
  id: string;
  label: string;
  icon: LucideIcon;
  defaultExpanded?: boolean;
  items: PlanDiagramShapePreset[];
};

const AZURE = "#0078D4";
const AWS = "#FF9900";
const GCP = "#4285F4";
const K8S = "#326CE5";
const DOCKER = "#2496ED";
const GITHUB = "#24292f";
const REDIS = "#DC382D";
const KAFKA = "#231F20";

function preset(
  id: string,
  label: string,
  defaultLabel: string,
  nodeType: PlanDiagramCanvasNodeType,
  extra?: Partial<PlanDiagramShapePreset>,
): PlanDiagramShapePreset {
  return { id, label, defaultLabel, nodeType, ...extra };
}

export const PLAN_DIAGRAM_SHAPE_CATEGORIES: PlanDiagramShapeCategory[] = [
  {
    id: "flowchart",
    label: "Flowchart",
    icon: Workflow,
    defaultExpanded: true,
    items: [
      preset("fc-process", "Process", "Process", "rect"),
      preset("fc-decision", "Decision", "Decision?", "diamond"),
      preset("fc-terminal", "Terminal", "Start / End", "circle"),
      preset("fc-input", "Input / Output", "Input", "parallelogram"),
      preset("fc-preparation", "Preparation", "Setup", "hexagon"),
      preset("fc-subroutine", "Subroutine", "Subroutine", "subroutine"),
      preset("fc-document", "Document", "Document", "document"),
      preset("fc-manual", "Manual step", "Manual step", "document"),
      preset("fc-delay", "Delay", "Wait", "rect", { width: 120, height: 48 }),
      preset("fc-connector", "Connector", "Link", "circle", { width: 56, height: 56 }),
    ],
  },
  {
    id: "uml",
    label: "UML & Diagrams",
    icon: GitBranch,
    defaultExpanded: false,
    items: [
      preset("uml-actor", "Actor", "Actor", "actor"),
      preset("uml-usecase", "Use case", "Use case", "cloud"),
      preset("uml-class", "Class", "ClassName", "rect", { width: 140, height: 72 }),
      preset("uml-interface", "Interface", "Interface", "rect", { width: 140, height: 56 }),
      preset("uml-package", "Package", "Package", "subroutine"),
      preset("uml-state", "State", "State", "rounded"),
      preset("uml-object", "Object", "Object", "rect", { width: 120, height: 56 }),
      preset("uml-note", "Note", "Note", "document", { width: 110, height: 64 }),
    ],
  },
  {
    id: "azure",
    label: "Microsoft Azure",
    icon: Cloud,
    defaultExpanded: true,
    items: [
      preset("az-functions", "Azure Functions", "Azure Functions", "brand", { accentColor: AZURE, iconText: "ƒ" }),
      preset("az-app-service", "App Service", "App Service", "brand", { accentColor: AZURE, iconText: "AS" }),
      preset("az-storage", "Blob Storage", "Blob Storage", "brand", { accentColor: AZURE, iconText: "BS" }),
      preset("az-sql", "SQL Database", "SQL Database", "brand", { accentColor: AZURE, iconText: "SQL" }),
      preset("az-cosmos", "Cosmos DB", "Cosmos DB", "brand", { accentColor: AZURE, iconText: "CDB" }),
      preset("az-apim", "API Management", "API Management", "brand", { accentColor: AZURE, iconText: "API" }),
      preset("az-service-bus", "Service Bus", "Service Bus", "brand", { accentColor: AZURE, iconText: "SB" }),
      preset("az-event-grid", "Event Grid", "Event Grid", "brand", { accentColor: AZURE, iconText: "EG" }),
      preset("az-key-vault", "Key Vault", "Key Vault", "brand", { accentColor: AZURE, iconText: "KV" }),
      preset("az-aks", "AKS", "Kubernetes Service", "brand", { accentColor: AZURE, iconText: "AKS" }),
      preset("az-container-apps", "Container Apps", "Container Apps", "brand", { accentColor: AZURE, iconText: "CA" }),
      preset("az-logic-apps", "Logic Apps", "Logic Apps", "brand", { accentColor: AZURE, iconText: "LA" }),
    ],
  },
  {
    id: "aws",
    label: "Amazon AWS",
    icon: Server,
    defaultExpanded: false,
    items: [
      preset("aws-lambda", "Lambda", "AWS Lambda", "brand", { accentColor: AWS, iconText: "λ" }),
      preset("aws-ec2", "EC2", "EC2 Instance", "brand", { accentColor: AWS, iconText: "EC2" }),
      preset("aws-s3", "S3", "S3 Bucket", "brand", { accentColor: AWS, iconText: "S3" }),
      preset("aws-rds", "RDS", "RDS Database", "brand", { accentColor: AWS, iconText: "RDS" }),
      preset("aws-dynamo", "DynamoDB", "DynamoDB", "brand", { accentColor: AWS, iconText: "DDB" }),
      preset("aws-apigw", "API Gateway", "API Gateway", "brand", { accentColor: AWS, iconText: "GW" }),
      preset("aws-sqs", "SQS", "SQS Queue", "brand", { accentColor: AWS, iconText: "SQS" }),
      preset("aws-sns", "SNS", "SNS Topic", "brand", { accentColor: AWS, iconText: "SNS" }),
      preset("aws-ecs", "ECS", "ECS Service", "brand", { accentColor: AWS, iconText: "ECS" }),
      preset("aws-cloudwatch", "CloudWatch", "CloudWatch", "brand", { accentColor: AWS, iconText: "CW" }),
      preset("aws-eks", "EKS", "EKS Cluster", "brand", { accentColor: AWS, iconText: "EKS" }),
    ],
  },
  {
    id: "gcp",
    label: "Google Cloud",
    icon: Layers,
    defaultExpanded: false,
    items: [
      preset("gcp-functions", "Cloud Functions", "Cloud Functions", "brand", { accentColor: GCP, iconText: "ƒ" }),
      preset("gcp-run", "Cloud Run", "Cloud Run", "brand", { accentColor: GCP, iconText: "Run" }),
      preset("gcp-gcs", "Cloud Storage", "Cloud Storage", "brand", { accentColor: GCP, iconText: "GCS" }),
      preset("gcp-bigquery", "BigQuery", "BigQuery", "brand", { accentColor: GCP, iconText: "BQ" }),
      preset("gcp-pubsub", "Pub/Sub", "Pub/Sub", "brand", { accentColor: GCP, iconText: "PS" }),
      preset("gcp-gke", "GKE", "GKE Cluster", "brand", { accentColor: GCP, iconText: "GKE" }),
      preset("gcp-firestore", "Firestore", "Firestore", "brand", { accentColor: GCP, iconText: "FS" }),
    ],
  },
  {
    id: "platforms",
    label: "Platforms & DevOps",
    icon: Box,
    defaultExpanded: false,
    items: [
      preset("plat-k8s", "Kubernetes", "Kubernetes", "brand", { accentColor: K8S, iconText: "K8s" }),
      preset("plat-docker", "Docker", "Docker", "brand", { accentColor: DOCKER, iconText: "🐳" }),
      preset("plat-github", "GitHub", "GitHub Actions", "brand", { accentColor: GITHUB, iconText: "GH" }),
      preset("plat-redis", "Redis", "Redis Cache", "brand", { accentColor: REDIS, iconText: "R" }),
      preset("plat-kafka", "Kafka", "Apache Kafka", "brand", { accentColor: KAFKA, iconText: "K" }),
      preset("plat-nginx", "Nginx", "Nginx", "brand", { accentColor: "#009639", iconText: "NX" }),
      preset("plat-postgres", "PostgreSQL", "PostgreSQL", "database", { defaultLabel: "PostgreSQL" }),
      preset("plat-mongodb", "MongoDB", "MongoDB", "database", { defaultLabel: "MongoDB" }),
    ],
  },
  {
    id: "data",
    label: "Data & Storage",
    icon: Database,
    defaultExpanded: false,
    items: [
      preset("data-database", "Database", "Database", "database"),
      preset("data-warehouse", "Data warehouse", "Data Warehouse", "database", { width: 136, height: 92 }),
      preset("data-lake", "Data lake", "Data Lake", "cloud", { defaultLabel: "Data Lake" }),
      preset("data-cache", "Cache", "Cache", "rect", { defaultLabel: "Cache", width: 100, height: 56 }),
      preset("data-queue", "Message queue", "Queue", "queue"),
      preset("data-file", "File store", "File Storage", "document"),
      preset("data-stream", "Event stream", "Event Stream", "queue", { defaultLabel: "Event Stream" }),
    ],
  },
  {
    id: "integration",
    label: "Integration & API",
    icon: ArrowRightLeft,
    defaultExpanded: false,
    items: [
      preset("int-rest", "REST API", "REST API", "api"),
      preset("int-graphql", "GraphQL", "GraphQL API", "api", { defaultLabel: "GraphQL" }),
      preset("int-webhook", "Webhook", "Webhook", "cloud", { defaultLabel: "Webhook" }),
      preset("int-etl", "ETL pipeline", "ETL Pipeline", "rect", { width: 148, height: 64 }),
      preset("int-gateway", "API Gateway", "API Gateway", "brand", { accentColor: "#6366f1", iconText: "GW" }),
      preset("int-mesh", "Service mesh", "Service Mesh", "hexagon"),
      preset("int-cdn", "CDN", "CDN", "cloud", { defaultLabel: "CDN" }),
    ],
  },
  {
    id: "security",
    label: "Security & Identity",
    icon: Shield,
    defaultExpanded: false,
    items: [
      preset("sec-firewall", "Firewall", "Firewall", "hexagon", { defaultLabel: "Firewall" }),
      preset("sec-auth", "Authentication", "Auth Service", "brand", { accentColor: "#7c3aed", iconText: "Auth" }),
      preset("sec-iam", "IAM", "IAM / RBAC", "brand", { accentColor: "#7c3aed", iconText: "IAM" }),
      preset("sec-vpn", "VPN", "VPN Gateway", "hexagon"),
      preset("sec-waf", "WAF", "Web App Firewall", "shield"),
      preset("sec-secrets", "Secrets", "Secrets Manager", "brand", { accentColor: "#7c3aed", iconText: "🔐" }),
    ],
  },
  {
    id: "messaging",
    label: "Messaging & Events",
    icon: MessageSquare,
    defaultExpanded: false,
    items: [
      preset("msg-topic", "Topic", "Topic", "cloud", { defaultLabel: "Topic" }),
      preset("msg-subscription", "Subscription", "Subscription", "rect", { width: 130, height: 56 }),
      preset("msg-event", "Event", "Domain Event", "diamond", { defaultLabel: "Event" }),
      preset("msg-notification", "Notification", "Notification", "rect", { width: 124, height: 56 }),
    ],
  },
  {
    id: "network",
    label: "Network & Compute",
    icon: Network,
    defaultExpanded: false,
    items: [
      preset("net-load-balancer", "Load balancer", "Load Balancer", "hexagon"),
      preset("net-vnet", "Virtual network", "VNet / VPC", "cloud", { defaultLabel: "VNet" }),
      preset("net-subnet", "Subnet", "Subnet", "rect", { width: 120, height: 52 }),
      preset("net-vm", "Virtual machine", "VM", "brand", { accentColor: "#475569", iconText: "VM" }),
      preset("net-container", "Container", "Container", "rect", { width: 110, height: 56 }),
      preset("net-serverless", "Serverless", "Serverless fn", "brand", { accentColor: "#0ea5e9", iconText: "⚡" }),
    ],
  },
  {
    id: "users",
    label: "Users & Clients",
    icon: Users,
    defaultExpanded: false,
    items: [
      preset("user-person", "User", "End User", "actor"),
      preset("user-admin", "Admin", "Administrator", "actor", { defaultLabel: "Admin" }),
      preset("user-mobile", "Mobile app", "Mobile App", "rect", { width: 110, height: 72 }),
      preset("user-web", "Web app", "Web Application", "rect", { width: 130, height: 72 }),
      preset("user-external", "External system", "External System", "subroutine"),
    ],
  },
];

export const PLAN_DIAGRAM_SHAPE_PRESET_MAP = new Map(
  PLAN_DIAGRAM_SHAPE_CATEGORIES.flatMap((category) =>
    category.items.map((item) => [item.id, item] as const),
  ),
);

export function getDefaultExpandedCategories(): Set<string> {
  return new Set(
    PLAN_DIAGRAM_SHAPE_CATEGORIES.filter((category) => category.defaultExpanded).map(
      (category) => category.id,
    ),
  );
}

export const PLAN_DIAGRAM_PRESET_DRAG_TYPE = "application/x-plan-diagram-preset";

export function setPresetDragData(
  dataTransfer: DataTransfer,
  preset: PlanDiagramShapePreset,
): void {
  dataTransfer.setData(PLAN_DIAGRAM_PRESET_DRAG_TYPE, preset.id);
  dataTransfer.effectAllowed = "copy";
}

export function getPresetFromDragData(
  dataTransfer: DataTransfer,
): PlanDiagramShapePreset | null {
  const id = dataTransfer.getData(PLAN_DIAGRAM_PRESET_DRAG_TYPE);
  if (!id) return null;
  return PLAN_DIAGRAM_SHAPE_PRESET_MAP.get(id) ?? null;
}

/** Quick-access tool icons for top of sidebar */
export const PLAN_DIAGRAM_QUICK_TOOLS = [
  { id: "select" as const, label: "Select", icon: MousePointer2 },
  { id: "connect" as const, label: "Connect", icon: Zap },
];
