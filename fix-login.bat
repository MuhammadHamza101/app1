@echo off
REM PatentFlow Enterprise - Login Fix
REM This script will help debug and fix login issues

echo ==========================================
echo    🔧 PatentFlow Login Fix
echo ==========================================
echo.

cd /d "%~dp0"

REM Set environment variables
set DATABASE_URL=file:./db/custom.db
set NEXTAUTH_SECRET=patentflow-enterprise-secret-key-change-in-production
set NEXTAUTH_URL=http://localhost:3000

echo 🔍 Checking database...
echo.

REM Check if database exists
if not exist "db\custom.db" (
    echo ❌ Database file not found!
    echo Creating database...
    npm run db:push
) else (
    echo ✅ Database file exists
)

echo.
echo 👥 Checking users in database...
echo.

REM Create a simple script to check users
echo const { PrismaClient } = require('@prisma/client'); > temp-check.js
echo const prisma = new PrismaClient(); >> temp-check.js
echo. >> temp-check.js
echo async function checkUsers() { >> temp-check.js
echo   try { >> temp-check.js
echo     const users = await prisma.user.findMany({ >> temp-check.js
echo       include: { firm: true } >> temp-check.js
echo     }); >> temp-check.js
echo     console.log('Users found:', users.length); >> temp-check.js
echo     users.forEach(user => { >> temp-check.js
echo       console.log('User:', { >> temp-check.js
echo         id: user.id, >> temp-check.js
echo         email: user.email, >> temp-check.js
echo         name: user.name, >> temp-check.js
echo         role: user.role, >> temp-check.js
echo         hasPassword: !!user.password, >> temp-check.js
echo         isActive: user.isActive, >> temp-check.js
echo         firm: user.firm?.name || 'No firm' >> temp-check.js
echo       }); >> temp-check.js
echo     }); >> temp-check.js
echo   } catch (error) { >> temp-check.js
echo     console.error('Database error:', error); >> temp-check.js
echo   } finally { >> temp-check.js
echo     await prisma.$disconnect(); >> temp-check.js
echo   } >> temp-check.js
echo } >> temp-check.js
echo checkUsers(); >> temp-check.js

node temp-check.js
del temp-check.js

echo.
echo 🔧 Creating fresh admin user if needed...
echo.

REM Create admin user creation script
echo const bcrypt = require('bcryptjs'); > temp-admin.js
echo const { PrismaClient } = require('@prisma/client'); >> temp-admin.js
echo const prisma = new PrismaClient(); >> temp-admin.js
echo. >> temp-admin.js
echo async function createAdmin() { >> temp-admin.js
echo   try { >> temp-admin.js
echo     // Check if admin exists >> temp-admin.js
echo     const existingAdmin = await prisma.user.findUnique({ >> temp-admin.js
echo       where: { email: 'admin@patentflow.com' } >> temp-admin.js
echo     }); >> temp-admin.js
echo. >> temp-admin.js
echo     if (existingAdmin) { >> temp-admin.js
echo       console.log('✅ Admin user already exists'); >> temp-admin.js
echo       console.log('Email:', existingAdmin.email); >> temp-admin.js
echo       console.log('Name:', existingAdmin.name); >> temp-admin.js
echo       console.log('Role:', existingAdmin.role); >> temp-admin.js
echo       console.log('Has Password:', !!existingAdmin.password); >> temp-admin.js
echo       console.log('Is Active:', existingAdmin.isActive); >> temp-admin.js
echo. >> temp-admin.js
echo       // Update password to be sure >> temp-admin.js
echo       const hashedPassword = await bcrypt.hash('admin123', 12); >> temp-admin.js
echo       await prisma.user.update({ >> temp-admin.js
echo         where: { email: 'admin@patentflow.com' }, >> temp-admin.js
echo         data: { password: hashedPassword } >> temp-admin.js
echo       }); >> temp-admin.js
echo       console.log('✅ Admin password updated to: admin123'); >> temp-admin.js
echo     } else { >> temp-admin.js
echo       // Create new admin >> temp-admin.js
echo       const hashedPassword = await bcrypt.hash('admin123', 12); >> temp-admin.js
echo       await prisma.user.create({ >> temp-admin.js
echo         data: { >> temp-admin.js
echo           email: 'admin@patentflow.com', >> temp-admin.js
echo           name: 'System Administrator', >> temp-admin.js
echo           password: hashedPassword, >> temp-admin.js
echo           role: 'ADMIN', >> temp-admin.js
echo           isActive: true >> temp-admin.js
echo         } >> temp-admin.js
echo       }); >> temp-admin.js
echo       console.log('✅ Admin user created'); >> temp-admin.js
echo       console.log('Email: admin@patentflow.com'); >> temp-admin.js
echo       console.log('Password: admin123'); >> temp-admin.js
echo     } >> temp-admin.js
echo   } catch (error) { >> temp-admin.js
echo     console.error('Error:', error); >> temp-admin.js
echo   } finally { >> temp-admin.js
echo     await prisma.$disconnect(); >> temp-admin.js
echo   } >> temp-admin.js
echo createAdmin(); >> temp-admin.js

node temp-admin.js
del temp-admin.js

echo.
echo ==========================================
echo    🎉 LOGIN FIX COMPLETE
echo ==========================================
echo.
echo 🔑 Try these credentials:
echo    Email: admin@patentflow.com
echo    Password: admin123
echo.
echo 📱 Go to: http://localhost:3000/auth/signin
echo.
echo If login still fails, restart the application:
echo    1. Close all command windows
echo    2. Double-click: ULTIMATE-FIX.bat
echo    3. Try login again
echo.
pause