# Quick Start: Running Terraform CI/CD Validation

## ✅ Prerequisites Completed

You've already successfully:
- ✅ Installed Terraform providers (`terraform init -upgrade`)
- ✅ Fixed npm log directory permissions

## 🚀 Running Validation Scripts

**Important:** Run these commands from the **project root** (`/Users/thibauttenenbaum/Desktop/SP/SPappv1.1`), not from the `infra/terraform` directory.

### 1. Terraform Validation

```bash
cd /Users/thibauttenenbaum/Desktop/SP/SPappv1.1
./scripts/terraform-validation.sh
```

### 2. Full CI/CD Pipeline Validation

```bash
cd /Users/thibauttenenbaum/Desktop/SP/SPappv1.1
./scripts/ci-cd-validation.sh
```

### 3. Or Run Both Together

```bash
cd /Users/thibauttenenbaum/Desktop/SP/SPappv1.1
./scripts/terraform-validation.sh && ./scripts/ci-cd-validation.sh
```

## 📋 What the Scripts Check

### Terraform Validation Script
- ✅ Format validation (`terraform fmt -check`)
- ✅ Initialization status
- ✅ Configuration validation (`terraform validate`)
- ✅ Plan validation (`terraform plan` - dry run)

### CI/CD Validation Script
- ✅ Terraform validation
- ✅ Node.js environment
- ✅ Application builds (API & Web)
- ✅ TypeScript type checking
- ✅ Linting
- ✅ Unit tests
- ✅ Docker Compose validation
- ✅ Security audit

## 🔧 Troubleshooting

### If scripts are not executable:
```bash
chmod +x scripts/terraform-validation.sh scripts/ci-cd-validation.sh
```

### If Terraform validation fails:
```bash
cd infra/terraform
terraform init -upgrade
cd ../..
./scripts/terraform-validation.sh
```

### If npm issues occur:
```bash
mkdir -p ~/.npm/_logs
chmod 755 ~/.npm/_logs
```

## 📊 Expected Results

After running the validation scripts, you should see:
- ✅ Terraform format: PASS
- ✅ Terraform validation: PASS (now that providers are installed)
- ✅ Terraform plan: PASS or SKIPPED (if credentials not configured)
- ✅ Node.js environment: PASS
- ✅ Unit tests: PASS
- ✅ Build validation: Results depend on your codebase

---

**Note:** The validation scripts must be run from the project root directory where the `scripts/` folder is located.

