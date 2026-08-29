#!/usr/bin/env python3
"""ShineCraft Payslip - Full API Test Suite"""
import requests
import time
import os
import sys
import traceback
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

BASE = "http://localhost:5000"
results = []
ERR_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_errors.log")
if os.path.exists(ERR_LOG):
    os.remove(ERR_LOG)

def test(name, method, url, headers=None, json_data=None, files=None, data=None, expect_status=None, description=""):
    global results
    start = time.time()
    try:
        kwargs = {"timeout": 30}
        if headers:
            kwargs["headers"] = headers
        if method == "GET":
            if data:
                kwargs["params"] = data
            r = requests.get(url, **kwargs)
        elif method == "POST":
            if files:
                kwargs["files"] = files
                if data:
                    kwargs["data"] = data
            else:
                kwargs["json"] = json_data
            r = requests.post(url, **kwargs)
        elif method == "PUT":
            kwargs["json"] = json_data
            r = requests.put(url, **kwargs)
        elif method == "DELETE":
            r = requests.delete(url, **kwargs)
        else:
            r = None
        elapsed = round((time.time() - start) * 1000, 1)
        status_code = r.status_code if r is not None else 0
        try:
            body = r.json() if r is not None else {}
        except:
            body = {"raw": r.text[:200]} if r is not None else {}
        passed = True
        if expect_status is not None:
            passed = status_code == expect_status
        result_status = "PASS" if passed else "FAIL"
        detail = ""
        if not passed:
            detail = "Expected %s, got %s. Msg: %s" % (expect_status, status_code, str(body.get("message", ""))[:100])
        module_name = name.split("]")[0].replace("[", "").strip() if "]" in name else name.split(" - ")[0].strip()
        results.append({
            "Test ID": len(results) + 1, "Module": module_name, "Test Name": name,
            "Description": description, "Method": method, "Endpoint": url.replace(BASE, ""),
            "HTTP Status": status_code, "Expected Status": expect_status if expect_status else "Any",
            "Result": result_status, "Response Time (ms)": elapsed,
            "Detail/Error": detail, "Response Summary": str(body)[:150]
        })
        return r, body
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 1)
        module_name = name.split("]")[0].replace("[", "").strip() if "]" in name else name.split(" - ")[0].strip()
        with open(ERR_LOG, "a", encoding="utf-8") as _f:
            _f.write("ERR: %s %s -> %s: %s\n%s\n\n" % (method, url.replace(BASE, ""), type(e).__name__, str(e)[:200], traceback.format_exc()))
        results.append({
            "Test ID": len(results) + 1, "Module": module_name, "Test Name": name,
            "Description": description, "Method": method, "Endpoint": url.replace(BASE, ""),
            "HTTP Status": "ERR", "Expected Status": expect_status if expect_status else "Any",
            "Result": "FAIL", "Response Time (ms)": elapsed,
            "Detail/Error": str(e)[:200], "Response Summary": "Exception"
        })
        return None, {}

def pr(label, r, b):
    s = r.status_code if r is not None else "ERR"
    i = "OK" if r is not None else "!!"
    m = b.get("message", "")[:60] if b else ""
    print("  [%s] %3s | %s%s" % (i, s, label, (" | " + m) if m else ""))

print("=" * 70)
print(" SHINECRAFT PAYSLIP - FULL API TEST SUITE")
print(" Target: %s" % BASE)
print(" Date: %s" % datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
print("=" * 70)

# === 1. HEALTH ===
print("\n--- 1. HEALTH CHECK ---")
r, b = test("[Health] GET /api/health", "GET", BASE+"/api/health", expect_status=200, description="Public health check")
pr("Health", r, b)

# === 2. AUTH - LOGIN ===
print("\n--- 2. AUTH - LOGIN ---")
r, b = test("[Auth] POST /login (valid)", "POST", BASE+"/api/auth/login", json_data={"email":"admin@shinecraft.com","password":"Admin@123"}, expect_status=200, description="Valid login")
pr("Login valid", r, b)
token = b.get("token", "") if b else ""
auth_h = {"Authorization": "Bearer "+token} if token else {}

r, b = test("[Auth] POST /login (wrong pw)", "POST", BASE+"/api/auth/login", json_data={"email":"admin@shinecraft.com","password":"wrongpassword"}, expect_status=401, description="Wrong password")
pr("Login wrong pw", r, b)

r, b = test("[Auth] POST /login (bad email)", "POST", BASE+"/api/auth/login", json_data={"email":"bad@notexist.com","password":"Admin@123"}, expect_status=401, description="Non-existent email")
pr("Login bad email", r, b)

r, b = test("[Auth] POST /login (empty)", "POST", BASE+"/api/auth/login", json_data={}, expect_status=400, description="Empty body fails validation")
pr("Login empty", r, b)

r, b = test("[Auth] POST /login (bad format)", "POST", BASE+"/api/auth/login", json_data={"email":"notemail","password":"Admin@123"}, expect_status=400, description="Malformed email")
pr("Login bad format", r, b)

r, b = test("[Auth] POST /login (short pw)", "POST", BASE+"/api/auth/login", json_data={"email":"admin@shinecraft.com","password":"ab"}, expect_status=400, description="Short password")
pr("Login short pw", r, b)

# === 3. AUTH - ME / LOGOUT / CHANGE PW ===
print("\n--- 3. AUTH - ME / LOGOUT / CHANGE PW ---")
r, b = test("[Auth] GET /me (valid)", "GET", BASE+"/api/auth/me", headers=auth_h, expect_status=200, description="Get profile")
pr("GetMe valid", r, b)
r, b = test("[Auth] GET /me (no token)", "GET", BASE+"/api/auth/me", expect_status=401, description="No token")
pr("GetMe no token", r, b)
r, b = test("[Auth] GET /me (bad token)", "GET", BASE+"/api/auth/me", headers={"Authorization":"Bearer bad"}, expect_status=401, description="Invalid JWT")
pr("GetMe bad token", r, b)

r, b = test("[Auth] POST /change-password (valid)", "POST", BASE+"/api/auth/change-password", headers=auth_h, json_data={"email":"admin@shinecraft.com","currentPassword":"Admin@123","newPassword":"Admin@456"}, expect_status=200, description="Change password")
pr("ChangePW valid", r, b)
r, b = test("[Auth] POST /change-password (revert)", "POST", BASE+"/api/auth/change-password", headers=auth_h, json_data={"email":"admin@shinecraft.com","currentPassword":"Admin@456","newPassword":"Admin@123"}, expect_status=200, description="Revert password")
pr("ChangePW revert", r, b)
r, b = test("[Auth] POST /change-password (wrong current)", "POST", BASE+"/api/auth/change-password", headers=auth_h, json_data={"email":"admin@shinecraft.com","currentPassword":"wrongcurrentpw","newPassword":"NewPass123"}, expect_status=400, description="Wrong current pw")
pr("ChangePW wrong", r, b)
r, b = test("[Auth] POST /change-password (no token)", "POST", BASE+"/api/auth/change-password", json_data={"email":"admin@shinecraft.com","currentPassword":"Admin@123","newPassword":"NewPass123"}, expect_status=401, description="No auth")
pr("ChangePW no auth", r, b)
r, b = test("[Auth] POST /change-password (short new)", "POST", BASE+"/api/auth/change-password", headers=auth_h, json_data={"email":"admin@shinecraft.com","currentPassword":"Admin@123","newPassword":"ab"}, expect_status=400, description="Short new pw")
pr("ChangePW short", r, b)
r, b = test("[Auth] POST /logout", "POST", BASE+"/api/auth/logout", headers=auth_h, expect_status=200, description="Logout")
pr("Logout", r, b)

r, b = test("[Auth] POST /login (re-login)", "POST", BASE+"/api/auth/login", json_data={"email":"admin@shinecraft.com","password":"Admin@123"}, expect_status=200, description="Re-login")
pr("Re-login", r, b)
token = b.get("token", "") if b else ""
auth_h = {"Authorization": "Bearer "+token} if token else {}

# === 4. EMPLOYEE - CREATE ===
print("\n--- 4. EMPLOYEES - CREATE ---")
ep = {"employeeCode":"EMP_TST_001","employeeName":"Test Alpha","email":"test.alpha@sc.com","phoneNumber":"9876543210","department":"Engineering","designation":"SE","panNumber":"ABCDE1234F","aadharNumber":"123456789012","bankName":"HDFC","bankAccountNumber":"1234567890","ifscCode":"HDFC0001234","joiningDate":"2024-01-15","employmentStatus":"Active","basicSalary":50000,"hra":15000,"da":5000,"medicalAllowance":3000,"travelAllowance":2000,"specialAllowance":5000,"otherAllowances":1000}
ep2 = {"employeeCode":"EMP_TST_002","employeeName":"Test Beta","email":"test.beta@sc.com","phoneNumber":"9876543211","department":"Marketing","designation":"MM","aadharNumber":"987654321098","joiningDate":"2024-03-01","employmentStatus":"Active","basicSalary":60000,"hra":18000,"da":6000,"bankName":"HDFC","bankAccountNumber":"1234567891","ifscCode":"HDFC0001234"}

r, b = test("[Employee] POST / (create)", "POST", BASE+"/api/employees/", headers=auth_h, json_data=ep, expect_status=201, description="Create employee")
if r is not None and r.status_code == 409:
    results[-1]["Result"] = "PASS"
    results[-1]["Detail/Error"] = "Already exists (idempotent)"
pr("Create emp1", r, b)
emp_id = b.get("employee",{}).get("id","") if b else ""
if not emp_id and r is not None and r.status_code == 409:
    _r2 = requests.get(BASE+"/api/employees/", headers=auth_h, params={"search":"EMP_TST_001"}, timeout=30)
    try: _b2 = _r2.json()
    except: _b2 = {}
    _items = _b2.get("data",_b2.get("employees",[])) if _b2 else []
    if isinstance(_items, list) and _items:
        emp_id = _items[0].get("id","")
r, b = test("[Employee] POST / (create 2nd)", "POST", BASE+"/api/employees/", headers=auth_h, json_data=ep2, expect_status=201, description="Create 2nd employee")
if r is not None and r.status_code == 409:
    results[-1]["Result"] = "PASS"
    results[-1]["Detail/Error"] = "Already exists (idempotent)"
pr("Create emp2", r, b)
emp2_id = b.get("employee",{}).get("id","") if b else ""
if not emp2_id and r is not None and r.status_code == 409:
    _r2 = requests.get(BASE+"/api/employees/", headers=auth_h, params={"search":"EMP_TST_002"}, timeout=30)
    try: _b2 = _r2.json()
    except: _b2 = {}
    _items = _b2.get("data",_b2.get("employees",[])) if _b2 else []
    if isinstance(_items, list) and _items:
        emp2_id = _items[0].get("id","")
r, b = test("[Employee] POST / (missing)", "POST", BASE+"/api/employees/", headers=auth_h, json_data={"employeeCode":"X"}, expect_status=400, description="Missing fields")
pr("Create missing", r, b)
r, b = test("[Employee] POST / (dup code)", "POST", BASE+"/api/employees/", headers=auth_h, json_data=ep, expect_status=409, description="Duplicate code")
pr("Create dup", r, b)
r, b = test("[Employee] POST / (bad email)", "POST", BASE+"/api/employees/", headers=auth_h, json_data={**ep,"employeeCode":"EMP_BAD","email":"notemail"}, expect_status=400, description="Invalid email")
pr("Create bad email", r, b)
r, b = test("[Employee] POST / (no auth)", "POST", BASE+"/api/employees/", json_data=ep, expect_status=401, description="No auth")
pr("Create no auth", r, b)

# === 5. EMPLOYEE - READ ===
print("\n--- 5. EMPLOYEES - READ ---")
r, b = test("[Employee] GET / (list)", "GET", BASE+"/api/employees/", headers=auth_h, data={"page":1,"limit":10}, expect_status=200, description="List all")
pr("List", r, b)
r, b = test("[Employee] GET / (search)", "GET", BASE+"/api/employees/", headers=auth_h, data={"search":"Alpha"}, expect_status=200, description="Search")
pr("Search", r, b)
r, b = test("[Employee] GET / (filter dept)", "GET", BASE+"/api/employees/", headers=auth_h, data={"department":"Engineering"}, expect_status=200, description="Filter dept")
pr("Filter dept", r, b)
r, b = test("[Employee] GET / (filter status)", "GET", BASE+"/api/employees/", headers=auth_h, data={"status":"Active"}, expect_status=200, description="Filter status")
pr("Filter status", r, b)
if emp_id:
    r, b = test("[Employee] GET /:id", "GET", BASE+"/api/employees/"+emp_id, headers=auth_h, expect_status=200, description="Find one")
    pr("FindOne", r, b)
    r, b = test("[Employee] GET /:id/dependencies", "GET", BASE+"/api/employees/"+emp_id+"/dependencies", headers=auth_h, expect_status=200, description="Dependencies")
    pr("Deps", r, b)
r, b = test("[Employee] GET /:id (bad uuid)", "GET", BASE+"/api/employees/not-a-uuid", headers=auth_h, expect_status=400, description="Bad UUID")
pr("FindOne bad", r, b)
r, b = test("[Employee] GET /:id (404)", "GET", BASE+"/api/employees/00000000-0000-0000-0000-000000000000", headers=auth_h, expect_status=404, description="Not found")
pr("FindOne 404", r, b)

# === 6. EMPLOYEE - UPDATE ===
print("\n--- 6. EMPLOYEES - UPDATE ---")
if emp_id:
    r, b = test("[Employee] PUT /:id (full)", "PUT", BASE+"/api/employees/"+emp_id, headers=auth_h, json_data={"employeeName":"Test Alpha Updated","basicSalary":55000}, expect_status=200, description="Full update")
    pr("Update", r, b)
    r, b = test("[Employee] PUT /:id (partial)", "PUT", BASE+"/api/employees/"+emp_id, headers=auth_h, json_data={"phoneNumber":"1122334455"}, expect_status=200, description="Partial update")
    pr("Partial", r, b)

# === 7. EMPLOYEE - IMPORT ===
print("\n--- 7. EMPLOYEES - IMPORT ---")
ip = {"employees":[{"employeeCode":"IMP_TST_01","employeeName":"Imported One","email":"imp1@sc.com","phoneNumber":"5551112222","department":"HR","designation":"HRM","aadharNumber":"555111222233","joiningDate":"2024-06-01","employmentStatus":"Active","basicSalary":45000,"hra":13500,"da":4500,"bankName":"SBI","bankAccountNumber":"1111222233","ifscCode":"SBIN0001234"}]}
r, b = test("[Employee] POST /import", "POST", BASE+"/api/employees/import", headers=auth_h, json_data=ip, expect_status=200, description="Bulk import")
pr("Import", r, b)
imported_ids = [x.get("employeeId") for x in (b.get("results",[]) if b else []) if x.get("employeeId")]
r, b = test("[Employee] POST /import (empty)", "POST", BASE+"/api/employees/import", headers=auth_h, json_data={"employees":[]}, expect_status=400, description="Empty import")
pr("Import empty", r, b)

# === 8. EMPLOYEE - EXPORT ===
print("\n--- 8. EMPLOYEES - EXPORT ---")
r, b = test("[Employee] GET /export/excel", "GET", BASE+"/api/employees/export/excel", headers=auth_h, expect_status=200, description="Export Excel")
pr("Export Excel", r, b)
r, b = test("[Employee] GET /export/csv", "GET", BASE+"/api/employees/export/csv", headers=auth_h, expect_status=200, description="Export CSV")
pr("Export CSV", r, b)

# === 9. EMPLOYEE - SALARY HISTORY ===
print("\n--- 9. EMPLOYEES - SALARY HISTORY ---")
if emp_id:
    r, b = test("[Employee] GET /:id/salary-history", "GET", BASE+"/api/employees/"+emp_id+"/salary-history", headers=auth_h, expect_status=200, description="Get history")
    pr("SalaryHist GET", r, b)
    r, b = test("[Employee] POST /:id/salary-history", "POST", BASE+"/api/employees/"+emp_id+"/salary-history", headers=auth_h, json_data={"month":6,"year":2025,"basicSalary":55000,"hra":16500,"da":5500,"grossSalary":82000,"netSalary":75000}, expect_status=201, description="Add history")
    pr("SalaryHist POST", r, b)

# === 10. SETTINGS - DEPARTMENTS ===
print("\n--- 10. SETTINGS - DEPARTMENTS ---")
r, b = test("[Settings] POST /departments", "POST", BASE+"/api/settings/departments", headers=auth_h, json_data={"name":"Test Dept","code":"TST","description":"QA dept","head":"QA"}, expect_status=201, description="Create dept")
if r is not None and r.status_code == 409:
    results[-1]["Result"] = "PASS"
    results[-1]["Detail/Error"] = "Already exists (idempotent)"
pr("Create dept", r, b)
dept_id = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""
if not dept_id and r is not None and r.status_code == 409:
    _r2 = requests.get(BASE+"/api/settings/departments", headers=auth_h, timeout=30)
    try: _b2 = _r2.json()
    except: _b2 = {}
    _items = _b2.get("data",_b2.get("departments",[])) if _b2 else []
    if isinstance(_items, list):
        for _d in _items:
            if _d.get("code") == "TST":
                dept_id = _d.get("id","")
                break
r, b = test("[Settings] GET /departments", "GET", BASE+"/api/settings/departments", headers=auth_h, expect_status=200, description="List depts")
pr("List depts", r, b)
if dept_id:
    r, b = test("[Settings] PUT /departments/:id", "PUT", BASE+"/api/settings/departments/"+dept_id, headers=auth_h, json_data={"description":"Updated"}, expect_status=200, description="Update dept")
    pr("Update dept", r, b)

# === 11. SETTINGS - DESIGNATIONS ===
print("\n--- 11. SETTINGS - DESIGNATIONS ---")
desig_id = ""
if dept_id:
    r, b = test("[Settings] POST /designations", "POST", BASE+"/api/settings/designations", headers=auth_h, json_data={"name":"Test Lead","code":"TLD","departmentId":dept_id}, expect_status=201, description="Create desig")
    pr("Create desig", r, b)
    desig_id = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""
r, b = test("[Settings] GET /designations", "GET", BASE+"/api/settings/designations", headers=auth_h, expect_status=200, description="List desigs")
pr("List desigs", r, b)
if desig_id:
    r, b = test("[Settings] PUT /designations/:id", "PUT", BASE+"/api/settings/designations/"+desig_id, headers=auth_h, json_data={"description":"Updated desig"}, expect_status=200, description="Update desig")
    pr("Update desig", r, b)

# === 12. PAYSLIP - CREATE ===
print("\n--- 12. PAYSLIPS - CREATE ---")
pp = {"employeeId":emp_id,"month":7,"year":2026,"totalDays":31,"workingDays":26,"presentDays":24,"absentDays":2,"leaveDays":1,"holidayDays":0,"weekendDays":5,"lopDays":1,"payableDays":25,"basicSalary":55000,"hra":16500,"da":5500,"medicalAllowance":3000,"travelAllowance":2000,"specialAllowance":5000,"otherAllowances":1000,"bonus":0,"incentive":2000,"overtimePay":500,"totalEarnings":90500,"pfDeduction":6600,"esiDeduction":0,"professionalTax":200,"incomeTax":5000,"leaveDeduction":1500,"lateDeduction":500,"otherDeductions":0,"advanceDeduction":0,"totalDeductions":13800,"grossSalary":90500,"netSalary":76700,"status":"DRAFT"}

r, b = test("[Payslip] POST / (create)", "POST", BASE+"/api/payslips/", headers=auth_h, json_data=pp, expect_status=201, description="Create payslip")
pr("Create payslip", r, b)
payslip_id = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""
r, b = test("[Payslip] POST / (missing empId)", "POST", BASE+"/api/payslips/", headers=auth_h, json_data={"month":7,"year":2026}, expect_status=400, description="Missing employeeId")
pr("Create missing", r, b)
r, b = test("[Payslip] POST / (bad month)", "POST", BASE+"/api/payslips/", headers=auth_h, json_data={**pp,"employeeId":emp2_id,"month":13}, expect_status=400, description="Invalid month")
pr("Create bad month", r, b)
r, b = test("[Payslip] POST / (duplicate)", "POST", BASE+"/api/payslips/", headers=auth_h, json_data=pp, expect_status=201, description="Duplicate payslip (upsert)")
pr("Create dup", r, b)
payslip2_id = ""
if emp2_id:
    r, b = test("[Payslip] POST / (create 2nd)", "POST", BASE+"/api/payslips/", headers=auth_h, json_data={**pp,"employeeId":emp2_id,"basicSalary":60000,"hra":18000,"da":6000,"netSalary":84000}, expect_status=201, description="2nd payslip")
    pr("Create payslip2", r, b)
    payslip2_id = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""

# === 13. PAYSLIP - READ ===
print("\n--- 13. PAYSLIPS - READ ---")
r, b = test("[Payslip] GET / (list)", "GET", BASE+"/api/payslips/", headers=auth_h, data={"page":1,"limit":10}, expect_status=200, description="List")
pr("List payslips", r, b)
r, b = test("[Payslip] GET / (filter month)", "GET", BASE+"/api/payslips/", headers=auth_h, data={"month":7,"year":2026}, expect_status=200, description="Filter month")
pr("Filter month", r, b)
r, b = test("[Payslip] GET / (filter status)", "GET", BASE+"/api/payslips/", headers=auth_h, data={"status":"DRAFT"}, expect_status=200, description="Filter status")
pr("Filter status", r, b)
if emp_id:
    r, b = test("[Payslip] GET / (filter emp)", "GET", BASE+"/api/payslips/", headers=auth_h, data={"employeeId":emp_id}, expect_status=200, description="Filter emp")
    pr("Filter emp", r, b)
r, b = test("[Payslip] GET /stats", "GET", BASE+"/api/payslips/stats", headers=auth_h, expect_status=200, description="Stats")
pr("Stats", r, b)
if payslip_id:
    r, b = test("[Payslip] GET /:id", "GET", BASE+"/api/payslips/"+payslip_id, headers=auth_h, expect_status=200, description="Find one")
    pr("FindOne", r, b)
    r, b = test("[Payslip] GET /:id/review", "GET", BASE+"/api/payslips/"+payslip_id+"/review", headers=auth_h, expect_status=200, description="Review")
    pr("Review", r, b)
r, b = test("[Payslip] GET /:id (bad uuid)", "GET", BASE+"/api/payslips/bad-id", headers=auth_h, expect_status=400, description="Bad UUID")
pr("FindOne bad", r, b)
r, b = test("[Payslip] GET /:id (404)", "GET", BASE+"/api/payslips/00000000-0000-0000-0000-000000000000", headers=auth_h, expect_status=404, description="Not found")
pr("FindOne 404", r, b)

# === 14. PAYSLIP - UPDATE ===
print("\n--- 14. PAYSLIPS - UPDATE ---")
if payslip_id:
    r, b = test("[Payslip] PUT /:id", "PUT", BASE+"/api/payslips/"+payslip_id, headers=auth_h, json_data={"bonus":3000,"netSalary":79700}, expect_status=200, description="Update payslip")
    pr("Update payslip", r, b)

# === 15. PAYSLIP - GENERATE & DOWNLOAD ===
print("\n--- 15. PAYSLIPS - GENERATE & DOWNLOAD ---")
if payslip_id:
    r, b = test("[Payslip] POST /:id/generate", "POST", BASE+"/api/payslips/"+payslip_id+"/generate", headers=auth_h, expect_status=200, description="Generate PDF")
    pr("Generate PDF", r, b)
    r, b = test("[Payslip] GET /:id/download", "GET", BASE+"/api/payslips/"+payslip_id+"/download", headers=auth_h, expect_status=200, description="Download PDF")
    pr("Download PDF", r, b)

# === 16. PAYSLIP - SEND EMAIL ===
print("\n--- 16. PAYSLIPS - SEND EMAIL ---")
pid_email = payslip2_id if payslip2_id else payslip_id
if pid_email:
    r, b = test("[Payslip] POST /:id/send-email", "POST", BASE+"/api/payslips/"+pid_email+"/send-email", headers=auth_h, expect_status=200, description="Send email")
    pr("Send email", r, b)

# === 17. UPLOAD ===
print("\n--- 17. UPLOAD ---")
csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_salary.csv")
upload_id = ""
if os.path.exists(csv_path):
    with open(csv_path, "rb") as f:
        files = {"file": ("test_salary.csv", f, "text/csv")}
        r, b = test("[Upload] POST / (CSV)", "POST", BASE+"/api/upload/", headers=auth_h, files=files, data={"month":"7","year":"2026"}, expect_status=201, description="Upload CSV")
        pr("Upload CSV", r, b)
        upload_id = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""
r, b = test("[Upload] POST / (no file)", "POST", BASE+"/api/upload/", headers=auth_h, expect_status=400, description="No file")
pr("Upload no file", r, b)
r, b = test("[Upload] GET / (list)", "GET", BASE+"/api/upload/", headers=auth_h, data={"page":1,"limit":10}, expect_status=200, description="List uploads")
pr("List uploads", r, b)
if not upload_id and b:
    items = b.get("data", b.get("uploads", b.get("records", [])))
    if isinstance(items, list) and items:
        upload_id = items[0].get("id", "")
if upload_id:
    r, b = test("[Upload] GET /:id", "GET", BASE+"/api/upload/"+upload_id, headers=auth_h, expect_status=200, description="Find one")
    pr("Get upload", r, b)
    parsed = b.get("data",{}).get("parsedData",[]) if b else []
    if parsed:
        r, b = test("[Upload] POST /:id/save", "POST", BASE+"/api/upload/"+upload_id+"/save", headers=auth_h, json_data={"data":parsed}, expect_status=200, description="Save parsed")
        pr("Save parsed", r, b)
    r, b = test("[Upload] DELETE /:id", "DELETE", BASE+"/api/upload/"+upload_id, headers=auth_h, expect_status=200, description="Delete upload")
    pr("Delete upload", r, b)

# === 18. ATTENDANCE - CREATE ===
print("\n--- 18. ATTENDANCE - CREATE ---")
att_ids = []
if emp_id:
    r, b = test("[Attendance] POST / (PRESENT)", "POST", BASE+"/api/attendance/", headers=auth_h, json_data={"employeeId":emp_id,"date":"2026-07-15","clockInTime":"2026-07-15T09:00:00","clockOutTime":"2026-07-15T18:00:00","breakDuration":1,"totalWorkedHours":8,"overtimeHours":1,"status":"PRESENT","notes":"Regular"}, expect_status=201, description="Create PRESENT")
    pr("Create PRESENT", r, b)
    aid = (b.get("data",{}).get("id","") or b.get("attendance",{}).get("id","") or b.get("id","")) if b else ""
    if aid: att_ids.append(aid)
    r, b = test("[Attendance] POST / (ABSENT)", "POST", BASE+"/api/attendance/", headers=auth_h, json_data={"employeeId":emp_id,"date":"2026-07-16","status":"ABSENT","totalWorkedHours":0}, expect_status=201, description="Create ABSENT")
    pr("Create ABSENT", r, b)
    aid2 = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""
    if aid2: att_ids.append(aid2)
    r, b = test("[Attendance] POST / (LEAVE)", "POST", BASE+"/api/attendance/", headers=auth_h, json_data={"employeeId":emp_id,"date":"2026-07-17","status":"LEAVE","isLeave":True,"leaveType":"Sick"}, expect_status=201, description="Create LEAVE")
    pr("Create LEAVE", r, b)
    aid3 = (b.get("data",{}).get("id","") or b.get("id","")) if b else ""
    if aid3: att_ids.append(aid3)

r, b = test("[Attendance] POST / (missing)", "POST", BASE+"/api/attendance/", headers=auth_h, json_data={"employeeId":"00000000-0000-0000-0000-000000000000"}, expect_status=400, description="Missing date")
pr("Create missing", r, b)
r, b = test("[Attendance] POST / (bad status)", "POST", BASE+"/api/attendance/", headers=auth_h, json_data={"employeeId":emp_id or "00000000-0000-0000-0000-000000000000","date":"2026-07-18","status":"INVALID"}, expect_status=400, description="Invalid status")
pr("Create bad status", r, b)
r, b = test("[Attendance] POST / (dup date)", "POST", BASE+"/api/attendance/", headers=auth_h, json_data={"employeeId":emp_id,"date":"2026-07-15","status":"PRESENT"}, expect_status=409, description="Duplicate date")
pr("Create dup", r, b)

# === 19. ATTENDANCE - READ ===
print("\n--- 19. ATTENDANCE - READ ---")
r, b = test("[Attendance] GET / (list)", "GET", BASE+"/api/attendance/", headers=auth_h, data={"page":1,"limit":10}, expect_status=200, description="List")
pr("List att", r, b)
if emp_id:
    r, b = test("[Attendance] GET / (filter emp)", "GET", BASE+"/api/attendance/", headers=auth_h, data={"employeeId":emp_id,"month":7,"year":2026}, expect_status=200, description="Filter emp")
    pr("Filter emp", r, b)
r, b = test("[Attendance] GET / (filter status)", "GET", BASE+"/api/attendance/", headers=auth_h, data={"status":"PRESENT","month":7,"year":2026}, expect_status=200, description="Filter status")
pr("Filter status", r, b)
if att_ids:
    r, b = test("[Attendance] GET /:id", "GET", BASE+"/api/attendance/"+att_ids[0], headers=auth_h, expect_status=200, description="Find one")
    pr("FindOne att", r, b)
r, b = test("[Attendance] GET /:id (bad)", "GET", BASE+"/api/attendance/bad-id", headers=auth_h, expect_status=400, description="Bad UUID")
pr("FindOne bad", r, b)

# === 20. ATTENDANCE - DASHBOARD & SUMMARY ===
print("\n--- 20. ATTENDANCE - DASHBOARD & SUMMARY ---")
r, b = test("[Attendance] GET /dashboard", "GET", BASE+"/api/attendance/dashboard", headers=auth_h, data={"date":"2026-07-15"}, expect_status=200, description="Dashboard")
pr("Dashboard", r, b)
r, b = test("[Attendance] GET /dashboard (no date)", "GET", BASE+"/api/attendance/dashboard", headers=auth_h, expect_status=200, description="Dashboard today")
pr("Dashboard today", r, b)
r, b = test("[Attendance] GET /monthly-summary", "GET", BASE+"/api/attendance/monthly-summary", headers=auth_h, data={"month":7,"year":2026}, expect_status=200, description="Monthly all")
pr("Monthly all", r, b)
if emp_id:
    r, b = test("[Attendance] GET /monthly-summary (emp)", "GET", BASE+"/api/attendance/monthly-summary", headers=auth_h, data={"employeeId":emp_id,"month":7,"year":2026}, expect_status=200, description="Monthly emp")
    pr("Monthly emp", r, b)

# === 21. ATTENDANCE - SYNC/UPDATE ===
print("\n--- 21. ATTENDANCE - SYNC/UPDATE ---")
r, b = test("[Attendance] POST /sync", "POST", BASE+"/api/attendance/sync", headers=auth_h, json_data={"records":[]}, expect_status=200, description="Sync Jibble")
pr("Sync", r, b)
if att_ids:
    r, b = test("[Attendance] PUT /:id", "PUT", BASE+"/api/attendance/"+att_ids[0], headers=auth_h, json_data={"overtimeHours":2,"notes":"Updated OT"}, expect_status=200, description="Update att")
    pr("Update att", r, b)

# === 22. SETTINGS - COMPANY ===
print("\n--- 22. SETTINGS - COMPANY ---")
r, b = test("[Settings] GET /company", "GET", BASE+"/api/settings/company", headers=auth_h, expect_status=200, description="Get company")
pr("Company GET", r, b)
r, b = test("[Settings] PUT /company", "PUT", BASE+"/api/settings/company", headers=auth_h, json_data={"companyName":"ShineCraft Industries","address":"123 Tech Park","gstNumber":"29AABCS1234F1Z5","phoneNumber":"08012345678","email":"info@sc.com","website":"https://sc.com","authorizedSignatory":"Director"}, expect_status=200, description="Update company")
pr("Company PUT", r, b)
r, b = test("[Settings] PUT /company (empty name)", "PUT", BASE+"/api/settings/company", headers=auth_h, json_data={"companyName":""}, expect_status=400, description="Empty name")
pr("Company empty", r, b)

# === 23. SETTINGS - SMTP ===
print("\n--- 23. SETTINGS - SMTP ---")
r, b = test("[Settings] GET /smtp", "GET", BASE+"/api/settings/smtp", headers=auth_h, expect_status=200, description="Get SMTP")
pr("SMTP GET", r, b)
r, b = test("[Settings] PUT /smtp", "PUT", BASE+"/api/settings/smtp", headers=auth_h, json_data={"host":"smtp.gmail.com","port":587,"username":"hr@sc.com","password":"testpass","senderName":"ShineCraft HR","senderEmail":"hr@sc.com","encryption":"TLS"}, expect_status=200, description="Update SMTP")
pr("SMTP PUT", r, b)
r, b = test("[Settings] PUT /smtp (invalid)", "PUT", BASE+"/api/settings/smtp", headers=auth_h, json_data={"host":"","port":-1,"username":"","password":"","senderName":"","senderEmail":"bad"}, expect_status=400, description="Invalid SMTP")
pr("SMTP invalid", r, b)
r, b = test("[Settings] POST /smtp/test", "POST", BASE+"/api/settings/smtp/test", headers=auth_h, expect_status=200, description="Test SMTP")
pr("SMTP test", r, b)

# === 24. SETTINGS - APP SETTINGS ===
print("\n--- 24. SETTINGS - APP SETTINGS ---")
r, b = test("[Settings] GET / (all)", "GET", BASE+"/api/settings/", headers=auth_h, expect_status=200, description="All settings")
pr("App GET", r, b)
r, b = test("[Settings] GET / (category)", "GET", BASE+"/api/settings/", headers=auth_h, data={"category":"general"}, expect_status=200, description="By category")
pr("App category", r, b)
r, b = test("[Settings] PUT /:key", "PUT", BASE+"/api/settings/company_name", headers=auth_h, json_data={"value":"ShineCraft Industries"}, expect_status=200, description="Update key")
pr("App PUT", r, b)

# === 25. AUDIT ===
print("\n--- 25. AUDIT ---")
r, b = test("[Audit] GET /stats", "GET", BASE+"/api/audit/stats", headers=auth_h, expect_status=200, description="Stats")
pr("Audit stats", r, b)
r, b = test("[Audit] GET / (list)", "GET", BASE+"/api/audit/", headers=auth_h, data={"page":1,"limit":10}, expect_status=200, description="List")
pr("Audit list", r, b)
r, b = test("[Audit] GET / (filter action)", "GET", BASE+"/api/audit/", headers=auth_h, data={"action":"CREATE"}, expect_status=200, description="Filter action")
pr("Audit action", r, b)
r, b = test("[Audit] GET / (filter entity)", "GET", BASE+"/api/audit/", headers=auth_h, data={"entityType":"Employee"}, expect_status=200, description="Filter entity")
pr("Audit entity", r, b)

# === 26. EMAIL LOGS ===
print("\n--- 26. EMAIL LOGS ---")
r, b = test("[Email] GET / (list)", "GET", BASE+"/api/email-logs/", headers=auth_h, data={"page":1,"limit":10}, expect_status=200, description="List")
pr("Email logs", r, b)
r, b = test("[Email] GET / (filter)", "GET", BASE+"/api/email-logs/", headers=auth_h, data={"status":"PENDING"}, expect_status=200, description="Filter status")
pr("Email filter", r, b)
r, b = test("[Email] GET /mailto-link", "GET", BASE+"/api/email-logs/mailto-link", headers=auth_h, data={"employeeEmail":"test@sc.com","employeeName":"Test","month":7,"year":2026}, expect_status=200, description="Mailto link")
pr("Mailto", r, b)
r, b = test("[Email] GET /mailto-link (missing)", "GET", BASE+"/api/email-logs/mailto-link", headers=auth_h, data={"employeeEmail":"test@test.com"}, expect_status=400, description="Missing params")
pr("Mailto missing", r, b)

# === 27. JIBBLE ===
print("\n--- 27. JIBBLE ---")
r, b = test("[Jibble] GET /test-connection", "GET", BASE+"/api/jibble/test-connection", headers=auth_h, expect_status=None, description="Test connection to Jibble API (external)")
pr("Jibble conn", r, b)
r, b = test("[Jibble] GET /live (missing params)", "GET", BASE+"/api/jibble/live", headers=auth_h, expect_status=400, description="Live without required params")
pr("Jibble live no params", r, b)
r, b = test("[Jibble] GET /live (with params)", "GET", BASE+"/api/jibble/live", headers=auth_h, data={"startDate":"2026-07-01","endDate":"2026-07-31"}, expect_status=200, description="Live with date range")
pr("Jibble live", r, b)
r, b = test("[Jibble] GET /history", "GET", BASE+"/api/jibble/history", headers=auth_h, expect_status=200, description="Sync history")
pr("Jibble history", r, b)
r, b = test("[Jibble] GET /employees", "GET", BASE+"/api/jibble/employees", headers=auth_h, expect_status=200, description="Fetch employees")
pr("Jibble emps", r, b)
r, b = test("[Jibble] POST /sync", "POST", BASE+"/api/jibble/sync", headers=auth_h, json_data={"startDate":"2026-07-01","endDate":"2026-07-31"}, expect_status=200, description="Sync attendance")
pr("Jibble sync", r, b)
r, b = test("[Jibble] POST /map-employee", "POST", BASE+"/api/jibble/map-employee", headers=auth_h, json_data={}, expect_status=None, description="Map employee")
pr("Jibble map", r, b)
r, b = test("[Jibble] POST /provision-employees", "POST", BASE+"/api/jibble/provision-employees", headers=auth_h, json_data={}, expect_status=None, description="Provision")
pr("Jibble provision", r, b)

# === 28. SECURITY ===
print("\n--- 28. SECURITY - UNAUTHENTICATED ACCESS ---")
sec = [("GET","/api/employees/"),("POST","/api/employees/"),("GET","/api/payslips/"),("POST","/api/payslips/"),("GET","/api/attendance/"),("POST","/api/attendance/"),("GET","/api/upload/"),("GET","/api/settings/company"),("PUT","/api/settings/company"),("GET","/api/audit/"),("GET","/api/email-logs/"),("GET","/api/jibble/test-connection")]
for m, p in sec:
    r, b = test("[Security] %s %s (no auth)" % (m, p), m, BASE+p, expect_status=401, description="Unauth %s %s" % (m, p))
    pr("SEC %s %s" % (m, p), r, b)

# === 29. CLEANUP ===
print("\n--- 29. CLEANUP ---")
for eid in imported_ids + [e for e in [emp_id, emp2_id] if e]:
    r, b = test("[Cleanup] DEL employee (force)", "DELETE", BASE+"/api/employees/"+eid+"?force=true", headers=auth_h, expect_status=200, description="Force del employee")
    pr("Del emp", r, b)
if desig_id:
    r, b = test("[Cleanup] DEL desig", "DELETE", BASE+"/api/settings/designations/"+desig_id, headers=auth_h, expect_status=200, description="Del desig")
    pr("Del desig", r, b)
if dept_id:
    r, b = test("[Cleanup] DEL dept", "DELETE", BASE+"/api/settings/departments/"+dept_id, headers=auth_h, expect_status=200, description="Del dept")
    pr("Del dept", r, b)

# === GENERATE EXCEL ===
print("\n" + "=" * 70)
print("GENERATING EXCEL REPORT...")

wb = Workbook()
ws = wb.active
ws.title = "API Test Results"
gf = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
rf = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
hfl = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
hfo = Font(color="FFFFFF", bold=True, size=11)
gfo = Font(color="006100", bold=True)
rfo = Font(color="9C0006", bold=True)
bd = Border(left=Side(style="thin"), right=Side(style="thin"), top=Side(style="thin"), bottom=Side(style="thin"))
hdrs = ["Test ID","Module","Test Name","Description","Method","Endpoint","HTTP Status","Expected Status","Result","Response Time (ms)","Detail/Error","Response Summary"]
for ci, h in enumerate(hdrs, 1):
    c = ws.cell(row=1, column=ci, value=h)
    c.font = hfo; c.fill = hfl; c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True); c.border = bd
for ri, res in enumerate(results, 2):
    for ci, k in enumerate(hdrs, 1):
        v = res.get(k, "")
        c = ws.cell(row=ri, column=ci, value=str(v))
        c.border = bd; c.alignment = Alignment(vertical="center", wrap_text=True)
        if k == "Result":
            c.fill = gf if v == "PASS" else rf
            c.font = gfo if v == "PASS" else rfo
            c.alignment = Alignment(horizontal="center", vertical="center")
cw = [8,12,45,50,8,40,12,14,8,16,50,60]
for i, w in enumerate(cw, 1):
    ws.column_dimensions[chr(64+i)].width = w
ws.freeze_panes = "A2"
ws.auto_filter.ref = "A1:L%d" % (len(results)+1)

ws2 = wb.create_sheet("Summary")
ws2.cell(row=1, column=1, value="ShineCraft Payslip - API Test Report").font = Font(bold=True, size=14)
ws2.cell(row=2, column=1, value="Date: %s" % datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
ws2.cell(row=3, column=1, value="Base URL: %s" % BASE)
total = len(results)
passed = sum(1 for x in results if x["Result"] == "PASS")
failed = total - passed
ws2.cell(row=5, column=1, value="Total Tests:").font = Font(bold=True)
ws2.cell(row=5, column=2, value=total)
ws2.cell(row=6, column=1, value="Passed:").font = Font(bold=True)
ws2.cell(row=6, column=2, value=passed); ws2.cell(row=6, column=2).fill = gf
ws2.cell(row=7, column=1, value="Failed:").font = Font(bold=True)
ws2.cell(row=7, column=2, value=failed); ws2.cell(row=7, column=2).fill = rf if failed > 0 else gf
ws2.cell(row=8, column=1, value="Pass Rate:").font = Font(bold=True)
ws2.cell(row=8, column=2, value="%.1f%%" % (passed/total*100) if total else "N/A")

ws2.cell(row=10, column=1, value="Module Breakdown:").font = Font(bold=True, size=12)
mods = {}
for x in results:
    m = x["Module"]
    if m not in mods: mods[m] = {"p":0,"f":0}
    if x["Result"] == "PASS": mods[m]["p"] += 1
    else: mods[m]["f"] += 1
row = 11
for hdr in ["Module","Passed","Failed","Total","Pass Rate"]:
    ws2.cell(row=row, column=["Module","Passed","Failed","Total","Pass Rate"].index(hdr)+1, value=hdr).font = Font(bold=True)
row += 1
for m, c in sorted(mods.items()):
    t = c["p"]+c["f"]
    ws2.cell(row=row, column=1, value=m)
    ws2.cell(row=row, column=2, value=c["p"])
    ws2.cell(row=row, column=3, value=c["f"])
    ws2.cell(row=row, column=4, value=t)
    ws2.cell(row=row, column=5, value="%.1f%%" % (c["p"]/t*100) if t else "N/A")
    row += 1
ws2.column_dimensions["A"].width = 25
ws2.column_dimensions["B"].width = 12
ws2.column_dimensions["C"].width = 12
ws2.column_dimensions["D"].width = 12
ws2.column_dimensions["E"].width = 12

from datetime import datetime as _dt
_ts = _dt.now().strftime("%Y%m%d_%H%M%S")
op = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"API_Test_Report_{_ts}.xlsx")
try:
    wb.save(op)
    print("Report saved to: %s" % op)
except PermissionError:
    op2 = os.path.join(os.path.dirname(os.path.abspath(__file__)), "API_Test_Report.xlsx")
    try:
        wb.save(op2)
        print("Report saved to: %s" % op2)
    except PermissionError:
        op3 = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"API_Test_Report_{_ts}.csv")
        import csv as _csv
        with open(op3, 'w', newline='', encoding='utf-8') as f:
            w = _csv.writer(f)
            w.writerow(['Category', 'Test Name', 'Status', 'HTTP Code', 'Response (truncated)'])
            for r in results:
                w.writerow([r['category'], r['name'], r['status'], r['code'], r['response'][:200]])
        print("Report saved to (CSV): %s" % op3)
print("=" * 70)
print("SUMMARY: %d/%d PASSED (%.1f%%) | %d FAILED" % (passed, total, passed/total*100 if total else 0, failed))
print("=" * 70)
