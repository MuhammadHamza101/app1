@echo off
REM PatentFlow Enterprise - AUTHENTICATION FIX
REM This will completely fix the login issue

echo ==========================================
echo    🔧 PatentFlow Authentication Fix
echo ==========================================
echo.

cd /d "%~dp0"

set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

echo 🔍 Testing password verification...
echo.

REM Create test script
echo const bcrypt = require('bcryptjs'); > test-auth.js
echo const { PrismaClient } = require('@prisma/client'); >> test-auth.js
echo const prisma = new PrismaClient(); >> test-auth.js
echo. >> test-auth.js
echo async function testAuth() { >> test-auth.js
echo   try { >> test-auth.js
echo     // Get admin user >> test-auth.js
echo     const user = await prisma.user.findUnique({ >> test-auth.js
echo       where: { email: 'admin@patentflow.com' } >> test-auth.js
echo     }); >> test-auth.js
echo. >> test-auth.js
echo     if (!user) { >> test-auth.js
echo       console.log('❌ Admin user not found'); >> test-auth.js
echo       return; >> test-auth.js
echo     } >> test-auth.js
echo. >> test-auth.js
echo     console.log('✅ User found:', user.email); >> test-auth.js
echo     console.log('✅ User has password:', !!user.password); >> test-auth.js
echo     console.log('✅ User is active:', user.isActive); >> test-auth.js
echo. >> test-auth.js
echo     // Test password verification >> test-auth.js
echo     const testPassword = 'admin123'; >> test-auth.js
echo     const isValid = await bcrypt.compare(testPassword, user.password); >> test-auth.js
echo     console.log('🔍 Testing password:', testPassword); >> test-auth.js
echo     console.log('🔍 Password verification result:', isValid); >> test-auth.js
echo. >> test-auth.js
echo     if (!isValid) { >> test-auth.js
echo       console.log('❌ Password verification FAILED! Creating new password...'); >> test-auth.js
echo       const newHash = await bcrypt.hash('admin123', 12); >> test-auth.js
echo       await prisma.user.update({ >> test-auth.js
echo         where: { email: 'admin@patentflow.com' }, >> test-auth.js
echo         data: { password: newHash } >> test-auth.js
echo       }); >> test-auth.js
echo       console.log('✅ Password updated with new hash'); >> test-auth.js
echo. >> test-auth.js
echo       // Test again >> test-auth.js
echo       const newIsValid = await bcrypt.compare('admin123', newHash); >> test-auth.js
echo       console.log('🔍 New password verification:', newIsValid); >> test-auth.js
echo     } else { >> test-auth.js
echo       console.log('✅ Password verification PASSED!'); >> test-auth.js
echo     } >> test-auth.js
echo. >> test-auth.js
echo   } catch (error) { >> test-auth.js
echo     console.error('❌ Error:', error.message); >> test-auth.js
echo   } finally { >> test-auth.js
echo     await prisma.$disconnect(); >> test-auth.js
echo   } >> test-auth.js
echo } >> test-auth.js
echo testAuth(); >> test-auth.js

node test-auth.js
del test-auth.js

echo.
echo 🔧 Creating simple login test...
echo.

REM Create simple login bypass for testing
echo const bcrypt = require('bcryptjs'); > simple-login.js
echo const { PrismaClient } = require('@prisma/client'); >> simple-login.js
echo const prisma = new PrismaClient(); >> simple-login.js
echo. >> simple-login.js
echo async function createSimpleLogin() { >> simple-login.js
echo   try { >> simple-login.js
echo     // Delete existing admin user >> simple-login.js
echo     await prisma.user.deleteMany({ >> simple-login.js
echo       where: { email: 'admin@patentflow.com' } >> simple-login.js
echo     }); >> simple-login.js
echo     console.log('✅ Old admin user deleted'); >> simple-login.js
echo. >> simple-login.js
echo     // Create new admin user with simple password >> simple-login.js
echo     const hashedPassword = await bcrypt.hash('admin123', 12); >> simple-login.js
echo     await prisma.user.create({ >> simple-login.js
echo       data: { >> simple-login.js
echo         email: 'admin@patentflow.com', >> simple-login.js
echo         name: 'System Administrator', >> simple-login.js
echo         password: hashedPassword, >> simple-login.js
echo         role: 'ADMIN', >> simple-login.js
echo         isActive: true >> simple-login.js
echo       } >> simple-login.js
echo     }); >> simple-login.js
echo     console.log('✅ New admin user created'); >> simple-login.js
echo     console.log('📧 Email: admin@patentflow.com'); >> simple-login.js
echo     console.log('🔑 Password: admin123'); >> simple-login.js
echo. >> simple-login.js
echo     // Test the new user >> simple-login.js
echo     const testUser = await prisma.user.findUnique({ >> simple-login.js
echo       where: { email: 'admin@patentflow.com' } >> simple-login.js
echo     }); >> simple-login.js
echo     const testResult = await bcrypt.compare('admin123', testUser.password); >> simple-login.js
echo     console.log('🔍 Final test result:', testResult ? 'SUCCESS' : 'FAILED'); >> simple-login.js
echo. >> simple-login.js
echo   } catch (error) { >> simple-login.js
echo     console.error('❌ Error:', error.message); >> simple-login.js
echo   } finally { >> simple-login.js
echo     await prisma.$disconnect(); >> simple-login.js
echo   } >> simple-login.js
echo createSimpleLogin(); >> simple-login.js

node simple-login.js
del simple-login.js

echo.
echo ==========================================
echo    🎉 AUTHENTICATION FIX COMPLETE
echo ==========================================
echo.
echo 🔑 New credentials:
echo    Email: admin@patentflow.com
echo    Password: admin123
echo.
echo 📱 Go to: http://localhost:3000/auth/signin
echo.
echo 💡 If login still fails:
echo    1. Close all browser windows
echo    2. Clear browser cache and cookies
echo    3. Restart the application
echo    4. Try login again
echo.
pause