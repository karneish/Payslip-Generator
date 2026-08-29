import requests, traceback, time, sys

BASE = "http://localhost:5000"

def test_diagnose(name, method, url, headers=None, json_data=None, files=None, data=None, expect_status=None):
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
        elapsed = round((time.time() - start) * 1000, 1)
        print("  [%dms] %s %s -> %d" % (elapsed, method, url.replace(BASE, ""), r.status_code))
        return r
    except Exception as e:
        elapsed = round((time.time() - start) * 1000, 1)
        print("  [%dms] %s %s -> EXCEPTION: %s" % (elapsed, method, url.replace(BASE, ""), e))
        traceback.print_exc()
        return None

print("=== DIAGNOSTIC TEST ===")

# Get token
r = test_diagnose("Login", "POST", BASE+"/api/auth/login", json_data={"email":"admin@shinecraft.com","password":"Admin@123"})
token = r.json().get("token", "") if r else ""
auth_h = {"Authorization": "Bearer " + token}

print("\n--- Testing negative auth cases ---")
test_diagnose("Wrong pw", "POST", BASE+"/api/auth/login", json_data={"email":"admin@shinecraft.com","password":"wrong"})
test_diagnose("Bad email", "POST", BASE+"/api/auth/login", json_data={"email":"bad@bad.com","password":"Admin@123"})
test_diagnose("Empty", "POST", BASE+"/api/auth/login", json_data={})
test_diagnose("No token", "GET", BASE+"/api/auth/me")
test_diagnose("Bad token", "GET", BASE+"/api/auth/me", headers={"Authorization": "Bearer bad"})

print("\n--- Testing security (no auth) ---")
test_diagnose("Emp list no auth", "GET", BASE+"/api/employees/")
test_diagnose("Payslip list no auth", "GET", BASE+"/api/payslips/")
test_diagnose("Att list no auth", "GET", BASE+"/api/attendance/")
test_diagnose("Settings no auth", "GET", BASE+"/api/settings/company")

print("\n--- Testing 404 cases ---")
test_diagnose("Emp 404", "GET", BASE+"/api/employees/00000000-0000-0000-0000-000000000000", headers=auth_h)
test_diagnose("Payslip 404", "GET", BASE+"/api/payslips/00000000-0000-0000-0000-000000000000", headers=auth_h)

print("\nDone.")
