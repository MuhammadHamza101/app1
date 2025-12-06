# 🔧 Windows Troubleshooting Guide

## 🚨 **Common Windows Issues & Solutions**

### **Issue 1: PowerShell Execution Policy**
**Error**: "Scripts cannot be loaded because running scripts is disabled"

**Solution**:
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### **Issue 2: Node.js Not Found**
**Error**: "'node' is not recognized as an internal or external command"

**Solution**:
1. Download Node.js from https://nodejs.org
2. Install with "Add to PATH" option checked
3. Restart Command Prompt/PowerShell

### **Issue 3: Python Not Found**
**Error**: "'python' is not recognized"

**Solution**:
1. Download Python from https://python.org
2. Install with "Add Python to PATH" checked
3. Restart Command Prompt/PowerShell

### **Issue 4: Port Already in Use**
**Error**: "Port 3000 is already in use"

**Solution**:
```cmd
# Find and kill processes using ports 3000 and 3003
netstat -ano | findstr :3000
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

---

## 🛠️ **Step-by-Step Windows Setup**

### **Step 1: Check Prerequisites**
Open Command Prompt and run:
```cmd
node --version
python --version
```

If either command fails, install the missing software first.

### **Step 2: Use the Windows Launcher**
1. **Navigate to project folder**
2. **Right-click** `start-windows.bat`
3. **Select "Run as administrator"**
4. **Follow on-screen instructions**

### **Step 3: Alternative Manual Start**
If the batch file doesn't work, run these commands manually:

```cmd
# Navigate to project folder
cd C:\path\to\patentflow-enterprise

# Install dependencies
npm install

# Setup database
npm run db:push

# Start collaboration service (new terminal)
cd mini-services\collaboration-service
npm install
npm run dev

# Start web application (new terminal)
cd ..\..
npm run dev
```

---

## 🆘 **If You're Still Getting Errors**

### **Please Tell Me**:
1. **What is the exact error message?**
2. **When does it occur?** (during installation, startup, etc.)
3. **What Windows version are you using?**
4. **Are you running as administrator?**

### **Quick Fixes to Try**:
1. **Run as Administrator** (right-click batch file)
2. **Check Antivirus** (might be blocking Node.js)
3. **Install Node.js and Python** manually first
4. **Use PowerShell instead of Command Prompt**

---

## 📞 **Need More Help?**

**Please share the exact error message** and I'll provide a specific solution!

Common format for reporting errors:
```
Error: [Exact error message here]
When: [When it happens]
What I tried: [What you already tried]
```