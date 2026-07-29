import requests
import json
import time
import csv
import os
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

BASE = "http://localhost:5000"
results = []

def test(name, method, url, headers=None, json_data=None, files=None, data=None, expect_status=None, description=""):
    global results
    start = time.time()
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, params=data, timeout=30)
        elif method == "POST":
            if files:
                r = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            else:
                r = requests.post(url, headers=headers, json=json_data, timeout=30)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=json_data, timeout=30)
        elif method == "DELETE":
            r = requests.delete(url, headers=headers, timeout=30)
        else:
            r = None
        elapsed = round((time.time() - start) * 1000, 1)
        
        status_code = r.status_code if r else 0
        try:
            body = r.json()
        except:
            body = {"raw": r.text[:200]} if r else {}
        
        passed = True
        if expect_status is not None:
            passed = status_code == expect_status
        
        result_status = "PASS" if passed else "FAIL"
        detail = ""
        if not passed:
            detail = f"Expected {expect_status}, got {status_code}"
        
        results.append({
            "Test ID": len(results) + 1,
            "Module": name.split("]")[0].replace("[", "").strip() if "]" in name else name.split(" - ")[0].strip(),
            "Test Name": name,
            "Description": description,
            "Method": method,
            "Endpoint": url.replace(BASE, ""),
            "HTTP Status": status_code,
            "Expected Status": expect_status if expect_status else "Any",
            "Result": result_status,
            "Response Time (ms)": elapsed,
            "Detail/Error": detail,
            "Response Summary": str(body)[:150]
        })
        return r, body
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 1)
        results.append({
            "Test ID": len(results) + 1,
            "Module": name.split("]")[0].replace("[", "").strip() if "]" in name else name.split(" - ")[0].strip(),
            "Test Name": name,
            "Description": description,
            "Method": method,
            "Endpoint": url.replace(BASE, ""),
            "HTTP Status": "ERR",
            "Expected Status": expect_status if expect_status else "Any",
            "Result": "FAIL",
            "Response Time (ms)": elapsed,
            "Detail/Error": str(e)[:200],
            "Response Summary": "Exception thrown"
        })
        return None, {}

# ============================================================
# 1. HEALTH CHECK
# ============================================================
print("=" * 60)
print("TESTING: Health Endpoint")
print("=" * 60)

r, body = test("[Health] GET /api/health", "GET", f"{BASE}/api/health",
               expect_status=200, description="Public health check endpoint")
print(f"  Health: {r.status_code if r else 'FAIL'}")

# ============================================================
# 2. AUTH ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Auth Endpoints")
print("=" * 60)

# Login - success
r, body = test("[Auth] POST /api/auth/login (valid credentials)", "POST", f"{BASE}/api/auth/login",
               json_data={"email": "admin@shinecraft.com", "password": "Admin@123"},
               expect_status=200, description="Login with valid admin credentials")
token = body.get("token", "") if body else ""
auth_h = {"Authorization": f"Bearer {token}"} if token else {}
print(f"  Login: {r.status_code if r else 'FAIL'} | Token: {'YES' if token else 'NO'}")

# Login - wrong password
r, body = test("[Auth] POST /api/auth/login (wrong password)", "POST", f"{BASE}/api/auth/login",
               json_data={"email": "admin@shinecraft.com", "password": "wrongpass"},
               expect_status=401, description="Login with incorrect password should fail")
print(f"  Login wrong pass: {r.status_code if r else 'FAIL'}")

# Login - missing fields
r, body = test("[Auth] POST /api/auth/login (missing email)", "POST", f"{BASE}/api/auth/login",
               json_data={"password": "Admin@123"},
               expect_status=400, description="Login without email should fail validation")
print(f"  Login missing email: {r.status_code if r else 'FAIL'}")

# Login - invalid email
r, body = test("[Auth] POST /api/auth/login (invalid email format)", "POST", f"{BASE}/api/auth/login",
               json_data={"email": "not-an-email", "password": "Admin@123"},
               expect_status=400, description="Login with malformed email should fail validation")
print(f"  Login invalid email: {r.status_code if r else 'FAIL'}")

# Login - empty body
r, body = test("[Auth] POST /api/auth/login (empty body)", "POST", f"{BASE}/api/auth/login",
               json_data={},
               expect_status=400, description="Login with empty body should fail validation")
print(f"  Login empty body: {r.status_code if r else 'FAIL'}")

# Get me
r, body = test("[Auth] GET /api/auth/me (with token)", "GET", f"{BASE}/api/auth/me",
               headers=auth_h, expect_status=200, description="Get current admin profile with valid token")
print(f"  GetMe: {r.status_code if r else 'FAIL'}")

# Get me - no token
r, body = test("[Auth] GET /api/auth/me (no token)", "GET", f"{BASE}/api/auth/me",
               expect_status=401, description="Get profile without token should return 401")
print(f"  GetMe no token: {r.status_code if r else 'FAIL'}")

# Get me - invalid token
r, body = test("[Auth] GET /api/auth/me (invalid token)", "GET", f"{BASE}/api/auth/me",
               headers={"Authorization": "Bearer invalidtoken123"},
               expect_status=401, description="Get profile with invalid JWT should fail")
print(f"  GetMe bad token: {r.status_code if r else 'FAIL'}")

# Logout
r, body = test("[Auth] POST /api/auth/logout", "POST", f"{BASE}/api/auth/logout",
               headers=auth_h, expect_status=200, description="Logout current session")
print(f"  Logout: {r.status_code if r else 'FAIL'}")

# Re-login after logout (token might still work since server doesn't blacklist)
r2, body2 = test("[Auth] POST /api/auth/login (re-login after logout)", "POST", f"{BASE}/api/auth/login",
               json_data={"email": "admin@shinecraft.com", "password": "Admin@123"},
               expect_status=200, description="Re-login to get fresh token after logout")
token = body2.get("token", "") if body2 else ""
auth_h = {"Authorization": f"Bearer {token}"} if token else {}
print(f"  Re-login: {r2.status_code if r2 else 'FAIL'} | Token: {'YES' if token else 'NO'}")

# Change password - wrong current
r, body = test("[Auth] POST /api/auth/change-password (wrong current)", "POST", f"{BASE}/api/auth/change-password",
               headers=auth_h,
               json_data={"email": "admin@shinecraft.com", "currentPassword": "wrongpass", "newPassword": "Admin@456"},
               expect_status=400, description="Change password with wrong current password should fail")
print(f"  ChangePW wrong: {r.status_code if r else 'FAIL'}")

# Change password - valid
r, body = test("[Auth] POST /api/auth/change-password (valid)", "POST", f"{BASE}/api/auth/change-password",
               headers=auth_h,
               json_data={"email": "admin@shinecraft.com", "currentPassword": "Admin@123", "newPassword": "Admin@456"},
               expect_status=200, description="Change password with correct current password")
print(f"  ChangePW valid: {r.status_code if r else 'FAIL'}")

# Change it back
r, body = test("[Auth] POST /api/auth/change-password (revert)", "POST", f"{BASE}/api/auth/change-password",
               headers=auth_h,
               json_data={"email": "admin@shinecraft.com", "currentPassword": "Admin@456", "newPassword": "Admin@123"},
               expect_status=200, description="Revert password back to original")
print(f"  ChangePW revert: {r.status_code if r else 'FAIL'}")

# Change password - short new password
r, body = test("[Auth] POST /api/auth/change-password (short new pw)", "POST", f"{BASE}/api/auth/change-password",
               headers=auth_h,
               json_data={"email": "admin@shinecraft.com", "currentPassword": "Admin@123", "newPassword": "ab"},
               expect_status=400, description="Change password with too short new password should fail validation")
print(f"  ChangePW short: {r.status_code if r else 'FAIL'}")

# Change password - no token
r, body = test("[Auth] POST /api/auth/change-password (no token)", "POST", f"{BASE}/api/auth/change-password",
               json_data={"email": "admin@shinecraft.com", "currentPassword": "Admin@123", "newPassword": "Admin@456"},
               expect_status=401, description="Change password without auth should fail")
print(f"  ChangePW no auth: {r.status_code if r else 'FAIL'}")

# ============================================================
# 3. EMPLOYEE ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Employee Endpoints")
print("=" * 60)

emp_payload = {
    "employeeCode": "EMP_TEST_001",
    "employeeName": "Test Employee Alpha",
    "email": "test.alpha@shinecraft.com",
    "phoneNumber": "9876543210",
    "department": "Engineering",
    "designation": "Software Engineer",
    "panNumber": "ABCDE1234F",
    "aadharNumber": "123456789012",
    "uanNumber": "UAN001",
    "pfNumber": "PF001",
    "esiNumber": "ESI001",
    "bankName": "HDFC Bank",
    "bankAccountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "joiningDate": "2024-01-15",
    "employmentStatus": "Active",
    "basicSalary": 50000,
    "hra": 15000,
    "da": 5000,
    "medicalAllowance": 3000,
    "travelAllowance": 2000,
    "specialAllowance": 5000,
    "otherAllowances": 1000
}

emp2_payload = {
    "employeeCode": "EMP_TEST_002",
    "employeeName": "Test Employee Beta",
    "email": "test.beta@shinecraft.com",
    "phoneNumber": "9876543211",
    "department": "Marketing",
    "designation": "Marketing Manager",
    "aadharNumber": "987654321098",
    "joiningDate": "2024-03-01",
    "employmentStatus": "Active",
    "basicSalary": 60000,
    "hra": 18000,
    "da": 6000
}

# Create Employee
r, body = test("[Employee] POST /api/employees/ (create)", "POST", f"{BASE}/api/employees/",
               headers=auth_h, json_data=emp_payload,
               expect_status=201, description="Create new employee with all fields")
emp_id = body.get("employee", {}).get("id", "") if body else ""
print(f"  Create: {r.status_code if r else 'FAIL'} | ID: {emp_id[:8]}...")

# Create 2nd Employee
r, body2 = test("[Employee] POST /api/employees/ (create 2nd)", "POST", f"{BASE}/api/employees/",
               headers=auth_h, json_data=emp2_payload,
               expect_status=201, description="Create second employee for testing")
emp2_id = body2.get("employee", {}).get("id", "") if body2 else ""
print(f"  Create 2nd: {r.status_code if r else 'FAIL'} | ID: {emp2_id[:8]}...")

# Create Employee - missing required
r, body = test("[Employee] POST /api/employees/ (missing fields)", "POST", f"{BASE}/api/employees/",
               headers=auth_h, json_data={"employeeCode": "X"},
               expect_status=400, description="Create with missing required fields should fail validation")
print(f"  Create missing: {r.status_code if r else 'FAIL'}")

# Create Employee - duplicate code
r, body = test("[Employee] POST /api/employees/ (duplicate code)", "POST", f"{BASE}/api/employees/",
               headers=auth_h, json_data=emp_payload,
               expect_status=400, description="Create with duplicate employee code should fail")
print(f"  Create duplicate: {r.status_code if r else 'FAIL'}")

# Create Employee - invalid email
r, body = test("[Employee] POST /api/employees/ (invalid email)", "POST", f"{BASE}/api/employees/",
               headers=auth_h, json_data={**emp_payload, "employeeCode": "EMP_BAD_EMAIL", "email": "not-email"},
               expect_status=400, description="Create with invalid email should fail validation")
print(f"  Create bad email: {r.status_code if r else 'FAIL'}")

# Create Employee - no auth
r, body = test("[Employee] POST /api/employees/ (no auth)", "POST", f"{BASE}/api/employees/",
               json_data=emp_payload,
               expect_status=401, description="Create employee without authentication should fail")
print(f"  Create no auth: {r.status_code if r else 'FAIL'}")

# Find All
r, body = test("[Employee] GET /api/employees/ (list)", "GET", f"{BASE}/api/employees/",
               headers=auth_h, data={"page": 1, "limit": 10},
               expect_status=200, description="List all employees with pagination")
print(f"  List: {r.status_code if r else 'FAIL'}")

# Find All - with search
r, body = test("[Employee] GET /api/employees/ (search)", "GET", f"{BASE}/api/employees/",
               headers=auth_h, data={"search": "Alpha", "page": 1, "limit": 10},
               expect_status=200, description="Search employees by name")
print(f"  Search: {r.status_code if r else 'FAIL'}")

# Find All - with department filter
r, body = test("[Employee] GET /api/employees/ (filter dept)", "GET", f"{BASE}/api/employees/",
               headers=auth_h, data={"department": "Engineering", "page": 1, "limit": 10},
               expect_status=200, description="Filter employees by department")
print(f"  Filter dept: {r.status_code if r else 'FAIL'}")

# Find All - with status filter
r, body = test("[Employee] GET /api/employees/ (filter status)", "GET", f"{BASE}/api/employees/",
               headers=auth_h, data={"status": "Active", "page": 1, "limit": 10},
               expect_status=200, description="Filter employees by status")
print(f"  Filter status: {r.status_code if r else 'FAIL'}")

# Find One
if emp_id:
    r, body = test("[Employee] GET /api/employees/:id (find one)", "GET", f"{BASE}/api/employees/{emp_id}",
                   headers=auth_h, expect_status=200, description="Get single employee by UUID")
    print(f"  FindOne: {r.status_code if r else 'FAIL'}")
    
    # Find One - invalid UUID
    r, body = test("[Employee] GET /api/employees/:id (invalid uuid)", "GET", f"{BASE}/api/employees/not-a-uuid",
                   headers=auth_h, expect_status=400, description="Get employee with invalid UUID should fail validation")
    print(f"  FindOne bad uuid: {r.status_code if r else 'FAIL'}")
    
    # Find One - non-existent UUID
    r, body = test("[Employee] GET /api/employees/:id (non-existent)", "GET", f"{BASE}/api/employees/00000000-0000-0000-0000-000000000000",
                   headers=auth_h, expect_status=404, description="Get non-existent employee should return 404")
    print(f"  FindOne 404: {r.status_code if r else 'FAIL'}")
    
    # Get Dependencies
    r, body = test("[Employee] GET /api/employees/:id/dependencies", "GET", f"{BASE}/api/employees/{emp_id}/dependencies",
                   headers=auth_h, expect_status=200, description="Check employee dependencies (attendance, payslips)")
    print(f"  Dependencies: {r.status_code if r else 'FAIL'}")

# Update Employee
if emp_id:
    r, body = test("[Employee] PUT /api/employees/:id (update)", "PUT", f"{BASE}/api/employees/{emp_id}",
                   headers=auth_h, json_data={"employeeName": "Test Employee Alpha Updated", "basicSalary": 55000},
                   expect_status=200, description="Update employee name and salary")
    print(f"  Update: {r.status_code if r else 'FAIL'}")

    # Update - partial
    r, body = test("[Employee] PUT /api/employees/:id (partial update)", "PUT", f"{BASE}/api/employees/{emp_id}",
                   headers=auth_h, json_data={"phoneNumber": "1122334455"},
                   expect_status=200, description="Update only phone number")
    print(f"  Partial update: {r.status_code if r else 'FAIL'}")

# Import Employees
import_payload = {
    "employees": [
        {
            "employeeCode": "IMP_TEST_001",
            "employeeName": "Imported Employee One",
            "email": "import.one@shinecraft.com",
            "phoneNumber": "5551112222",
            "department": "HR",
            "designation": "HR Manager",
            "aadharNumber": "555111222233",
            "joiningDate": "2024-06-01",
            "employmentStatus": "Active",
            "basicSalary": 45000,
            "hra": 13500,
            "da": 4500
        }
    ]
}
r, body = test("[Employee] POST /api/employees/import (bulk import)", "POST", f"{BASE}/api/employees/import",
               headers=auth_h, json_data=import_payload,
               expect_status=200, description="Bulk import employees from JSON payload")
imported_id = ""
if body and body.get("results"):
    for res in body.get("results", []):
        if res.get("employeeId"):
            imported_id = res["employeeId"]
            break
print(f"  Import: {r.status_code if r else 'FAIL'} | Imported: {imported_id[:8]}...")

# Import - empty array
r, body = test("[Employee] POST /api/employees/import (empty array)", "POST", f"{BASE}/api/employees/import",
               headers=auth_h, json_data={"employees": []},
               expect_status=400, description="Import with empty array should fail validation")
print(f"  Import empty: {r.status_code if r else 'FAIL'}")

# Export Employees - Excel
r, body = test("[Employee] GET /api/employees/export/excel", "GET", f"{BASE}/api/employees/export/excel",
               headers=auth_h, expect_status=200, description="Export employees as Excel format")
print(f"  Export Excel: {r.status_code if r else 'FAIL'}")

# Export Employees - CSV
r, body = test("[Employee] GET /api/employees/export/csv", "GET", f"{BASE}/api/employees/export/csv",
               headers=auth_h, expect_status=200, description="Export employees as CSV format")
print(f"  Export CSV: {r.status_code if r else 'FAIL'}")

# Salary History - get
if emp_id:
    r, body = test("[Employee] GET /api/employees/:id/salary-history", "GET", f"{BASE}/api/employees/{emp_id}/salary-history",
                   headers=auth_h, expect_status=200, description="Get salary history for employee")
    print(f"  Salary History GET: {r.status_code if r else 'FAIL'}")

    # Salary History - add
    r, body = test("[Employee] POST /api/employees/:id/salary-history (add)", "POST", f"{BASE}/api/employees/{emp_id}/salary-history",
                   headers=auth_h,
                   json_data={"month": 6, "year": 2025, "basicSalary": 55000, "hra": 16500, "da": 5500,
                              "grossSalary": 82000, "netSalary": 75000},
                   expect_status=201, description="Add salary history record for employee")
    print(f"  Salary History POST: {r.status_code if r else 'FAIL'}")

# ============================================================
# 4. DEPARTMENT & DESIGNATION (Settings prerequisites)
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Settings - Departments & Designations")
print("=" * 60)

# Create Department
dept_payload = {"name": "Test Department", "code": "TST", "description": "Test department for QA", "head": "Test Head"}
r, body = test("[Settings] POST /api/settings/departments (create)", "POST", f"{BASE}/api/settings/departments",
               headers=auth_h, json_data=dept_payload,
               expect_status=201, description="Create a new department")
dept_id = body.get("data", {}).get("id", "") if body else ""
print(f"  Create dept: {r.status_code if r else 'FAIL'} | ID: {dept_id[:8]}...")

# Get Departments
r, body = test("[Settings] GET /api/settings/departments (list)", "GET", f"{BASE}/api/settings/departments",
               headers=auth_h, expect_status=200, description="List all departments")
print(f"  List depts: {r.status_code if r else 'FAIL'}")

# Update Department
if dept_id:
    r, body = test("[Settings] PUT /api/settings/departments/:id (update)", "PUT", f"{BASE}/api/settings/departments/{dept_id}",
                   headers=auth_h, json_data={"description": "Updated test department"},
                   expect_status=200, description="Update department description")
    print(f"  Update dept: {r.status_code if r else 'FAIL'}")

# Create Designation
if dept_id:
    desig_payload = {"name": "Test Lead", "code": "TLD", "departmentId": dept_id, "description": "Test designation"}
    r, body = test("[Settings] POST /api/settings/designations (create)", "POST", f"{BASE}/api/settings/designations",
                   headers=auth_h, json_data=desig_payload,
                   expect_status=201, description="Create a new designation under the test department")
    desig_id = body.get("data", {}).get("id", "") if body else ""
    print(f"  Create desig: {r.status_code if r else 'FAIL'} | ID: {desig_id[:8]}...")

    # Get Designations
    r, body = test("[Settings] GET /api/settings/designations (list)", "GET", f"{BASE}/api/settings/designations",
                   headers=auth_h, expect_status=200, description="List all designations")
    print(f"  List desigs: {r.status_code if r else 'FAIL'}")

    # Get Designations - filter by department
    r, body = test("[Settings] GET /api/settings/designations (filter dept)", "GET", f"{BASE}/api/settings/designations",
                   headers=auth_h, data={"departmentId": dept_id},
                   expect_status=200, description="List designations filtered by department")
    print(f"  List desigs filter: {r.status_code if r else 'FAIL'}")

    # Update Designation
    if desig_id:
        r, body = test("[Settings] PUT /api/settings/designations/:id (update)", "PUT", f"{BASE}/api/settings/designations/{desig_id}",
                       headers=auth_h, json_data={"description": "Updated test designation"},
                       expect_status=200, description="Update designation description")
        print(f"  Update desig: {r.status_code if r else 'FAIL'}")

# ============================================================
# 5. PAYSLIP ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Payslip Endpoints")
print("=" * 60)

payslip_payload = {
    "employeeId": emp_id,
    "month": 7,
    "year": 2026,
    "totalDays": 31,
    "workingDays": 26,
    "presentDays": 24,
    "absentDays": 2,
    "leaveDays": 1,
    "holidayDays": 0,
    "weekendDays": 5,
    "lopDays": 1,
    "payableDays": 25,
    "basicSalary": 55000,
    "hra": 16500,
    "da": 5500,
    "medicalAllowance": 3000,
    "travelAllowance": 2000,
    "specialAllowance": 5000,
    "otherAllowances": 1000,
    "bonus": 0,
    "incentive": 2000,
    "overtimePay": 500,
    "totalEarnings": 90500,
    "pfDeduction": 6600,
    "esiDeduction": 0,
    "professionalTax": 200,
    "incomeTax": 5000,
    "leaveDeduction": 1500,
    "lateDeduction": 500,
    "otherDeductions": 0,
    "advanceDeduction": 0,
    "totalDeductions": 13800,
    "grossSalary": 90500,
    "netSalary": 76700,
    "status": "DRAFT"
}

# Create Payslip
r, body = test("[Payslip] POST /api/payslips/ (create)", "POST", f"{BASE}/api/payslips/",
               headers=auth_h, json_data=payslip_payload,
               expect_status=201, description="Create a new payslip for employee")
payslip_id = body.get("data", {}).get("id", "") if body else ""
print(f"  Create: {r.status_code if r else 'FAIL'} | ID: {payslip_id[:8]}...")

# Create - missing required
r, body = test("[Payslip] POST /api/payslips/ (missing employeeId)", "POST", f"{BASE}/api/payslips/",
               headers=auth_h, json_data={"month": 7, "year": 2026},
               expect_status=400, description="Create payslip without employeeId should fail validation")
print(f"  Create missing: {r.status_code if r else 'FAIL'}")

# Create - invalid month
r, body = test("[Payslip] POST /api/payslips/ (invalid month)", "POST", f"{BASE}/api/payslips/",
               headers=auth_h, json_data={**payslip_payload, "employeeId": emp2_id, "month": 13},
               expect_status=400, description="Create payslip with month > 12 should fail validation")
print(f"  Create invalid month: {r.status_code if r else 'FAIL'}")

# Duplicate payslip
r, body = test("[Payslip] POST /api/payslips/ (duplicate)", "POST", f"{BASE}/api/payslips/",
               headers=auth_h, json_data=payslip_payload,
               expect_status=400, description="Create duplicate payslip (same employee+month+year) should fail")
print(f"  Create duplicate: {r.status_code if r else 'FAIL'}")

# Find All
r, body = test("[Payslip] GET /api/payslips/ (list)", "GET", f"{BASE}/api/payslips/",
               headers=auth_h, data={"page": 1, "limit": 10},
               expect_status=200, description="List all payslips with pagination")
print(f"  List: {r.status_code if r else 'FAIL'}")

# Find All - filter month/year
r, body = test("[Payslip] GET /api/payslips/ (filter month/year)", "GET", f"{BASE}/api/payslips/",
               headers=auth_h, data={"month": 7, "year": 2026},
               expect_status=200, description="Filter payslips by month and year")
print(f"  Filter month/year: {r.status_code if r else 'FAIL'}")

# Find All - filter by status
r, body = test("[Payslip] GET /api/payslips/ (filter status)", "GET", f"{BASE}/api/payslips/",
               headers=auth_h, data={"status": "DRAFT"},
               expect_status=200, description="Filter payslips by status")
print(f"  Filter status: {r.status_code if r else 'FAIL'}")

# Find All - filter by employee
if emp_id:
    r, body = test("[Payslip] GET /api/payslips/ (filter employee)", "GET", f"{BASE}/api/payslips/",
                   headers=auth_h, data={"employeeId": emp_id},
                   expect_status=200, description="Filter payslips by employee ID")
    print(f"  Filter employee: {r.status_code if r else 'FAIL'}")

# Stats
r, body = test("[Payslip] GET /api/payslips/stats", "GET", f"{BASE}/api/payslips/stats",
               headers=auth_h, expect_status=200, description="Get payslip statistics")
print(f"  Stats: {r.status_code if r else 'FAIL'}")

# Find One
if payslip_id:
    r, body = test("[Payslip] GET /api/payslips/:id (find one)", "GET", f"{BASE}/api/payslips/{payslip_id}",
                   headers=auth_h, expect_status=200, description="Get single payslip by UUID")
    print(f"  FindOne: {r.status_code if r else 'FAIL'}")

    # Find One - invalid uuid
    r, body = test("[Payslip] GET /api/payslips/:id (invalid uuid)", "GET", f"{BASE}/api/payslips/bad-id",
                   headers=auth_h, expect_status=400, description="Get payslip with invalid UUID should fail")
    print(f"  FindOne bad uuid: {r.status_code if r else 'FAIL'}")

    # Find One - non-existent
    r, body = test("[Payslip] GET /api/payslips/:id (non-existent)", "GET", f"{BASE}/api/payslips/00000000-0000-0000-0000-000000000000",
                   headers=auth_h, expect_status=404, description="Get non-existent payslip should return 404")
    print(f"  FindOne 404: {r.status_code if r else 'FAIL'}")

    # Review
    r, body = test("[Payslip] GET /api/payslips/:id/review", "GET", f"{BASE}/api/payslips/{payslip_id}/review",
                   headers=auth_h, expect_status=200, description="Get payslip review data before generation")
    print(f"  Review: {r.status_code if r else 'FAIL'}")

    # Update
    r, body = test("[Payslip] PUT /api/payslips/:id (update)", "PUT", f"{BASE}/api/payslips/{payslip_id}",
                   headers=auth_h, json_data={"bonus": 3000, "netSalary": 79700},
                   expect_status=200, description="Update payslip bonus and net salary")
    print(f"  Update: {r.status_code if r else 'FAIL'}")

    # Generate PDF
    r, body = test("[Payslip] POST /api/payslips/:id/generate", "POST", f"{BASE}/api/payslips/{payslip_id}/generate",
                   headers=auth_h, expect_status=200, description="Generate PDF for payslip")
    print(f"  Generate: {r.status_code if r else 'FAIL'}")

    # Download PDF
    r, body = test("[Payslip] GET /api/payslips/:id/download", "GET", f"{BASE}/api/payslips/{payslip_id}/download",
                   headers=auth_h, expect_status=200, description="Download generated PDF payslip")
    print(f"  Download: {r.status_code if r else 'FAIL'}")

# Create a second payslip for emp2 to test more scenarios
if emp2_id:
    payslip2_payload = {
        **payslip_payload,
        "employeeId": emp2_id,
        "basicSalary": 60000,
        "hra": 18000,
        "da": 6000,
        "netSalary": 84000
    }
    r, body2 = test("[Payslip] POST /api/payslips/ (create 2nd)", "POST", f"{BASE}/api/payslips/",
                   headers=auth_h, json_data=payslip2_payload,
                   expect_status=201, description="Create second payslip for different employee")
    payslip2_id = body2.get("data", {}).get("id", "") if body2 else ""
    print(f"  Create 2nd: {r.status_code if r else 'FAIL'} | ID: {payslip2_id[:8]}...")

    # Send email (will fail since SMTP not configured but endpoint should respond)
    if payslip2_id:
        r, body = test("[Payslip] POST /api/payslips/:id/send-email", "POST", f"{BASE}/api/payslips/{payslip2_id}/send-email",
                       headers=auth_h, expect_status=200, description="Send payslip email (may fail SMTP)")
        print(f"  Send Email: {r.status_code if r else 'FAIL'}")

# ============================================================
# 6. UPLOAD ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Upload Endpoints")
print("=" * 60)

# Upload CSV file
csv_path = r"C:\Users\ManaGenz\Desktop\payslip-shinecraft\test_salary.csv"
upload_id = ""
if os.path.exists(csv_path):
    with open(csv_path, 'rb') as f:
        files = {'file': ('test_salary.csv', f, 'text/csv')}
        data = {'month': '7', 'year': '2026'}
        r, body = test("[Upload] POST /api/upload/ (CSV upload)", "POST", f"{BASE}/api/upload/",
                       headers=auth_h, files=files, data=data,
                       expect_status=201, description="Upload CSV salary file for parsing")
        upload_id = body.get("data", {}).get("id", body.get("id", "")) if body else ""
        # Try other possible response structures
        if not upload_id and body:
            upload_id = body.get("uploadId", body.get("uploadedFile", {}).get("id", ""))
        print(f"  Upload CSV: {r.status_code if r else 'FAIL'} | ID: {upload_id[:8] if upload_id else 'N/A'}...")
else:
    print(f"  CSV file not found at {csv_path}")

# Upload - no file
r, body = test("[Upload] POST /api/upload/ (no file)", "POST", f"{BASE}/api/upload/",
               headers=auth_h, expect_status=400, description="Upload without file should fail")
print(f"  Upload no file: {r.status_code if r else 'FAIL'}")

# Get uploads list
r, body = test("[Upload] GET /api/upload/ (list)", "GET", f"{BASE}/api/upload/",
               headers=auth_h, data={"page": 1, "limit": 10},
               expect_status=200, description="List all uploads with pagination")
# Try to find upload_id from the list if not found earlier
if not upload_id and body:
    items = body.get("data", body.get("uploads", body.get("records", [])))
    if isinstance(items, list) and len(items) > 0:
        upload_id = items[0].get("id", "")
print(f"  List uploads: {r.status_code if r else 'FAIL'}")

# Get upload by id
if upload_id:
    r, body = test("[Upload] GET /api/upload/:id (get one)", "GET", f"{BASE}/api/upload/{upload_id}",
                   headers=auth_h, expect_status=200, description="Get single upload by UUID with parsed data")
    print(f"  Get upload: {r.status_code if r else 'FAIL'}")

    # Save parsed data
    parsed_records = body.get("data", {}).get("parsedData", []) if body else []
    if parsed_records:
        save_payload = {"data": parsed_records}
        r, body = test("[Upload] POST /api/upload/:id/save (save data)", "POST", f"{BASE}/api/upload/{upload_id}/save",
                       headers=auth_h, json_data=save_payload,
                       expect_status=200, description="Save parsed salary data to create employees")
        print(f"  Save parsed: {r.status_code if r else 'FAIL'}")
    else:
        # Try saving with empty array (test the validation)
        r, body = test("[Upload] POST /api/upload/:id/save (save empty)", "POST", f"{BASE}/api/upload/{upload_id}/save",
                       headers=auth_h, json_data={"data": []},
                       expect_status=400, description="Save with empty data array should fail validation")
        print(f"  Save empty: {r.status_code if r else 'FAIL'}")

# Delete upload (do this last)
if upload_id:
    r, body = test("[Upload] DELETE /api/upload/:id (delete)", "DELETE", f"{BASE}/api/upload/{upload_id}",
                   headers=auth_h, expect_status=200, description="Delete uploaded file and parsed data")
    print(f"  Delete upload: {r.status_code if r else 'FAIL'}")

# ============================================================
# 7. ATTENDANCE ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Attendance Endpoints")
print("=" * 60)

att_payload = {
    "employeeId": emp_id,
    "date": "2026-07-15",
    "clockInTime": "09:00",
    "clockOutTime": "18:00",
    "breakDuration": 1,
    "totalWorkedHours": 8,
    "overtimeHours": 1,
    "status": "PRESENT",
    "isHoliday": False,
    "isWeekend": False,
    "isLeave": False,
    "notes": "Regular workday"
}

# Create Attendance
r, body = test("[Attendance] POST /api/attendance/ (create)", "POST", f"{BASE}/api/attendance/",
               headers=auth_h, json_data=att_payload,
               expect_status=201, description="Create attendance record for employee")
att_id = body.get("data", {}).get("id", body.get("attendance", {}).get("id", "")) if body else ""
print(f"  Create: {r.status_code if r else 'FAIL'} | ID: {att_id[:8] if att_id else 'N/A'}...")

# Create - missing fields
r, body = test("[Attendance] POST /api/attendance/ (missing fields)", "POST", f"{BASE}/api/attendance/",
               headers=auth_h, json_data={"employeeId": emp_id},
               expect_status=400, description="Create attendance without date should fail validation")
print(f"  Create missing: {r.status_code if r else 'FAIL'}")

# Create - invalid status
r, body = test("[Attendance] POST /api/attendance/ (invalid status)", "POST", f"{BASE}/api/attendance/",
               headers=auth_h, json_data={**att_payload, "status": "INVALID_STATUS", "date": "2026-07-16"},
               expect_status=400, description="Create attendance with invalid status enum should fail")
print(f"  Create bad status: {r.status_code if r else 'FAIL'}")

# Create - ABSENT status
r, body = test("[Attendance] POST /api/attendance/ (absent status)", "POST", f"{BASE}/api/attendance/",
               headers=auth_h, json_data={**att_payload, "status": "ABSENT", "date": "2026-07-16"},
               expect_status=201, description="Create attendance with ABSENT status")
att2_id = body.get("data", {}).get("id", "") if body else ""
print(f"  Create absent: {r.status_code if r else 'FAIL'}")

# Create - LEAVE status
r, body = test("[Attendance] POST /api/attendance/ (leave status)", "POST", f"{BASE}/api/attendance/",
               headers=auth_h, json_data={**att_payload, "status": "LEAVE", "isLeave": True, "leaveType": "Sick Leave", "date": "2026-07-17"},
               expect_status=201, description="Create attendance with LEAVE status")
att3_id = body.get("data", {}).get("id", "") if body else ""
print(f"  Create leave: {r.status_code if r else 'FAIL'}")

# Dashboard
r, body = test("[Attendance] GET /api/attendance/dashboard", "GET", f"{BASE}/api/attendance/dashboard",
               headers=auth_h, data={"date": "2026-07-15"},
               expect_status=200, description="Get dashboard attendance for a specific date")
print(f"  Dashboard: {r.status_code if r else 'FAIL'}")

# Dashboard - no date
r, body = test("[Attendance] GET /api/attendance/dashboard (no date)", "GET", f"{BASE}/api/attendance/dashboard",
               headers=auth_h, expect_status=200, description="Get dashboard attendance for today")
print(f"  Dashboard no date: {r.status_code if r else 'FAIL'}")

# Monthly Summary
r, body = test("[Attendance] GET /api/attendance/monthly-summary (all)", "GET", f"{BASE}/api/attendance/monthly-summary",
               headers=auth_h, data={"month": 7, "year": 2026},
               expect_status=200, description="Get monthly attendance summary for all employees")
print(f"  Monthly summary all: {r.status_code if r else 'FAIL'}")

# Monthly Summary - specific employee
if emp_id:
    r, body = test("[Attendance] GET /api/attendance/monthly-summary (employee)", "GET", f"{BASE}/api/attendance/monthly-summary",
                   headers=auth_h, data={"employeeId": emp_id, "month": 7, "year": 2026},
                   expect_status=200, description="Get monthly attendance summary for specific employee")
    print(f"  Monthly summary emp: {r.status_code if r else 'FAIL'}")

# Sync from Jibble (may fail due to no Jibble connection but endpoint should respond)
r, body = test("[Attendance] POST /api/attendance/sync (jibble sync)", "POST", f"{BASE}/api/attendance/sync",
               headers=auth_h, json_data={"records": []},
               expect_status=200, description="Sync attendance from Jibble (may fail without Jibble)")
print(f"  Sync Jibble: {r.status_code if r else 'FAIL'}")

# Find All
r, body = test("[Attendance] GET /api/attendance/ (list)", "GET", f"{BASE}/api/attendance/",
               headers=auth_h, data={"page": 1, "limit": 10},
               expect_status=200, description="List all attendance records with pagination")
print(f"  List: {r.status_code if r else 'FAIL'}")

# Find All - filter by employee
if emp_id:
    r, body = test("[Attendance] GET /api/attendance/ (filter employee)", "GET", f"{BASE}/api/attendance/",
                   headers=auth_h, data={"employeeId": emp_id, "month": 7, "year": 2026},
                   expect_status=200, description="Filter attendance by employee")
    print(f"  Filter emp: {r.status_code if r else 'FAIL'}")

# Find All - filter by status
r, body = test("[Attendance] GET /api/attendance/ (filter status)", "GET", f"{BASE}/api/attendance/",
               headers=auth_h, data={"status": "PRESENT", "month": 7, "year": 2026},
               expect_status=200, description="Filter attendance by status")
print(f"  Filter status: {r.status_code if r else 'FAIL'}")

# Find One
if att_id:
    r, body = test("[Attendance] GET /api/attendance/:id (find one)", "GET", f"{BASE}/api/attendance/{att_id}",
                   headers=auth_h, expect_status=200, description="Get single attendance record")
    print(f"  FindOne: {r.status_code if r else 'FAIL'}")

    # Find One - invalid
    r, body = test("[Attendance] GET /api/attendance/:id (invalid uuid)", "GET", f"{BASE}/api/attendance/bad-id",
                   headers=auth_h, expect_status=400, description="Get attendance with invalid UUID should fail")
    print(f"  FindOne bad: {r.status_code if r else 'FAIL'}")

    # Update
    r, body = test("[Attendance] PUT /api/attendance/:id (update)", "PUT", f"{BASE}/api/attendance/{att_id}",
                   headers=auth_h, json_data={"overtimeHours": 2, "notes": "Updated: worked overtime"},
                   expect_status=200, description="Update attendance overtime hours and notes")
    print(f"  Update: {r.status_code if r else 'FAIL'}")

# ============================================================
# 8. SETTINGS ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Settings Endpoints")
print("=" * 60)

# Company Profile - Get
r, body = test("[Settings] GET /api/settings/company", "GET", f"{BASE}/api/settings/company",
               headers=auth_h, expect_status=200, description="Get company profile")
print(f"  Company GET: {r.status_code if r else 'FAIL'}")

# Company Profile - Update
r, body = test("[Settings] PUT /api/settings/company (update)", "PUT", f"{BASE}/api/settings/company",
               headers=auth_h,
               json_data={"companyName": "ShineCraft Industries", "address": "123 Tech Park, Bangalore",
                          "gstNumber": "29AABCS1234F1Z5", "phoneNumber": "08012345678",
                          "email": "info@shinecraft.com", "website": "https://shinecraft.com",
                          "authorizedSignatory": "Admin Director", "footerText": "Generated by ShineCraft HRMS"},
               expect_status=200, description="Update company profile with all fields")
print(f"  Company PUT: {r.status_code if r else 'FAIL'}")

# Company Profile - invalid data
r, body = test("[Settings] PUT /api/settings/company (empty name)", "PUT", f"{BASE}/api/settings/company",
               headers=auth_h, json_data={"companyName": ""},
               expect_status=400, description="Update company with empty name should fail validation")
print(f"  Company PUT empty: {r.status_code if r else 'FAIL'}")

# SMTP Config - Get
r, body = test("[Settings] GET /api/settings/smtp", "GET", f"{BASE}/api/settings/smtp",
               headers=auth_h, expect_status=200, description="Get SMTP configuration")
print(f"  SMTP GET: {r.status_code if r else 'FAIL'}")

# SMTP Config - Update
r, body = test("[Settings] PUT /api/settings/smtp (update)", "PUT", f"{BASE}/api/settings/smtp",
               headers=auth_h,
               json_data={"host": "smtp.gmail.com", "port": 587, "username": "hr@shinecraft.com",
                          "password": "test_app_password", "senderName": "ShineCraft HR",
                          "senderEmail": "hr@shinecraft.com", "encryption": "TLS"},
               expect_status=200, description="Update SMTP configuration")
print(f"  SMTP PUT: {r.status_code if r else 'FAIL'}")

# SMTP Config - invalid
r, body = test("[Settings] PUT /api/settings/smtp (invalid port)", "PUT", f"{BASE}/api/settings/smtp",
               headers=auth_h,
               json_data={"host": "", "port": -1, "username": "", "password": "",
                          "senderName": "", "senderEmail": "bad-email"},
               expect_status=400, description="Update SMTP with invalid data should fail validation")
print(f"  SMTP PUT invalid: {r.status_code if r else 'FAIL'}")

# SMTP Test Connection
r, body = test("[Settings] POST /api/settings/smtp/test", "POST", f"{BASE}/api/settings/smtp/test",
               headers=auth_h, expect_status=200, description="Test SMTP connection (may fail if no real SMTP)")
print(f"  SMTP Test: {r.status_code if r else 'FAIL'}")

# App Settings - Get all
r, body = test("[Settings] GET /api/settings/ (all)", "GET", f"{BASE}/api/settings/",
               headers=auth_h, expect_status=200, description="Get all application settings")
print(f"  App Settings GET: {r.status_code if r else 'FAIL'}")

# App Settings - Get by category
r, body = test("[Settings] GET /api/settings/ (filter category)", "GET", f"{BASE}/api/settings/",
               headers=auth_h, data={"category": "general"},
               expect_status=200, description="Get application settings filtered by category")
print(f"  App Settings category: {r.status_code if r else 'FAIL'}")

# App Settings - Update
r, body = test("[Settings] PUT /api/settings/:key (update setting)", "PUT", f"{BASE}/api/settings/company_name",
               headers=auth_h, json_data={"value": "ShineCraft Industries"},
               expect_status=200, description="Update a specific application setting by key")
print(f"  App Setting PUT: {r.status_code if r else 'FAIL'}")

# ============================================================
# 9. AUDIT ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Audit Endpoints")
print("=" * 60)

# Audit Stats
r, body = test("[Audit] GET /api/audit/stats", "GET", f"{BASE}/api/audit/stats",
               headers=auth_h, expect_status=200, description="Get audit log statistics")
print(f"  Audit Stats: {r.status_code if r else 'FAIL'}")

# Audit List
r, body = test("[Audit] GET /api/audit/ (list)", "GET", f"{BASE}/api/audit/",
               headers=auth_h, data={"page": 1, "limit": 10},
               expect_status=200, description="List audit logs with pagination")
print(f"  Audit List: {r.status_code if r else 'FAIL'}")

# Audit List - filter by action
r, body = test("[Audit] GET /api/audit/ (filter action)", "GET", f"{BASE}/api/audit/",
               headers=auth_h, data={"action": "CREATE"},
               expect_status=200, description="Filter audit logs by action type")
print(f"  Audit filter action: {r.status_code if r else 'FAIL'}")

# Audit List - filter by entity
r, body = test("[Audit] GET /api/audit/ (filter entity)", "GET", f"{BASE}/api/audit/",
               headers=auth_h, data={"entityType": "Employee"},
               expect_status=200, description="Filter audit logs by entity type")
print(f"  Audit filter entity: {r.status_code if r else 'FAIL'}")

# ============================================================
# 10. EMAIL LOG ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Email Log Endpoints")
print("=" * 60)

# Email Logs - list
r, body = test("[Email] GET /api/email-logs/ (list)", "GET", f"{BASE}/api/email-logs/",
               headers=auth_h, data={"page": 1, "limit": 10},
               expect_status=200, description="List all email logs with pagination")
print(f"  Email Logs: {r.status_code if r else 'FAIL'}")

# Email Logs - filter by status
r, body = test("[Email] GET /api/email-logs/ (filter status)", "GET", f"{BASE}/api/email-logs/",
               headers=auth_h, data={"status": "PENDING"},
               expect_status=200, description="Filter email logs by status")
print(f"  Email filter status: {r.status_code if r else 'FAIL'}")

# Mailto Link - valid
r, body = test("[Email] GET /api/email-logs/mailto-link (valid)", "GET", f"{BASE}/api/email-logs/mailto-link",
               headers=auth_h,
               data={"employeeEmail": "test@shinecraft.com", "employeeName": "Test Employee",
                     "month": 7, "year": 2026},
               expect_status=200, description="Generate mailto link with valid parameters")
print(f"  Mailto Link: {r.status_code if r else 'FAIL'}")

# Mailto Link - missing params
r, body = test("[Email] GET /api/email-logs/mailto-link (missing params)", "GET", f"{BASE}/api/email-logs/mailto-link",
               headers=auth_h, data={"employeeEmail": "test@shinecraft.com"},
               expect_status=400, description="Generate mailto link with missing params should fail")
print(f"  Mailto no params: {r.status_code if r else 'FAIL'}")

# ============================================================
# 11. JIBBLE ENDPOINTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Jibble Endpoints")
print("=" * 60)

# Test Connection
r, body = test("[Jibble] GET /api/jibble/test-connection", "GET", f"{BASE}/api/jibble/test-connection",
               headers=auth_h, expect_status=200, description="Test Jibble API connection")
print(f"  Jibble Test Conn: {r.status_code if r else 'FAIL'}")

# Live Attendance
r, body = test("[Jibble] GET /api/jibble/live", "GET", f"{BASE}/api/jibble/live",
               headers=auth_h, expect_status=200, description="Get live attendance from Jibble")
print(f"  Jibble Live: {r.status_code if r else 'FAIL'}")

# Sync History
r, body = test("[Jibble] GET /api/jibble/history", "GET", f"{BASE}/api/jibble/history",
               headers=auth_h, expect_status=200, description="Get Jibble sync history")
print(f"  Jibble History: {r.status_code if r else 'FAIL'}")

# Fetch Employees
r, body = test("[Jibble] GET /api/jibble/employees", "GET", f"{BASE}/api/jibble/employees",
               headers=auth_h, expect_status=200, description="Fetch employees from Jibble workspace")
print(f"  Jibble Employees: {r.status_code if r else 'FAIL'}")

# Sync Attendance
r, body = test("[Jibble] POST /api/jibble/sync", "POST", f"{BASE}/api/jibble/sync",
               headers=auth_h, json_data={"startDate": "2026-07-01", "endDate": "2026-07-31"},
               expect_status=200, description="Sync attendance data from Jibble")
print(f"  Jibble Sync: {r.status_code if r else 'FAIL'}")

# Map Employee (no payload = may fail)
r, body = test("[Jibble] POST /api/jibble/map-employee (empty)", "POST", f"{BASE}/api/jibble/map-employee",
               headers=auth_h, json_data={},
               expect_status=None, description="Map Jibble employee (may fail with empty body)")
print(f"  Jibble Map: {r.status_code if r else 'FAIL'}")

# Provision Employees (no payload)
r, body = test("[Jibble] POST /api/jibble/provision-employees (empty)", "POST", f"{BASE}/api/jibble/provision-employees",
               headers=auth_h, json_data={},
               expect_status=None, description="Provision employees from Jibble (may fail with empty body)")
print(f"  Jibble Provision: {r.status_code if r else 'FAIL'}")

# ============================================================
# 12. CLEANUP - DELETE TEST DATA
# ============================================================
print("\n" + "=" * 60)
print("CLEANUP: Deleting test data")
print("=" * 60)

# Delete attendance records first (foreign key constraint)
for aid in [att_id, att2_id, att3_id]:
    if aid:
        r, body = test("[Cleanup] DELETE /api/attendance/:id", "DELETE", f"{BASE}/api/attendance/{aid}",
                       headers=auth_h, expect_status=200, description="Delete test attendance record")
        print(f"  Delete att {aid[:8]}: {r.status_code if r else 'FAIL'}")

# Delete payslips
for pid in [payslip_id, payslip2_id]:
    if pid:
        r, body = test("[Cleanup] DELETE /api/payslips/:id", "DELETE", f"{BASE}/api/payslips/{pid}",
                       headers=auth_h, expect_status=200, description="Delete test payslip")
        print(f"  Delete payslip {pid[:8]}: {r.status_code if r else 'FAIL'}")

# Delete employees
for eid in [emp_id, emp2_id, imported_id]:
    if eid:
        r, body = test("[Cleanup] DELETE /api/employees/:id", "DELETE", f"{BASE}/api/employees/{eid}",
                       headers=auth_h, expect_status=200, description="Delete test employee")
        print(f"  Delete emp {eid[:8]}: {r.status_code if r else 'FAIL'}")

# Delete department (delete designation first)
if desig_id:
    r, body = test("[Cleanup] DELETE /api/settings/designations/:id", "DELETE", f"{BASE}/api/settings/designations/{desig_id}",
                   headers=auth_h, expect_status=200, description="Delete test designation")
    print(f"  Delete desig: {r.status_code if r else 'FAIL'}")

if dept_id:
    r, body = test("[Cleanup] DELETE /api/settings/departments/:id", "DELETE", f"{BASE}/api/settings/departments/{dept_id}",
                   headers=auth_h, expect_status=200, description="Delete test department")
    print(f"  Delete dept: {r.status_code if r else 'FAIL'}")

# ============================================================
# 13. CROSS-CUTTING: UNAUTHENTICATED ACCESS TESTS
# ============================================================
print("\n" + "=" * 60)
print("TESTING: Unauthenticated Access (all should return 401)")
print("=" * 60)

endpoints_to_check = [
    ("GET", "/api/employees/"),
    ("POST", "/api/employees/"),
    ("GET", "/api/payslips/"),
    ("POST", "/api/payslips/"),
    ("GET", "/api/attendance/"),
    ("POST", "/api/attendance/"),
    ("GET", "/api/upload/"),
    ("GET", "/api/settings/company"),
    ("GET", "/api/audit/"),
    ("GET", "/api/email-logs/"),
    ("GET", "/api/jibble/test-connection"),
]

for method, path in endpoints_to_check:
    r, body = test(f"[Security] {method} {path} (no auth)", method, f"{BASE}{path}",
                   expect_status=401, description=f"Unauthenticated {method} {path} should return 401")
    print(f"  {method} {path}: {r.status_code if r else 'FAIL'}")

# ============================================================
# GENERATE EXCEL REPORT
# ============================================================
print("\n" + "=" * 60)
print("GENERATING EXCEL REPORT")
print("=" * 60)

wb = Workbook()
ws = wb.active
ws.title = "API Test Results"

# Colors
green_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
red_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
header_font = Font(color="FFFFFF", bold=True, size=11)
green_font = Font(color="006100", bold=True)
red_font = Font(color="9C0006", bold=True)
border = Border(
    left=Side(style='thin'), right=Side(style='thin'),
    top=Side(style='thin'), bottom=Side(style='thin')
)

# Headers
headers = ["Test ID", "Module", "Test Name", "Description", "Method", "Endpoint",
           "HTTP Status", "Expected Status", "Result", "Response Time (ms)", "Detail/Error", "Response Summary"]

for col, header in enumerate(headers, 1):
    cell = ws.cell(row=1, column=col, value=header)
    cell.font = header_font
    cell.fill = header_fill
    cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    cell.border = border

# Data rows
for row_idx, result in enumerate(results, 2):
    for col_idx, key in enumerate(headers, 1):
        value = result.get(key, "")
        cell = ws.cell(row=row_idx, column=col_idx, value=str(value))
        cell.border = border
        cell.alignment = Alignment(vertical='center', wrap_text=True)
        
        if key == "Result":
            if value == "PASS":
                cell.fill = green_fill
                cell.font = green_font
            else:
                cell.fill = red_fill
                cell.font = red_font
            cell.alignment = Alignment(horizontal='center', vertical='center')

# Column widths
col_widths = [8, 12, 50, 50, 8, 40, 12, 14, 8, 16, 50, 60]
for i, width in enumerate(col_widths, 1):
    ws.column_dimensions[chr(64 + i) if i <= 26 else 'A' + chr(64 + i - 26)].width = width

# Freeze top row
ws.freeze_panes = 'A2'

# Auto-filter
ws.auto_filter.ref = f"A1:L{len(results) + 1}"

# Summary Sheet
ws2 = wb.create_sheet("Summary")
ws2.cell(row=1, column=1, value="ShineCraft Payslip - API Test Report").font = Font(bold=True, size=14)
ws2.cell(row=2, column=1, value=f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
ws2.cell(row=3, column=1, value=f"Base URL: {BASE}")

total = len(results)
passed = sum(1 for r in results if r["Result"] == "PASS")
failed = total - passed

ws2.cell(row=5, column=1, value="Total Tests:").font = Font(bold=True)
ws2.cell(row=5, column=2, value=total)
ws2.cell(row=6, column=1, value="Passed:").font = Font(bold=True)
ws2.cell(row=6, column=2, value=passed)
ws2.cell(row=6, column=2).fill = green_fill
ws2.cell(row=7, column=1, value="Failed:").font = Font(bold=True)
ws2.cell(row=7, column=2, value=failed)
ws2.cell(row=7, column=2).fill = red_fill if failed > 0 else green_fill
ws2.cell(row=8, column=1, value="Pass Rate:").font = Font(bold=True)
ws2.cell(row=8, column=2, value=f"{(passed/total*100):.1f}%" if total > 0 else "N/A")

# Module breakdown
ws2.cell(row=10, column=1, value="Module Breakdown:").font = Font(bold=True, size=12)
modules = {}
for r in results:
    mod = r["Module"]
    if mod not in modules:
        modules[mod] = {"pass": 0, "fail": 0}
    if r["Result"] == "PASS":
        modules[mod]["pass"] += 1
    else:
        modules[mod]["fail"] += 1

row = 11
ws2.cell(row=row, column=1, value="Module").font = Font(bold=True)
ws2.cell(row=row, column=2, value="Passed").font = Font(bold=True)
ws2.cell(row=row, column=3, value="Failed").font = Font(bold=True)
ws2.cell(row=row, column=4, value="Total").font = Font(bold=True)
ws2.cell(row=row, column=5, value="Pass Rate").font = Font(bold=True)
row += 1

for mod, counts in sorted(modules.items()):
    t = counts["pass"] + counts["fail"]
    ws2.cell(row=row, column=1, value=mod)
    ws2.cell(row=row, column=2, value=counts["pass"])
    ws2.cell(row=row, column=3, value=counts["fail"])
    ws2.cell(row=row, column=4, value=t)
    rate = f"{(counts['pass']/t*100):.1f}%" if t > 0 else "N/A"
    ws2.cell(row=row, column=5, value=rate)
    row += 1

ws2.column_dimensions['A'].width = 25
ws2.column_dimensions['B'].width = 12
ws2.column_dimensions['C'].width = 12
ws2.column_dimensions['D'].width = 12
ws2.column_dimensions['E'].width = 12

output_path = r"C:\Users\ManaGenz\Desktop\payslip-shinecraft\API_Test_Report.xlsx"
wb.save(output_path)
print(f"\nReport saved to: {output_path}")
print(f"\n{'='*60}")
print(f"SUMMARY: {passed}/{total} PASSED ({(passed/total*100):.1f}%) | {failed} FAILED")
print(f"{'='*60}")
